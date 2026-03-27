/**
 * Timeline color classification for message parts.
 * Maps Part types to VS Code theme-aware CSS colors,
 * matching the legacy extension's color palette exactly.
 */

import type { Part } from "../../types/messages"

export type TimelineColor =
  | "user"
  | "read"
  | "write"
  | "tool"
  | "success"
  | "error"
  | "assistant"
  | "question"
  | "default"

/**
 * CSS color strings using VS Code theme variables.
 * Matches the legacy extension's `taskTimelineColorPalette` exactly.
 */
const palette: Record<TimelineColor, string> = {
  user: "color-mix(in srgb, var(--vscode-editor-findMatchBackground) 50%, var(--vscode-errorForeground))",
  read: "var(--vscode-textLink-foreground)",
  write: "var(--vscode-focusBorder)",
  tool: "var(--vscode-activityBarBadge-background)",
  success: "var(--vscode-editorGutter-addedBackground)",
  error: "var(--vscode-errorForeground)",
  assistant: "var(--vscode-descriptionForeground)",
  question: "color-mix(in srgb, var(--vscode-editor-findMatchBackground) 60%, var(--vscode-foreground))",
  default: "var(--vscode-badge-background)",
}

const READ_TOOLS = new Set(["read", "glob", "grep"])
const WRITE_TOOLS = new Set(["edit", "write"])

/**
 * Classify a Part into a timeline color.
 * Returns null for parts that should not appear as bars (step-start, step-finish, file).
 */
export function classify(part: Part, role: "user" | "assistant"): TimelineColor | null {
  switch (part.type) {
    case "text":
      return role === "user" ? "user" : "assistant"

    case "reasoning":
      return "assistant"

    case "tool": {
      if (part.state.status === "error") return "error"
      const name = part.tool.toLowerCase()
      if (READ_TOOLS.has(name)) return "read"
      if (WRITE_TOOLS.has(name)) return "write"
      return "tool"
    }

    case "step-start":
    case "step-finish":
    case "file":
      return null

    default:
      return "default"
  }
}

/** Return the CSS color string for a given TimelineColor. */
export function cssColor(color: TimelineColor): string {
  return palette[color]
}

/** Human-readable label for a part type, used in tooltip. */
export function partLabel(part: Part): string {
  switch (part.type) {
    case "text":
      return "Text"
    case "reasoning":
      return "Thinking"
    case "tool": {
      const name = part.tool
      if (READ_TOOLS.has(name)) return "File Read"
      if (WRITE_TOOLS.has(name)) return "File Write"
      if (name === "bash") return "Command"
      if (name === "webfetch") return "Web Fetch"
      if (name === "task") return "Sub-agent"
      if (name === "todowrite" || name === "todoread") return "Planning"
      return `Tool: ${name}`
    }
    default:
      return "Action"
  }
}
