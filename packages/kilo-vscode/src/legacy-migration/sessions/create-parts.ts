import type { KilocodeSessionImportPartData as Part } from "@kilocode/sdk/v2"
import type { LegacyApiMessage, LegacyHistoryItem } from "./legacy-session-types"
import { getApiConversationHistory, parseFile } from "./api-history"
import { createMessageID, createPartID, createSessionID } from "./ids"
import { createReasoningPart, createSimpleTextPart, createTextPartWithinMessage, createToolUsePart } from "./create-parts-builders"
import {
  getReasoningText,
  isCompletionResultPart,
  isProviderSpecificReasoningPart,
  isReasoningPart,
  isSimpleTextPart,
  isSingleTextPartWithinMessage,
  isToolResult,
  isToolUse,
} from "./create-parts-util"
import { mergeToolUseAndResult, thereIsNoToolResult } from "./merge-tool-parts"

export async function createParts(id: string, dir: string, item?: LegacyHistoryItem): Promise<Array<NonNullable<Part["body"]>>> {
  const file = await getApiConversationHistory(id, dir)
  const conversation = parseFile(file)

  return conversation.flatMap((entry, index) => parseParts(entry, index, id, conversation, item))
}

function parseParts(
  entry: LegacyApiMessage,
  index: number,
  id: string,
  conversation: LegacyApiMessage[],
  item?: LegacyHistoryItem,
): Array<NonNullable<Part["body"]>> {
  const messageID = createMessageID(id, index)
  const sessionID = createSessionID(id)
  const created = entry.ts ?? item?.ts ?? 0

  if (isSimpleTextPart(entry)) {
    return [createSimpleTextPart(createPartID(id, index, 0), messageID, sessionID, created, entry.content)]
  }

  if (!Array.isArray(entry.content)) return []

  const parts: Array<NonNullable<Part["body"]>> = []

  if (isReasoningPart(entry)) {
    parts.push(createReasoningPart(createPartID(id, index, 0), messageID, sessionID, created, entry.text))
  }

  // Some providers store thinking outside normal content blocks, so this handles those provider-specific fields.
  if (isProviderSpecificReasoningPart(entry)) {
    const reasoning = getReasoningText(entry)
    if (reasoning) {
      parts.push(createReasoningPart(createPartID(id, index, 1), messageID, sessionID, created, reasoning))
    }
  }

  entry.content.forEach((part, partIndex) => {
    const partID = createPartID(id, index, partIndex)

    // Legacy can store a message as several pieces; this handles one text block inside that larger message.
    if (isSingleTextPartWithinMessage(part)) {
      parts.push(createTextPartWithinMessage(partID, messageID, sessionID, created, part.text))
      return
    }

    // The legacy session can contain a final completion message after an assistant interaction.
    // Treat it like a regular assistant text part so the migrated session keeps that final visible answer.
    if (isCompletionResultPart(part)) {
      const text = part.input.result
      parts.push(createTextPartWithinMessage(partID, messageID, sessionID, created, text))
      return
    }

    if (isToolUse(part) && thereIsNoToolResult(conversation, part.id)) {
      parts.push(createToolUsePart(partID, messageID, sessionID, created, part))
      return
    }

    if (isToolResult(part)) {
      // tool_result usually lives in the following user message, while the matching tool_use lives
      // in the earlier assistant message, so we need the whole conversation to reconcile both halves.
      const tool = mergeToolUseAndResult(partID, messageID, sessionID, created, conversation, part)
      if (!tool) return
      parts.push(tool)
      return
    }

  })

  return parts
}
