import { $ } from "bun"
import path from "path"
import fs from "fs/promises"
import { Filesystem } from "../util/filesystem"
import { Log } from "../util/log"
import { Flag } from "../flag/flag"
import { Global } from "../global"
import z from "zod"
import { Config } from "../config/config"
import { Instance } from "../project/instance"
import { Scheduler } from "../scheduler"

export namespace Snapshot {
  const log = Log.create({ service: "snapshot" })
  const hour = 60 * 60 * 1000
  const prune = "7.days"
  export const MAX_DIFF_SIZE = 256 * 1024 // kilocode_change

  export function init() {
    Scheduler.register({
      id: "snapshot.cleanup",
      interval: hour,
      run: cleanup,
      scope: "instance",
    })
  }

  export async function cleanup() {
    if (Instance.project.vcs !== "git" || Flag.KILO_CLIENT === "acp") return
    const cfg = await Config.get()
    if (cfg.snapshot === false) return
    const git = gitdir()
    const exists = await fs
      .stat(git)
      .then(() => true)
      .catch(() => false)
    if (!exists) return
    const result =
      await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} gc --prune=${prune}`
        .quiet()
        .cwd(Instance.directory)
        .nothrow()
    if (result.exitCode !== 0) {
      log.warn("cleanup failed", {
        exitCode: result.exitCode,
        stderr: result.stderr.toString(),
        stdout: result.stdout.toString(),
      })
      return
    }
    log.info("cleanup", { prune })
  }

  export async function track() {
    if (Instance.project.vcs !== "git" || Flag.KILO_CLIENT === "acp") return
    const cfg = await Config.get()
    if (cfg.snapshot === false) return
    const git = gitdir()
    // kilocode_change start
    await ensureGit(git)
    await syncAlternates(git)
    // kilocode_change end
    await add(git)
    const hash = await $`git --git-dir ${git} --work-tree ${Instance.worktree} write-tree`
      .quiet()
      .cwd(Instance.directory)
      .nothrow()
      .text()
    log.info("tracking", { hash, cwd: Instance.directory, git })
    return hash.trim()
  }

  export const Patch = z.object({
    hash: z.string(),
    files: z.string().array(),
  })
  export type Patch = z.infer<typeof Patch>

  export async function patch(hash: string): Promise<Patch> {
    const git = await gitFor() // kilocode_change
    await add(git)
    const result =
      await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true -c core.quotepath=false --git-dir ${git} --work-tree ${Instance.worktree} diff --no-ext-diff --name-only ${hash} -- .`
        .quiet()
        .cwd(Instance.directory)
        .nothrow()

    // If git diff fails, return empty patch
    if (result.exitCode !== 0) {
      log.warn("failed to get diff", { hash, exitCode: result.exitCode })
      return { hash, files: [] }
    }

