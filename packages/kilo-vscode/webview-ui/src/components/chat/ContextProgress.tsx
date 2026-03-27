/**
 * ContextProgress — three-segment context window progress bar.
 * Matches the legacy ContextWindowProgress.tsx appearance exactly.
 * Segments: used (darkest) | reserved for output (medium) | available (transparent).
 */

import { Component, Show, createMemo } from "solid-js"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
interface Props {
  tokens: number
  limit: number
  reserved?: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export const ContextProgress: Component<Props> = (props) => {
  const dist = createMemo(() => {
    const limit = Math.max(1, props.limit)
    const used = Math.max(0, props.tokens)
    const reserved = Math.min(props.reserved ?? 0, limit - used)
    const available = Math.max(0, limit - used - reserved)

    return {
      current: Math.min(100, (used / limit) * 100),
      reserved: Math.min(100, (reserved / limit) * 100),
      available: Math.min(100, (available / limit) * 100),
      usedN: used,
      reservedN: reserved,
      availableN: available,
      limit,
    }
  })

  const warning = createMemo(() => dist().current >= 50)

  const tip = createMemo(() => {
    const d = dist()
    const parts = [`${fmt(d.usedN)} of ${fmt(d.limit)} tokens used`]
    if (d.reservedN > 0) parts.push(`${fmt(d.reservedN)} reserved for response`)
    if (d.availableN > 0) parts.push(`${fmt(d.availableN)} available`)
    return parts.join("\n")
  })

  return (
    <div data-component="context-progress">
      <span data-slot="context-progress-label">{fmt(props.tokens)}</span>
      <Tooltip value={tip()} placement="top">
        <div data-slot="context-progress-track">
          <div
            data-slot="context-progress-used"
            data-warning={warning() ? "" : undefined}
            style={{ width: `${dist().current}%` }}
          />
          <Show when={dist().reserved > 0}>
            <div data-slot="context-progress-reserved" style={{ width: `${dist().reserved}%` }} />
          </Show>
        </div>
      </Tooltip>
      <span data-slot="context-progress-label">{fmt(props.limit)}</span>
    </div>
  )
}
