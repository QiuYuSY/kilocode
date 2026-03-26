import { describe, expect, test } from "bun:test"

describe("commit-message git context", () => {
  test("git-context uses shared git() wrapper that inherits windowsHide from Process.spawn", async () => {
    // Process.spawn (src/util/process.ts:59) always sets windowsHide: true.
    // The shared git() helper (src/util/git.ts) delegates to Process.run → Process.spawn,
    // so every git call inherits windowsHide automatically.
    // Verify the source of truth hasn't drifted.
    const src = await Bun.file(new URL("../../src/util/process.ts", import.meta.url).pathname).text()
    expect(src).toContain("windowsHide: true")

    // Verify git-context imports the shared wrapper rather than spawning directly.
    const ctx = await Bun.file(new URL("../../src/commit-message/git-context.ts", import.meta.url).pathname).text()
    expect(ctx).toContain('import { git } from "@/util/git"')
    expect(ctx).not.toContain("Bun.spawnSync")
    expect(ctx).not.toContain("child_process")
  })
})
