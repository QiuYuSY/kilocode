import { describe, it, expect } from "bun:test"
import { classify, cssColor, partLabel } from "../../webview-ui/src/utils/timeline/colors"
import type { Part } from "../../webview-ui/src/types/messages"

describe("classify", () => {
  it("classifies user text parts as 'user'", () => {
    const part: Part = { type: "text", id: "p1", text: "hello" }
    expect(classify(part, "user")).toBe("user")
  })

  it("classifies assistant text parts as 'assistant'", () => {
    const part: Part = { type: "text", id: "p1", text: "hello" }
    expect(classify(part, "assistant")).toBe("assistant")
  })

  it("classifies reasoning parts as 'assistant'", () => {
    const part: Part = { type: "reasoning", id: "p1", text: "thinking..." }
    expect(classify(part, "assistant")).toBe("assistant")
  })

  it("classifies read/glob/grep tools as 'read'", () => {
    for (const tool of ["read", "glob", "grep"]) {
      const part: Part = { type: "tool", id: "p1", tool, state: { status: "running", input: {} } }
      expect(classify(part, "assistant")).toBe("read")
    }
  })

  it("classifies edit/write tools as 'write'", () => {
    for (const tool of ["edit", "write"]) {
      const part: Part = { type: "tool", id: "p1", tool, state: { status: "running", input: {} } }
      expect(classify(part, "assistant")).toBe("write")
    }
  })

  it("classifies bash/webfetch/task/todowrite tools as 'tool'", () => {
    for (const tool of ["bash", "webfetch", "task", "todowrite"]) {
      const part: Part = { type: "tool", id: "p1", tool, state: { status: "running", input: {} } }
      expect(classify(part, "assistant")).toBe("tool")
    }
  })

  it("classifies errored tool parts as 'error'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "read", state: { status: "error", input: {}, error: "fail" } }
    expect(classify(part, "assistant")).toBe("error")
  })

  it("returns null for step-start parts", () => {
    const part: Part = { type: "step-start", id: "p1" }
    expect(classify(part, "assistant")).toBeNull()
  })

  it("returns null for step-finish parts", () => {
    const part: Part = { type: "step-finish", id: "p1" }
    expect(classify(part, "assistant")).toBeNull()
  })

  it("returns null for file parts", () => {
    const part: Part = { type: "file", id: "p1", mime: "image/png", url: "data:..." }
    expect(classify(part, "assistant")).toBeNull()
  })

  it("is case-insensitive for tool names", () => {
    const part: Part = { type: "tool", id: "p1", tool: "Read", state: { status: "running", input: {} } }
    expect(classify(part, "assistant")).toBe("read")
  })
})

describe("cssColor", () => {
  it("returns a string for every color type", () => {
    const colors = ["user", "read", "write", "tool", "success", "error", "assistant", "question", "default"] as const
    for (const color of colors) {
      const css = cssColor(color)
      expect(typeof css).toBe("string")
      expect(css.length).toBeGreaterThan(0)
    }
  })

  it("returns VS Code CSS variable references", () => {
    expect(cssColor("read")).toContain("--vscode-")
    expect(cssColor("error")).toContain("--vscode-")
  })

  it("returns color-mix for composite colors", () => {
    expect(cssColor("user")).toContain("color-mix")
    expect(cssColor("question")).toContain("color-mix")
  })
})

describe("partLabel", () => {
  it("labels text parts as 'Text'", () => {
    const part: Part = { type: "text", id: "p1", text: "hi" }
    expect(partLabel(part)).toBe("Text")
  })

  it("labels reasoning parts as 'Thinking'", () => {
    const part: Part = { type: "reasoning", id: "p1", text: "hmm" }
    expect(partLabel(part)).toBe("Thinking")
  })

  it("labels read tools as 'File Read'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "read", state: { status: "running", input: {} } }
    expect(partLabel(part)).toBe("File Read")
  })

  it("labels edit tools as 'File Write'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "edit", state: { status: "running", input: {} } }
    expect(partLabel(part)).toBe("File Write")
  })

  it("labels bash tool as 'Command'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "bash", state: { status: "running", input: {} } }
    expect(partLabel(part)).toBe("Command")
  })

  it("labels task tool as 'Sub-agent'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "task", state: { status: "running", input: {} } }
    expect(partLabel(part)).toBe("Sub-agent")
  })

  it("labels unknown tools with 'Tool: name'", () => {
    const part: Part = { type: "tool", id: "p1", tool: "custom", state: { status: "running", input: {} } }
    expect(partLabel(part)).toBe("Tool: custom")
  })

  it("labels step-start as 'Action'", () => {
    const part: Part = { type: "step-start", id: "p1" }
    expect(partLabel(part)).toBe("Action")
  })
})
