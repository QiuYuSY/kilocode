import type { KilocodeSessionImportPartData as Part } from "@kilocode/sdk/v2"
import type { LegacyApiMessage, LegacyHistoryItem } from "./legacy-session-types"
import { getApiConversationHistory, parseFile } from "./api-history"

export async function createParts(id: string, dir: string, item?: LegacyHistoryItem): Promise<Array<NonNullable<Part["body"]>>> {
  const file = await getApiConversationHistory(id, dir)
  const conversation = parseFile(file)

  return conversation.flatMap((entry, index) => parseParts(entry, index, id, item))
}

function parseParts(
  entry: LegacyApiMessage,
  index: number,
  id: string,
  item?: LegacyHistoryItem,
): Array<NonNullable<Part["body"]>> {
  const messageID = `msg_${id}_${index}`
  const created = entry.ts ?? item?.ts ?? 0

  if (typeof entry.content === "string") {
    if (!entry.content) return []
    return [
      {
        id: `prt_${id}_${index}_0`,
        messageID,
        sessionID: id,
        timeCreated: created,
        data: {
          type: "text",
          // Plain string content in API history maps directly to a text part.
          text: entry.content,
          time: {
            start: created,
            end: created,
          },
        },
      },
    ]
  }

  if (!Array.isArray(entry.content)) return []

  const parts: Array<NonNullable<Part["body"]>> = []

  entry.content.forEach((part, partIndex) => {
    const partID = `prt_${id}_${index}_${partIndex}`

    if (isText(part) && part.text) {
      parts.push({
        id: partID,
        messageID,
        sessionID: id,
        timeCreated: created,
        data: {
          type: "text",
          text: part.text,
          time: {
            start: created,
            end: created,
          },
        },
      })
      return
    }

    if (isToolUse(part)) {
      const tool = typeof part.name === "string" ? part.name : "unknown"
      parts.push({
        id: partID,
        messageID,
        sessionID: id,
        timeCreated: created,
        data: {
          type: "tool",
          callID: part.id ?? partID,
          tool,
          state: {
            // We store tool_use as completed for now because we only have historical snapshots, not live transitions.
            status: "completed",
            input: record(part.input),
            output: tool,
            title: tool,
            metadata: {},
            time: {
              start: created,
              end: created,
            },
          },
        },
      })
      return
    }

    if (isToolResult(part)) {
      const text = getText(part.content)
      if (!text) return
      parts.push({
        id: partID,
        messageID,
        sessionID: id,
        timeCreated: created,
        data: {
          type: "text",
          // tool_result is preserved as text until we add richer tool/result reconciliation.
          text,
          time: {
            start: created,
            end: created,
          },
        },
      })
      return
    }

    if (entry.type === "reasoning" && entry.text) {
      parts.push({
        id: partID,
        messageID,
        sessionID: id,
        timeCreated: created,
        data: {
          type: "reasoning",
          // Reasoning entries are kept as reasoning parts so we do not lose explicit thinking blocks from legacy history.
          text: entry.text,
          time: {
            start: created,
            end: created,
          },
        },
      })
    }
  })

  return parts
}

function getText(input: unknown) {
  if (typeof input === "string") return input
  if (!Array.isArray(input)) return undefined
  const text = input
    .flatMap((item) => {
      if (isText(item) && item.text) return [item.text]
      return []
    })
    .join("\n")
    .trim()
  return text || undefined
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {}
  return input as Record<string, unknown>
}

function isText(input: unknown): input is { type?: string; text?: string } {
  return Boolean(input && typeof input === "object" && "type" in input && input.type === "text")
}

function isToolUse(input: unknown): input is { type?: string; id?: string; name?: string; input?: unknown } {
  return Boolean(input && typeof input === "object" && "type" in input && input.type === "tool_use")
}

function isToolResult(input: unknown): input is { type?: string; content?: unknown } {
  return Boolean(input && typeof input === "object" && "type" in input && input.type === "tool_result")
}
