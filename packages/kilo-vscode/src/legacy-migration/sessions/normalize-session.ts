import type { LegacyHistoryItem } from "./legacy-session-types"
import type {
  KilocodeSessionImportMessageData as Message,
  KilocodeSessionImportPartData as Part,
  KilocodeSessionImportProjectData as Project,
  KilocodeSessionImportSessionData as Session,
} from "@kilocode/sdk/v2"
import { createMessages } from "./create-messages"
import { createParts } from "./create-parts"
import { createProject } from "./create-project"
import { createSession } from "./create-session"

export interface NormalizedSession {
  project: NonNullable<Project["body"]>
  session: NonNullable<Session["body"]>
  messages: Array<NonNullable<Message["body"]>>
  parts: Array<NonNullable<Part["body"]>>
}

export async function normalizeSession(id: string, dir: string, item?: LegacyHistoryItem): Promise<NormalizedSession> {
  const project = createProject(item)
  const session = createSession(id, item, project.id)
  const messages = await createMessages(id, dir, item)
  const parts = await createParts(id, dir, item)

  return {
    project,
    session,
    messages,
    parts,
  }
}
