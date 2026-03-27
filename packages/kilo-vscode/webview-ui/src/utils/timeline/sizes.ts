/**
 * Timeline bar size calculation.
 * Computes width (from timing) and height (from content length) for each bar,
 * matching the legacy extension's constants and algorithm exactly.
 */

import type { Message, Part } from "../../types/messages"
import { classify, cssColor, partLabel, type TimelineColor } from "./colors"

/** Same constants as legacy calculateTaskTimelineSizes.ts */
export const MAX_HEIGHT = 26
const AVG_TIMING = 3000
const MIN_WIDTH = 8
const MAX_WIDTH = 32
const MIN_HEIGHT = 8
const TOP_PAD = 4

export interface BarData {
  id: string
  messageID: string
  color: TimelineColor
  css: string
  width: number
  height: number
  label: string
}

interface RawBar {
  id: string
  messageID: string
  color: TimelineColor
  label: string
  content: number
  timing: number | null
}

/** Compute all timeline bars from messages and their parts. */
export function compute(messages: Message[], parts: (id: string) => Part[]): BarData[] {
  const raw: RawBar[] = []

  for (let mi = 0; mi < messages.length; mi++) {
    const msg = messages[mi]!
    const msgParts = parts(msg.id)
    const next: Message | undefined = messages[mi + 1]
    const timing = msgTiming(msg, next)
    let added = false

    for (const p of msgParts) {
      const color = classify(p, msg.role)
      if (!color) continue

      raw.push({
        id: p.id,
        messageID: msg.id,
        color,
        label: partLabel(p),
        content: partContent(p),
        timing,
      })
      added = true
    }

    // User messages may have no parts — their text is in message.content.
    // Create a synthetic bar so they appear in the timeline.
    if (!added && msg.content) {
      raw.push({
        id: `msg-${msg.id}`,
        messageID: msg.id,
        color: msg.role === "user" ? "user" : "assistant",
        label: msg.role === "user" ? "User" : "Assistant",
        content: Math.max(1, msg.content.length),
        timing,
      })
    }
  }

  if (raw.length === 0) return []

  const maxContent = Math.max(...raw.map((d) => d.content))
  const valid = raw.map((d) => d.timing).filter((t): t is number => t !== null)
  const maxTiming = valid.length > 0 ? Math.max(...valid) : AVG_TIMING

  return raw.map((d, i) => {
    const cRatio = Math.min(1, d.content / Math.max(1, maxContent))
    const eff = i === raw.length - 1 ? MIN_WIDTH : (d.timing ?? AVG_TIMING)
    const tRatio = Math.min(1, eff / Math.max(1, maxTiming))

    return {
      id: d.id,
      messageID: d.messageID,
      color: d.color,
      css: cssColor(d.color),
      width: Math.round(MIN_WIDTH + tRatio * (MAX_WIDTH - MIN_WIDTH)),
      height: Math.round(MIN_HEIGHT + cRatio * (MAX_HEIGHT - MIN_HEIGHT - TOP_PAD)),
      label: d.label,
    }
  })
}

function partContent(p: Part): number {
  switch (p.type) {
    case "text":
    case "reasoning":
      return Math.max(1, p.text.length)
    case "tool":
      return Math.max(1, JSON.stringify(p.state.input).length)
    default:
      return 1
  }
}

function msgTiming(current: Message, next: Message | undefined): number | null {
  if (!next) return null
  const a = current.time?.created
  const b = next.time?.created
  if (!a || !b) return null
  return Math.max(0, b - a)
}
