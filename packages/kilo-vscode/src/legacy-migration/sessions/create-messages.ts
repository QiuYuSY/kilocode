import type { KilocodeSessionImportMessageData as Message } from "@kilocode/sdk/v2"
import type { LegacyApiMessage, LegacyHistoryItem } from "./legacy-session-types"
import { getApiConversationHistory, parseFile } from "./api-history"

export async function createMessages(id: string, dir: string, item?: LegacyHistoryItem): Promise<Array<NonNullable<Message["body"]>>> {
  const file = await getApiConversationHistory(id, dir)
  const conversation = parseFile(file)

  return conversation
    .map((entry, index) => parseMessage(entry, index, id, item))
    .filter((message): message is NonNullable<Message["body"]> => Boolean(message))
}

function parseMessage(
  entry: LegacyApiMessage,
  index: number,
  id: string,
  item?: LegacyHistoryItem,
): NonNullable<Message["body"]> | undefined {
  const created = entry.ts ?? item?.ts ?? 0

  if (entry.role === "user") {
    return {
      id: `msg_${id}_${index}`,
      sessionID: id,
      timeCreated: created,
      data: {
        role: "user",
        time: { created },
        agent: "user",
        model: {
          providerID: "legacy",
          modelID: "legacy",
        },
      },
    }
  }

  if (entry.role === "assistant") {
    return {
      id: `msg_${id}_${index}`,
      sessionID: id,
      timeCreated: created,
      data: {
        role: "assistant",
        time: { created, completed: created },
        parentID: index > 0 ? `msg_${id}_${index - 1}` : `msg_${id}_${index}`,
        modelID: "legacy",
        providerID: "legacy",
        mode: item?.mode ?? "code",
        agent: "main",
        path: {
          cwd: item?.workspace ?? "",
          root: item?.workspace ?? "",
        },
        cost: 0,
        tokens: {
          input: 0,
          output: 0,
          reasoning: 0,
          cache: {
            read: 0,
            write: 0,
          },
        },
      },
    }
  }

  return undefined
}
