/**
 * GutterBar — 4px colored vertical bar on the left edge of each chat turn.
 * Color matches the turn's first renderable part's timeline color.
 * Visible (opacity 0.7) only when the user is hovering over the TaskTimeline.
 */

import { Component } from "solid-js"
import type { TimelineColor } from "../../utils/timeline/colors"
import { cssColor } from "../../utils/timeline/colors"

interface Props {
  color: TimelineColor
  visible: boolean
}

export const GutterBar: Component<Props> = (props) => {
  return (
    <div
      data-slot="gutter-bar"
      data-visible={props.visible ? "" : undefined}
      style={{ "background-color": cssColor(props.color) }}
    />
  )
}
