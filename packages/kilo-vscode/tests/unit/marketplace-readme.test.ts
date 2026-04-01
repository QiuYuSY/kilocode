import { describe, it, expect } from "bun:test"
import path from "node:path"

const FILE = path.join(import.meta.dir, "../../README.md")

async function readme() {
  return Bun.file(FILE).text()
}

function images(src: string) {
  const html = [...src.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1])
  const md = [...src.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1])
  return [...html, ...md]
}

describe("marketplace README", () => {
  it("avoids embedded images that stress marketplace rendering", async () => {
    const src = await readme()
    expect(images(src)).toEqual([])
  })

  it("avoids HTML tables in marketplace content", async () => {
    const src = await readme()
    expect(src).not.toMatch(/<table\b/i)
  })

  it("keeps core install and onboarding links", async () => {
    const src = await readme()
    expect(src).toContain("https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code")
    expect(src).toContain("https://youtu.be/pqGfYXgrhig")
    expect(src).toContain("https://kilo.ai")
  })
})