    const files = result.text()
    return {
      hash,
      files: files
        .trim()
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => path.join(Instance.worktree, x).replaceAll("\\", "/")),
    }
  }

  export async function restore(snapshot: string) {
    log.info("restore", { commit: snapshot })
    const git = await gitFor() // kilocode_change
    const result =
      await $`git -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} read-tree ${snapshot} && git -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} checkout-index -a -f`
        .quiet()
        .cwd(Instance.worktree)
        .nothrow()

    if (result.exitCode !== 0) {
      log.error("failed to restore snapshot", {
        snapshot,
        exitCode: result.exitCode,
        stderr: result.stderr.toString(),
        stdout: result.stdout.toString(),
      })
    }
  }

  export async function revert(patches: Patch[]) {
    const files = new Set<string>()
    for (const item of patches) {
      const git = await gitFor() // kilocode_change
      for (const file of item.files) {
        if (files.has(file)) continue
        log.info("reverting", { file, hash: item.hash })
        const result =
          await $`git -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} checkout ${item.hash} -- ${file}`
            .quiet()
            .cwd(Instance.worktree)
            .nothrow()
        if (result.exitCode !== 0) {
          const relativePath = path.relative(Instance.worktree, file)
          const checkTree =
            await $`git -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} ls-tree ${item.hash} -- ${relativePath}`
              .quiet()
              .cwd(Instance.worktree)
              .nothrow()
          if (checkTree.exitCode === 0 && checkTree.text().trim()) {
            log.info("file existed in snapshot but checkout failed, keeping", {
              file,
            })
          } else {
            log.info("file did not exist in snapshot, deleting", { file })
            await fs.unlink(file).catch(() => {})
          }
        }
        files.add(file)
      }
    }
  }

  export async function diff(hash: string) {
    const git = await gitFor() // kilocode_change
    await add(git)
    const result =
      await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true -c core.quotepath=false --git-dir ${git} --work-tree ${Instance.worktree} diff --no-ext-diff ${hash} -- .`
        .quiet()
        .cwd(Instance.worktree)
        .nothrow()

    if (result.exitCode !== 0) {
      log.warn("failed to get diff", {
        hash,
        exitCode: result.exitCode,
        stderr: result.stderr.toString(),
        stdout: result.stdout.toString(),
      })
      return ""
    }

    return result.text().trim()
  }

  export const FileDiff = z
    .object({
      file: z.string(),
      before: z.string(),
      after: z.string(),
      additions: z.number(),
      deletions: z.number(),
      status: z.enum(["added", "deleted", "modified"]).optional(),
    })
    .meta({
      ref: "FileDiff",
    })
  export type FileDiff = z.infer<typeof FileDiff>
  export async function diffFull(from: string, to: string): Promise<FileDiff[]> {
    const git = await gitFor() // kilocode_change
    const result: FileDiff[] = []
    const status = new Map<string, "added" | "deleted" | "modified">()

    const statuses =
      await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true -c core.quotepath=false --git-dir ${git} --work-tree ${Instance.worktree} diff --no-ext-diff --name-status --no-renames ${from} ${to} -- .`
        .quiet()
        .cwd(Instance.directory)
        .nothrow()
        .text()

    for (const line of statuses.trim().split("\n")) {
      if (!line) continue
      const [code, file] = line.split("\t")
      if (!code || !file) continue
      const kind = code.startsWith("A") ? "added" : code.startsWith("D") ? "deleted" : "modified"
      status.set(file, kind)
    }

    for await (const line of $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true -c core.quotepath=false --git-dir ${git} --work-tree ${Instance.worktree} diff --no-ext-diff --no-renames --numstat ${from} ${to} -- .`
      .quiet()
      .cwd(Instance.directory)
      .nothrow()
      .lines()) {
      if (!line) continue
      const [additions, deletions, file] = line.split("\t")
      const isBinaryFile = additions === "-" && deletions === "-"
      // kilocode_change start
      const oversized =
        !isBinaryFile &&
        ((parseInt(await $`git --git-dir ${git} cat-file -s ${from}:${file}`.quiet().nothrow().text()) || 0) >
          MAX_DIFF_SIZE ||
          (parseInt(await $`git --git-dir ${git} cat-file -s ${to}:${file}`.quiet().nothrow().text()) || 0) >
            MAX_DIFF_SIZE)
      const skip = isBinaryFile || oversized
      // kilocode_change end
      const before = skip
        ? ""
        : await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} show ${from}:${file}`
            .quiet()
            .nothrow()
            .text()
      const after = skip
        ? ""
        : await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} show ${to}:${file}`
            .quiet()
            .nothrow()
            .text()
      const added = isBinaryFile ? 0 : parseInt(additions)
      const deleted = isBinaryFile ? 0 : parseInt(deletions)
      result.push({
        file,
        before,
        after,
        additions: Number.isFinite(added) ? added : 0,
        deletions: Number.isFinite(deleted) ? deleted : 0,
        status: status.get(file) ?? "modified",
      })
    }
    return result
  }

  // kilocode_change start
  function gitdir() {
    const project = Instance.project
    const workhash = Bun.hash(Instance.worktree).toString(36)
    return path.join(Global.Path.data, "snapshot", project.id, workhash)
  }

  function legacygitdir() {
    const project = Instance.project
    return path.join(Global.Path.data, "snapshot", project.id)
  }

  async function ensureGit(git: string) {
    if (!(await fs.mkdir(git, { recursive: true }))) return
    await $`git init`
      .env({
        ...process.env,
        GIT_DIR: git,
        GIT_WORK_TREE: Instance.worktree,
      })
      .quiet()
      .nothrow()
    await $`git --git-dir ${git} config core.autocrlf false`.quiet().nothrow()
    await $`git --git-dir ${git} config core.longpaths true`.quiet().nothrow()
    await $`git --git-dir ${git} config core.symlinks true`.quiet().nothrow()
    await $`git --git-dir ${git} config core.fsmonitor false`.quiet().nothrow()
    log.info("initialized")
  }
  // kilocode_change end

  async function add(git: string) {
    await syncExclude(git)
    await $`git -c core.autocrlf=false -c core.longpaths=true -c core.symlinks=true --git-dir ${git} --work-tree ${Instance.worktree} add .`
      .quiet()
      .cwd(Instance.directory)
      .nothrow()
  }

  async function syncExclude(git: string) {
    const file = await excludes()
    const target = path.join(git, "info", "exclude")
    await fs.mkdir(path.join(git, "info"), { recursive: true })
    if (!file) {
      await Filesystem.write(target, "")
      return
    }
    const text = await Filesystem.readText(file).catch(() => "")

    await Filesystem.write(target, text)
  }

  // kilocode_change start
  async function syncAlternates(git: string) {
    const legacy = legacygitdir()
    if (legacy === git) return
    const objects = path.join(legacy, "objects")
    const exists = await fs
      .stat(objects)
      .then(() => true)
      .catch(() => false)
    const target = path.join(git, "objects", "info", "alternates")
    await fs.mkdir(path.join(git, "objects", "info"), { recursive: true })
    await Filesystem.write(target, exists ? objects + "\n" : "")
  }

  async function gitFor() {
    const git = gitdir()
    await ensureGit(git)
    await syncAlternates(git)
    return git
  }
  // kilocode_change end

  async function excludes() {
    const file = await $`git rev-parse --path-format=absolute --git-path info/exclude`
      .quiet()
      .cwd(Instance.worktree)
      .nothrow()
      .text()
    if (!file.trim()) return
    const exists = await fs
      .stat(file.trim())
      .then(() => true)
      .catch(() => false)
    if (!exists) return
    return file.trim()
  }
}
