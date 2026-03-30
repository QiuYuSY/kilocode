// kilocode_change - new file
import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import { SystemPrompt } from "../../src/session/system"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util/log"

Log.init({ print: false })

describe("system prompt filetree", () => {
  test(
    "environment includes filetree in directories section for git repos",
    async () => {
      await using tmp = await tmpdir({
        git: true,
        init: async (dir) => {
          await Bun.write(path.join(dir, "src", "index.ts"), "export {}")
          await Bun.write(path.join(dir, "lib", "util.ts"), "export {}")
        },
      })

      const model = {
        id: "test",
        providerID: "test",
        api: { id: "claude-test", url: "", npm: "" },
        prompt: "anthropic" as const,
      } as any

      const result = await Instance.provide({
        directory: tmp.path,
        fn: () => SystemPrompt.environment(model),
      })

      const text = result.join("\n")
      expect(text).toContain("<directories>")
      expect(text).toContain("src")
      expect(text).toContain("lib")
    },
    { timeout: 30000 },
  )

  test(
    "environment excludes .kilo and .opencode from filetree",
    async () => {
      await using tmp = await tmpdir({
        git: true,
        init: async (dir) => {
          await Bun.write(path.join(dir, "src", "index.ts"), "export {}")
          await fs.mkdir(path.join(dir, ".kilo"), { recursive: true })
          await Bun.write(path.join(dir, ".kilo", "config.json"), "{}")
          await fs.mkdir(path.join(dir, ".opencode"), { recursive: true })
          await Bun.write(path.join(dir, ".opencode", "state.json"), "{}")
        },
      })

      const model = {
        id: "test",
        providerID: "test",
        api: { id: "claude-test", url: "", npm: "" },
        prompt: "anthropic" as const,
      } as any

      const result = await Instance.provide({
        directory: tmp.path,
        fn: () => SystemPrompt.environment(model),
      })

      const text = result.join("\n")
      const dirs = text.slice(text.indexOf("<directories>"), text.indexOf("</directories>"))
      expect(dirs).toContain("src")
      expect(dirs).not.toContain(".kilo")
      expect(dirs).not.toContain(".opencode")
    },
    { timeout: 30000 },
  )
})
