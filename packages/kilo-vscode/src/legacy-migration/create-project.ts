import type { KilocodeSessionImportProjectData as Project } from "@kilocode/sdk/v2"
import type { LegacyHistoryItem } from "./legacy-session-types"

export function createProject(input: { item?: LegacyHistoryItem }): NonNullable<Project["body"]> {
  const project = makeProject()

  // This is the target project id, and should be obtained from the legacy workspace path.
  project.id = input.item?.workspace ?? ""

  // This is the worktree path stored in kilo.db, and should come from the legacy workspace.
  project.worktree = input.item?.workspace ?? ""

  // This is the initial list of sandboxes for the project, and should include the migrated worktree.
  project.sandboxes = input.item?.workspace ? [input.item.workspace] : []

  // This is the project creation time, and should be obtained from legacy session metadata.
  project.timeCreated = input.item?.ts ?? 0

  // This is the project updated time, and should be obtained from legacy session metadata.
  project.timeUpdated = input.item?.ts ?? 0

  return project
}

function makeProject(): NonNullable<Project["body"]> {
  return {
    id: "",
    worktree: "",
    sandboxes: [],
    timeCreated: 0,
    timeUpdated: 0,
  }
}
