/**
 * TaskTimeline — horizontal strip of colored bars representing session activity.
 * Each bar is a message part; color = type, width = timing, height = content length.
 * Port of the legacy extension's TaskTimeline + TaskTimelineMessage.
 */

import { Component, For, createSignal, createEffect, onCleanup } from "solid-js"
import { MAX_HEIGHT, type BarData } from "../../utils/timeline/sizes"

const SCROLLBAR_HIDE = 25
const TAP_THRESHOLD = 5 // px — movement under this counts as a click, not a drag

interface Props {
  bars: BarData[]
  active: boolean
  onBarClick?: (messageID: string) => void
  onHover?: (hovering: boolean) => void
}

export const TaskTimeline: Component<Props> = (props) => {
  let inner: HTMLDivElement | undefined
  const [prev, setPrev] = createSignal(0)

  // Drag-scroll state
  let dragging = false
  let moved = false
  let startX = 0
  let startScroll = 0

  function onPointerDown(e: PointerEvent) {
    if (!inner) return
    dragging = true
    moved = false
    startX = e.clientX
    startScroll = inner.scrollLeft
    inner.setPointerCapture(e.pointerId)
    inner.style.cursor = "grabbing"
    inner.style.userSelect = "none"
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !inner) return
    const dx = e.clientX - startX
    if (Math.abs(dx) > TAP_THRESHOLD) moved = true
    inner.scrollLeft = startScroll - dx
  }

  function onPointerUp(e: PointerEvent) {
    if (!inner) return
    dragging = false
    inner.releasePointerCapture(e.pointerId)
    inner.style.cursor = "grab"
    inner.style.userSelect = "auto"
  }

  function onWheel(e: WheelEvent) {
    if (!inner) return
    e.preventDefault()
    inner.scrollLeft += e.deltaY || e.deltaX
  }

  function onBarClick(messageID: string) {
    // Only fire click if we didn't drag
    if (!moved) props.onBarClick?.(messageID)
  }

  // Auto-scroll to end when new bars appear
  createEffect(() => {
    const len = props.bars.length
    const old = prev()
    if (len > old && inner) {
      const behavior = old === 0 ? "instant" : "smooth"
      inner.scrollTo({ left: inner.scrollWidth, behavior: behavior as ScrollBehavior })
    }
    setPrev(len)
  })

  // Reset hover when timeline is removed from DOM (e.g. collapse)
  onCleanup(() => props.onHover?.(false))

  return (
    <div
      data-component="task-timeline"
      onMouseEnter={() => props.onHover?.(true)}
      onMouseLeave={() => props.onHover?.(false)}
    >
      <div
        ref={inner}
        data-slot="task-timeline-scroller"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <For each={props.bars}>
          {(bar, idx) => {
            const active = () => props.active && idx() === props.bars.length - 1
            const pct = () => `${(bar.height / MAX_HEIGHT) * 100}%`
            return (
              <div
                data-slot="timeline-bar"
                title={`${bar.label} #${idx() + 1}`}
                style={{ width: `${bar.width}px`, height: `${MAX_HEIGHT}px` }}
                onClick={() => onBarClick(bar.messageID)}
              >
                <div
                  data-slot="timeline-bar-inner"
                  data-active={active() ? "" : undefined}
                  style={{
                    height: pct(),
                    "background-color": bar.css,
                  }}
                />
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
