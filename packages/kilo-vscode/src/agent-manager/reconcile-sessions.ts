/**
 * Session reconciliation after VS Code reload/restart.
 *
 * When the extension restarts, the CLI backend also restarts. Sessions are
 * persisted to disk by the CLI, so session IDs are stable across restarts.
 * However, stale session associations can accumulate if sessions are deleted
 * externally or the storage is cleared. This module reconciles the persisted
 * agent-manager state against the live backend, re-creating sessions for
 * worktrees whose tracked sessions no longer exist.
 *
 * Pure orchestration — no vscode imports.
 */

import type { KiloClient, Session } from "@kilocode/sdk/v2/client"
import { getErrorMessage } from "../kilo-provider-utils"
import type { WorktreeStateManager } from "./WorktreeStateManager"
import { PLATFORM } from "./constants"

type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

export interface ReconcileContext {
  getClient: () => KiloClient
  onStateChange: (cb: (state: ConnectionState) => void) => () => void
  state: WorktreeStateManager
  registerWorktreeSession: (id: string, dir: string) => void
  registerSession: (session: Session) => void
  pushState: () => void
  refreshSessions: () => void
  capture: (event: string, props?: Record<string, unknown>) => void
  log: (...args: unknown[]) => void
}

interface ReconcileResult {
  recovered: number
  removed: number
}

/** Wait for the CLI backend to become available, with timeout. */
function waitForClient(ctx: ReconcileContext, timeout: number): Promise<boolean> {
  try {
    ctx.getClient()
    return Promise.resolve(true)
  } catch {
    // not ready yet
  }
  return new Promise<boolean>((resolve) => {
    const deadline = setTimeout(() => {
      unsub()
      resolve(false)
    }, timeout)
    const unsub = ctx.onStateChange((s) => {
      if (s !== "connected") return
      clearTimeout(deadline)
      unsub()
      resolve(true)
    })
    // Re-check after subscribing to avoid race
    try {
      ctx.getClient()
      clearTimeout(deadline)
      unsub()
      resolve(true)
    } catch {
      // wait for state change
    }
  })
}

/**
 * Wait for the CLI connection and then reconcile worktree sessions.
 *
 * Main entry point called from AgentManagerProvider after state
 * initialization. Waits up to 10s for the CLI backend to connect.
 */
export async function scheduleReconciliation(ctx: ReconcileContext): Promise<void> {
  const ready = await waitForClient(ctx, 10_000)
  if (!ready) {
    ctx.log("reconcileSessions: client not available after timeout, skipping")
    return
  }
  try {
    await reconcileSessions(ctx)
  } catch (err) {
    ctx.log("reconcileSessions: error during reconciliation:", err)
  }
}

/**
 * Reconcile worktree sessions against the live CLI backend.
 *
 * For each worktree that has a managed session, verify the session still
 * exists on the backend. If not, adopt an existing session from the
 * worktree directory or create a new one.
 */
export async function reconcileSessions(ctx: ReconcileContext): Promise<ReconcileResult> {
  const { state, log } = ctx
  let client: KiloClient
  try {
    client = ctx.getClient()
  } catch {
    log("reconcileSessions: client not available, skipping")
    return { recovered: 0, removed: 0 }
  }

  const worktrees = state.getWorktrees()
  if (worktrees.length === 0) return { recovered: 0, removed: 0 }

  // Fetch all backend sessions per worktree directory in parallel
  const backend = new Map<string, Session[]>()
  await Promise.all(
    worktrees.map(async (wt) => {
      try {
        const { data } = await client.session.list({ directory: wt.path, roots: true }, { throwOnError: true })
        backend.set(wt.id, data)
      } catch (err) {
        log(`reconcileSessions: failed to list sessions for worktree ${wt.id}:`, getErrorMessage(err))
      }
    }),
  )

  let recovered = 0
  let removed = 0

  for (const wt of worktrees) {
    const sessions = backend.get(wt.id)
    if (!sessions) continue // couldn't fetch, skip

    const ids = new Set(sessions.map((s) => s.id))
    const managed = state.getSessions(wt.id)

    for (const ms of managed) {
      if (ids.has(ms.id)) continue
      log(`reconcileSessions: session ${ms.id} not found on backend for worktree ${wt.id}`)
      state.removeSession(ms.id)
      removed++
    }

    // If the worktree still has valid sessions, skip
    if (state.getSessions(wt.id).length > 0) continue

    // Adopt the most recently updated session or create a new one
    const recent = sessions.length > 0 ? [...sessions].sort((a, b) => b.time.updated - a.time.updated)[0] : undefined

    if (recent) {
      state.addSession(recent.id, wt.id)
      ctx.registerWorktreeSession(recent.id, wt.path)
      ctx.registerSession(recent)
      log(`reconcileSessions: adopted existing session ${recent.id} for worktree ${wt.id}`)
      recovered++
      continue
    }

    try {
      const { data: fresh } = await client.session.create(
        { directory: wt.path, platform: PLATFORM },
        { throwOnError: true },
      )
      state.addSession(fresh.id, wt.id)
      ctx.registerWorktreeSession(fresh.id, wt.path)
      ctx.registerSession(fresh)
      log(`reconcileSessions: created new session ${fresh.id} for worktree ${wt.id}`)
      recovered++
      ctx.capture("Agent Manager Session Recovered", {
        source: PLATFORM,
        sessionId: fresh.id,
        worktreeId: wt.id,
      })
    } catch (err) {
      log(`reconcileSessions: failed to create session for worktree ${wt.id}:`, getErrorMessage(err))
    }
  }

  if (recovered > 0 || removed > 0) {
    ctx.pushState()
    ctx.refreshSessions()
    log(`reconcileSessions: recovered ${recovered}, removed ${removed}`)
  }

  return { recovered, removed }
}
