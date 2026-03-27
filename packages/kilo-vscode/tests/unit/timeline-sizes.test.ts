import { describe, it, expect } from "bun:test"
import { compute, MAX_HEIGHT } from "../../webview-ui/src/utils/timeline/sizes"
import type { Message, Part } from "../../webview-ui/src/types/messages"

const MIN_WIDTH = 8
const MAX_WIDTH = 32
const MIN_HEIGHT_BAR = 8
const TOP_PAD = 4

function msg(id: string, role: "user" | "assistant", opts: Partial<Message> = {}): Message {
  return { id, sessionID: "s1", role, createdAt: new Date().toISOString(), ...opts }
}

function parts(map: Record<string, Part[]>): (id: string) => Part[] {
  return (id) => map[id] ?? []
}

describe("compute", () => {
  it("returns empty array for empty messages", () => {
    expect(compute([], parts({}))).toEqual([])
  })

  it("returns empty when messages have no parts and no content", () => {
    const msgs = [msg("m1", "user")]
    expect(compute(msgs, parts({}))).toEqual([])
  })

  it("creates a synthetic bar for user messages with content but no parts", () => {
    const msgs = [msg("m1", "user", { content: "hello world" })]
    const bars = compute(msgs, parts({}))
    expect(bars).toHaveLength(1)
    expect(bars[0].id).toBe("msg-m1")
    expect(bars[0].color).toBe("user")
    expect(bars[0].label).toBe("User")
    expect(bars[0].messageID).toBe("m1")
  })

  it("creates a synthetic bar for assistant messages with content but no parts", () => {
    const msgs = [msg("m1", "assistant", { content: "Hi!" })]
    const bars = compute(msgs, parts({}))
    expect(bars).toHaveLength(1)
    expect(bars[0].color).toBe("assistant")
    expect(bars[0].label).toBe("Assistant")
  })

  it("creates bars from real parts and skips step-start/step-finish", () => {
    const msgs = [msg("m1", "assistant")]
    const p = parts({
      m1: [
        { type: "step-start", id: "ss1" },
        { type: "text", id: "t1", text: "hello" },
        { type: "tool", id: "tl1", tool: "read", state: { status: "completed", input: {}, output: "ok", title: "" } },
        { type: "step-finish", id: "sf1" },
      ],
    })
    const bars = compute(msgs, p)
    expect(bars).toHaveLength(2) // text + tool, step-start/finish skipped
    expect(bars[0].color).toBe("assistant")
    expect(bars[1].color).toBe("read")
  })

  it("prefers real parts over synthetic bar", () => {
    const msgs = [msg("m1", "user", { content: "hello" })]
    const p = parts({
      m1: [{ type: "text", id: "t1", text: "hello world" }],
    })
    const bars = compute(msgs, p)
    expect(bars).toHaveLength(1)
    expect(bars[0].id).toBe("t1") // real part id, not synthetic
  })

  it("gives the last bar MIN_WIDTH", () => {
    const msgs = [
      msg("m1", "user", { content: "hi", time: { created: 1000 } }),
      msg("m2", "assistant", { content: "hello there, this is a response", time: { created: 5000 } }),
    ]
    const bars = compute(msgs, parts({}))
    expect(bars).toHaveLength(2)
    expect(bars[bars.length - 1].width).toBe(MIN_WIDTH)
  })

  it("calculates widths within bounds", () => {
    const msgs = [
      msg("m1", "user", { content: "a", time: { created: 0 } }),
      msg("m2", "assistant", { content: "b", time: { created: 1000 } }),
      msg("m3", "user", { content: "c", time: { created: 10000 } }),
    ]
    const bars = compute(msgs, parts({}))
    for (const bar of bars) {
      expect(bar.width).toBeGreaterThanOrEqual(MIN_WIDTH)
      expect(bar.width).toBeLessThanOrEqual(MAX_WIDTH)
    }
  })

  it("calculates heights within bounds", () => {
    const msgs = [msg("m1", "user", { content: "a" }), msg("m2", "assistant", { content: "b".repeat(5000) })]
    const bars = compute(msgs, parts({}))
    for (const bar of bars) {
      expect(bar.height).toBeGreaterThanOrEqual(MIN_HEIGHT_BAR)
      expect(bar.height).toBeLessThanOrEqual(MAX_HEIGHT - TOP_PAD)
    }
  })

  it("assigns CSS color strings from the palette", () => {
    const msgs = [msg("m1", "user", { content: "hi" })]
    const bars = compute(msgs, parts({}))
    expect(bars[0].css).toContain("color-mix")
  })

  it("handles multiple messages with mixed parts", () => {
    const msgs = [
      msg("m1", "user", { content: "do stuff", time: { created: 0 } }),
      msg("m2", "assistant", { time: { created: 2000 } }),
      msg("m3", "user", { content: "more", time: { created: 8000 } }),
    ]
    const p = parts({
      m2: [
        { type: "text", id: "t1", text: "ok" },
        { type: "tool", id: "tl1", tool: "edit", state: { status: "running", input: { path: "/f" } } },
        { type: "tool", id: "tl2", tool: "bash", state: { status: "running", input: { command: "ls" } } },
      ],
    })
    const bars = compute(msgs, p)
    // m1: 1 synthetic (user content), m2: 3 real parts, m3: 1 synthetic
    expect(bars).toHaveLength(5)
    expect(bars[0].color).toBe("user")
    expect(bars[1].color).toBe("assistant")
    expect(bars[2].color).toBe("write")
    expect(bars[3].color).toBe("tool")
    expect(bars[4].color).toBe("user")
  })

  it("uses timing between messages for width", () => {
    const msgs = [
      msg("m1", "user", { content: "a", time: { created: 0 } }),
      msg("m2", "assistant", { content: "b", time: { created: 100 } }), // fast
      msg("m3", "user", { content: "c", time: { created: 10000 } }), // slow
    ]
    const bars = compute(msgs, parts({}))
    // m1 has small timing (100ms), m2 has large timing (9900ms), m3 is last (MIN_WIDTH)
    expect(bars[0].width).toBeLessThan(bars[1].width)
    expect(bars[2].width).toBe(MIN_WIDTH)
  })

  it("uses content length for height", () => {
    const msgs = [
      msg("m1", "user", { content: "a" }), // tiny
      msg("m2", "assistant", { content: "x".repeat(10000) }), // huge
    ]
    const bars = compute(msgs, parts({}))
    expect(bars[0].height).toBeLessThan(bars[1].height)
    expect(bars[1].height).toBe(MAX_HEIGHT - TOP_PAD) // max ratio → max height
  })

  it("handles null timing gracefully (no time data)", () => {
    const msgs = [msg("m1", "user", { content: "a" }), msg("m2", "assistant", { content: "b" })]
    // No time fields → all timings null → fallback to AVG_TIMING
    const bars = compute(msgs, parts({}))
    expect(bars).toHaveLength(2)
    expect(bars[0].width).toBeGreaterThanOrEqual(MIN_WIDTH)
  })
})

describe("MAX_HEIGHT constant", () => {
  it("matches the legacy value of 26", () => {
    expect(MAX_HEIGHT).toBe(26)
  })
})
