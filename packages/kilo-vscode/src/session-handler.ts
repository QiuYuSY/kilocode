import type { KiloClient, Session, SessionStatus, TextPartInput, FilePartInput } from "@kilocode/sdk/v2/client"
import type { EditorContext, CloudSessionData } from "./services/cli-backend/types"
import type { KiloConnectionService } from "./services/cli-backend"
import {
  sessionToWebview,
  getErrorMessage,
  mapCloudSessionMessageToWebviewMessage,
  loadSessions as loadSessionsUtil,
  flushPendingSessionRefresh as flushPendingSessionRefreshUtil,
  type SessionRefreshContext,
} from "./kilo-provider-utils"

/**
 * Narrow interface for the subset of KiloProvider state that SessionHandler needs.
 * KiloProvider implements this interface and passes itself to SessionHandler.
 */
export interface SessionContext {
  currentSession: Session | null
  trackedSessionIds: Set<string>
  syncedChildSessions: Set<string>
  sessionDirectories: Map<string, string>
  pendingSessionRefresh: boolean
  connectionState: "connecting" | "connected" | "disconnected" | "error"
  projectID: string | undefined
  loadMessagesAbort: AbortController | null
  client: KiloClient | null
  connectionService: KiloConnectionService
  postMessage(message: unknown): void
  getWorkspaceDirectory(sessionId?: string): string
  getProjectDirectory(sessionId?: string): string | undefined
  slimParts<T>(parts: T[]): T[]
  slimPart<T>(part: T): T
  gatherEditorContext(): Promise<EditorContext>
}

/**
 * Handles session lifecycle operations extracted from KiloProvider.
 *
 * All methods are standalone functions that operate on a SessionContext,
 * following the same pattern as kilo-provider-utils.ts. This keeps the
 * handler vscode-free and testable against a simple context stub.
 */

export async function createSession(ctx: SessionContext): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend" })
    return
  }

  try {
    const dir = ctx.getWorkspaceDirectory()
    const { data: session } = await ctx.client.session.create({ directory: dir }, { throwOnError: true })
    ctx.currentSession = session
    ctx.trackedSessionIds.add(session.id)
    ctx.postMessage({
      type: "sessionCreated",
      session: sessionToWebview(session),
    })
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to create session:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to create session",
    })
  }
}

export async function loadMessages(ctx: SessionContext, sessionID: string): Promise<void> {
  ctx.trackedSessionIds.add(sessionID)

  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend", sessionID })
    return
  }

  ctx.loadMessagesAbort?.abort()
  const abort = new AbortController()
  ctx.loadMessagesAbort = abort

  try {
    const dir = ctx.getWorkspaceDirectory(sessionID)
    const { data: messagesData } = await ctx.client.session.messages(
      { sessionID, directory: dir },
      { throwOnError: true, signal: abort.signal },
    )

    if (abort.signal.aborted) return

    // Update currentSession — loadMessages is the canonical "user switched to this session" signal
    ctx.client.session
      .get({ sessionID, directory: dir })
      .then((result) => {
        if (result.data && !abort.signal.aborted) {
          ctx.currentSession = result.data
        }
      })
      .catch((err: unknown) => console.warn("[Kilo New] SessionHandler: getSession failed (non-critical):", err))

    ctx.postMessage({
      type: "workspaceDirectoryChanged",
      directory: ctx.getWorkspaceDirectory(sessionID),
    })

    // Fetch current session status so the webview has the correct busy/idle state
    ctx.client.session
      .status({ directory: dir })
      .then((result) => {
        if (!result.data) return
        for (const [sid, info] of Object.entries(result.data) as [string, SessionStatus][]) {
          if (!ctx.trackedSessionIds.has(sid)) continue
          ctx.postMessage({
            type: "sessionStatus",
            sessionID: sid,
            status: info.type,
            ...(info.type === "retry" ? { attempt: info.attempt, message: info.message, next: info.next } : {}),
          })
        }
      })
      .catch((err: unknown) => console.error("[Kilo New] SessionHandler: Failed to fetch session statuses:", err))

    const messages = messagesData.map((m) => ({
      ...m.info,
      parts: ctx.slimParts(m.parts),
      createdAt: new Date(m.info.time.created).toISOString(),
    }))

    for (const message of messages) {
      ctx.connectionService.recordMessageSessionId(message.id, message.sessionID)
    }

    ctx.postMessage({ type: "messagesLoaded", sessionID, messages })

    void fetchAndSendPendingPermissions(ctx)
  } catch (error) {
    if (abort.signal.aborted) return
    console.error("[Kilo New] SessionHandler: Failed to load messages:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to load messages",
      sessionID,
    })
  }
}

export async function syncSession(ctx: SessionContext, sessionID: string): Promise<void> {
  if (!ctx.client) return
  if (ctx.syncedChildSessions.has(sessionID)) return

  ctx.syncedChildSessions.add(sessionID)
  ctx.trackedSessionIds.add(sessionID)

  try {
    const dir = ctx.getWorkspaceDirectory(sessionID)
    const { data: messagesData } = await ctx.client.session.messages(
      { sessionID, directory: dir },
      { throwOnError: true },
    )

    const messages = messagesData.map((m) => ({
      ...m.info,
      parts: ctx.slimParts(m.parts),
      createdAt: new Date(m.info.time.created).toISOString(),
    }))

    for (const message of messages) {
      ctx.connectionService.recordMessageSessionId(message.id, message.sessionID)
    }

    ctx.postMessage({ type: "messagesLoaded", sessionID, messages })
  } catch (err) {
    ctx.syncedChildSessions.delete(sessionID)
    console.error("[Kilo New] SessionHandler: Failed to sync child session:", err)
  }
}

function buildRefreshContext(ctx: SessionContext): SessionRefreshContext {
  const client = ctx.client
  return {
    pendingSessionRefresh: ctx.pendingSessionRefresh,
    connectionState: ctx.connectionState,
    listSessions: client
      ? (dir: string) =>
          client.session.list({ directory: dir, roots: true }, { throwOnError: true }).then(({ data }) => data)
      : null,
    sessionDirectories: ctx.sessionDirectories,
    workspaceDirectory: ctx.getWorkspaceDirectory(),
    postMessage: (msg: unknown) => ctx.postMessage(msg),
  }
}

export async function loadAllSessions(ctx: SessionContext): Promise<void> {
  const refresh = buildRefreshContext(ctx)
  try {
    const resolved = await loadSessionsUtil(refresh)
    if (resolved) ctx.projectID = resolved
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to load sessions:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to load sessions",
    })
  }
  ctx.pendingSessionRefresh = refresh.pendingSessionRefresh
}

export async function flushPendingRefresh(ctx: SessionContext, reason: string): Promise<void> {
  if (!ctx.pendingSessionRefresh) return
  console.log("[Kilo New] SessionHandler: Flushing deferred sessions refresh", { reason })
  const refresh = buildRefreshContext(ctx)
  try {
    const resolved = await flushPendingSessionRefreshUtil(refresh)
    if (resolved) ctx.projectID = resolved
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to flush session refresh:", error)
  }
  ctx.pendingSessionRefresh = refresh.pendingSessionRefresh
}

export async function deleteSession(ctx: SessionContext, sessionID: string): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend" })
    return
  }

  try {
    const dir = ctx.getWorkspaceDirectory(sessionID)
    await ctx.client.session.delete({ sessionID, directory: dir }, { throwOnError: true })
    ctx.trackedSessionIds.delete(sessionID)
    ctx.syncedChildSessions.delete(sessionID)
    ctx.sessionDirectories.delete(sessionID)
    if (ctx.currentSession?.id === sessionID) {
      ctx.currentSession = null
    }
    ctx.postMessage({ type: "sessionDeleted", sessionID })
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to delete session:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to delete session",
    })
  }
}

export async function renameSession(ctx: SessionContext, sessionID: string, title: string): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend" })
    return
  }

  try {
    const dir = ctx.getWorkspaceDirectory(sessionID)
    const { data: updated } = await ctx.client.session.update(
      { sessionID, directory: dir, title },
      { throwOnError: true },
    )
    if (ctx.currentSession?.id === sessionID) {
      ctx.currentSession = updated
    }
    ctx.postMessage({ type: "sessionUpdated", session: sessionToWebview(updated) })
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to rename session:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to rename session",
    })
  }
}

export async function resolveSession(
  ctx: SessionContext,
  sessionID?: string,
): Promise<{ sid: string; dir: string } | undefined> {
  if (!ctx.client) return undefined

  const dir = ctx.getWorkspaceDirectory(sessionID || ctx.currentSession?.id)

  if (!sessionID && !ctx.currentSession) {
    const { data: session } = await ctx.client.session.create({ directory: dir }, { throwOnError: true })
    ctx.currentSession = session
    ctx.trackedSessionIds.add(session.id)
    ctx.postMessage({
      type: "sessionCreated",
      session: sessionToWebview(session),
    })
  }

  const sid = sessionID || ctx.currentSession?.id
  if (!sid) throw new Error("No session available")
  ctx.trackedSessionIds.add(sid)
  return { sid, dir }
}

export async function sendMessage(
  ctx: SessionContext,
  text: string,
  messageID?: string,
  sessionID?: string,
  providerID?: string,
  modelID?: string,
  agent?: string,
  variant?: string,
  files?: Array<{ mime: string; url: string }>,
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({
      type: "sendMessageFailed",
      error: "Not connected to CLI backend",
      text,
      sessionID,
      messageID,
      files,
    })
    return
  }

  let resolved: { sid: string; dir: string } | undefined
  try {
    resolved = await resolveSession(ctx, sessionID)

    const parts: Array<TextPartInput | FilePartInput> = []
    if (files) {
      for (const f of files) {
        parts.push({ type: "file", mime: f.mime, url: f.url })
      }
    }
    parts.push({ type: "text", text })

    const editorContext = await ctx.gatherEditorContext()

    if (messageID) {
      ctx.connectionService.recordMessageSessionId(messageID, resolved!.sid)
    }

    await ctx.client.session.promptAsync(
      {
        sessionID: resolved!.sid,
        directory: resolved!.dir,
        messageID,
        parts,
        model: providerID && modelID ? { providerID, modelID } : undefined,
        agent,
        variant,
        editorContext,
      },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to send message:", error)
    ctx.postMessage({
      type: "sendMessageFailed",
      error: getErrorMessage(error) || "Failed to send message",
      text,
      sessionID: resolved?.sid ?? sessionID,
      messageID,
      files,
    })
  }
}

export async function sendCommand(
  ctx: SessionContext,
  command: string,
  args: string,
  messageID?: string,
  sessionID?: string,
  providerID?: string,
  modelID?: string,
  agent?: string,
  variant?: string,
  files?: Array<{ mime: string; url: string }>,
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({
      type: "sendMessageFailed",
      error: "Not connected to CLI backend",
      text: `/${command} ${args}`.trim(),
      sessionID,
      messageID,
      files,
    })
    return
  }

  let resolved: { sid: string; dir: string } | undefined
  try {
    resolved = await resolveSession(ctx, sessionID)

    if (messageID) {
      ctx.connectionService.recordMessageSessionId(messageID, resolved!.sid)
    }

    const parts = files?.map((f) => ({ type: "file" as const, mime: f.mime, url: f.url }))

    await ctx.client.session.command(
      {
        sessionID: resolved!.sid,
        directory: resolved!.dir,
        command,
        arguments: args,
        messageID,
        model: providerID && modelID ? `${providerID}/${modelID}` : undefined,
        agent,
        variant,
        parts,
      },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to send command:", error)
    ctx.postMessage({
      type: "sendMessageFailed",
      error: getErrorMessage(error) || "Failed to send command",
      text: `/${command} ${args}`.trim(),
      sessionID: resolved?.sid ?? sessionID,
      messageID,
      files,
    })
  }
}

export async function abort(ctx: SessionContext, sessionID?: string): Promise<void> {
  if (!ctx.client) return

  const target = sessionID || ctx.currentSession?.id
  if (!target) return

  try {
    const dir = ctx.getWorkspaceDirectory(target)
    await ctx.client.session.abort({ sessionID: target, directory: dir }, { throwOnError: true })
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to abort session:", error)
  }
}

export async function revertSession(ctx: SessionContext, sessionID: string, messageID: string): Promise<void> {
  if (!ctx.client) return
  const dir = ctx.getWorkspaceDirectory(sessionID)
  const { data, error } = await ctx.client.session.revert({ sessionID, messageID, directory: dir })
  if (error) {
    console.error("[Kilo New] SessionHandler: Failed to revert session:", error)
    ctx.postMessage({ type: "error", message: "Failed to revert session", sessionID })
    return
  }
  if (data) ctx.postMessage({ type: "sessionUpdated", session: sessionToWebview(data) })
}

export async function unrevertSession(ctx: SessionContext, sessionID: string): Promise<void> {
  if (!ctx.client) return
  const dir = ctx.getWorkspaceDirectory(sessionID)
  const { data, error } = await ctx.client.session.unrevert({ sessionID, directory: dir })
  if (error) {
    console.error("[Kilo New] SessionHandler: Failed to unrevert session:", error)
    ctx.postMessage({ type: "error", message: "Failed to redo session", sessionID })
    return
  }
  if (data) ctx.postMessage({ type: "sessionUpdated", session: sessionToWebview(data) })
}

export async function compact(
  ctx: SessionContext,
  sessionID?: string,
  providerID?: string,
  modelID?: string,
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend" })
    return
  }

  const target = sessionID || ctx.currentSession?.id
  if (!target) {
    console.error("[Kilo New] SessionHandler: No sessionID for compact")
    return
  }

  if (!providerID || !modelID) {
    console.error("[Kilo New] SessionHandler: No model selected for compact")
    ctx.postMessage({
      type: "error",
      message: "No model selected. Connect a provider to compact this session.",
    })
    return
  }

  try {
    const dir = ctx.getWorkspaceDirectory(target)
    await ctx.client.session.summarize(
      { sessionID: target, directory: dir, providerID, modelID },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to compact session:", error)
    ctx.postMessage({
      type: "error",
      message: getErrorMessage(error) || "Failed to compact session",
    })
  }
}

export async function fetchAndSendPendingPermissions(ctx: SessionContext): Promise<void> {
  if (!ctx.client) return
  try {
    const dir = ctx.getWorkspaceDirectory()
    const { data } = await ctx.client.permission.list({ directory: dir })
    if (!data) return
    for (const perm of data) {
      if (!ctx.trackedSessionIds.has(perm.sessionID)) continue
      ctx.postMessage({
        type: "permissionRequest",
        permission: {
          id: perm.id,
          sessionID: perm.sessionID,
          toolName: perm.permission,
          patterns: perm.patterns,
          always: perm.always,
          args: perm.metadata,
          message: `Permission required: ${perm.permission}`,
          tool: perm.tool,
        },
      })
    }
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to fetch pending permissions:", error)
  }
}

export async function handlePermission(
  ctx: SessionContext,
  permissionId: string,
  sessionID: string,
  response: "once" | "always" | "reject",
  approvedAlways: string[],
  deniedAlways: string[],
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "permissionError", permissionID: permissionId })
    return
  }

  const target = sessionID || ctx.currentSession?.id
  if (!target) {
    console.error("[Kilo New] SessionHandler: No sessionID for permission response")
    ctx.postMessage({ type: "permissionError", permissionID: permissionId })
    return
  }

  try {
    const dir = ctx.getWorkspaceDirectory(target)

    if (approvedAlways.length > 0 || deniedAlways.length > 0) {
      await ctx.client.permission.saveAlwaysRules(
        {
          requestID: permissionId,
          directory: dir,
          approvedAlways,
          deniedAlways,
        },
        { throwOnError: true },
      )
    }

    await ctx.client.permission.reply(
      { requestID: permissionId, reply: response, directory: dir },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to respond to permission:", error)
    ctx.postMessage({ type: "permissionError", permissionID: permissionId })
  }
}

export async function questionReply(ctx: SessionContext, requestID: string, answers: string[][]): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "questionError", requestID })
    return
  }

  try {
    await ctx.client.question.reply(
      { requestID, answers, directory: ctx.getWorkspaceDirectory(ctx.currentSession?.id) },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to reply to question:", error)
    ctx.postMessage({ type: "questionError", requestID })
  }
}

export async function questionReject(ctx: SessionContext, requestID: string): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "questionError", requestID })
    return
  }

  try {
    await ctx.client.question.reject(
      { requestID, directory: ctx.getWorkspaceDirectory(ctx.currentSession?.id) },
      { throwOnError: true },
    )
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to reject question:", error)
    ctx.postMessage({ type: "questionError", requestID })
  }
}

export async function requestCloudSessions(
  ctx: SessionContext,
  message: { cursor?: string; limit?: number; gitUrl?: string },
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({ type: "error", message: "Not connected to CLI backend" })
    return
  }

  try {
    const result = await ctx.client.kilo.cloudSessions({
      cursor: message.cursor,
      limit: message.limit,
      gitUrl: message.gitUrl,
    })

    ctx.postMessage({
      type: "cloudSessionsLoaded",
      sessions: result.data?.cliSessions ?? [],
      nextCursor: result.data?.nextCursor ?? null,
    })
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Failed to fetch cloud sessions:", error)
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Failed to fetch cloud sessions",
    })
  }
}

export async function requestCloudSessionData(ctx: SessionContext, sessionId: string): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({
      type: "cloudSessionImportFailed",
      cloudSessionId: sessionId,
      error: "Not connected to CLI backend",
    })
    return
  }

  try {
    const result = await ctx.client.kilo.cloud.session.get({ id: sessionId })
    const data = result.data as CloudSessionData | undefined
    if (!data) {
      ctx.postMessage({
        type: "cloudSessionImportFailed",
        cloudSessionId: sessionId,
        error: "Failed to fetch cloud session",
      })
      return
    }

    const messages = (data.messages ?? []).filter((m) => m.info).map(mapCloudSessionMessageToWebviewMessage)

    ctx.postMessage({
      type: "cloudSessionDataLoaded",
      cloudSessionId: sessionId,
      title: data.info.title ?? "Untitled",
      messages,
    })
  } catch (err) {
    console.error("[Kilo New] Failed to load cloud session data:", err)
    ctx.postMessage({
      type: "cloudSessionImportFailed",
      cloudSessionId: sessionId,
      error: err instanceof Error ? err.message : "Failed to load cloud session",
    })
  }
}

export async function importAndSend(
  ctx: SessionContext,
  cloudSessionId: string,
  text: string,
  messageID?: string,
  providerID?: string,
  modelID?: string,
  agent?: string,
  variant?: string,
  files?: Array<{ mime: string; url: string }>,
  command?: string,
  commandArgs?: string,
): Promise<void> {
  if (!ctx.client) {
    ctx.postMessage({
      type: "cloudSessionImportFailed",
      cloudSessionId,
      error: "Not connected to CLI backend",
    })
    return
  }

  const dir = ctx.getWorkspaceDirectory()

  // Step 1: Import the cloud session with fresh IDs
  let session: Session | undefined
  try {
    const importResult = await ctx.client.kilo.cloud.session.import({
      sessionId: cloudSessionId,
      directory: dir,
    })
    session = importResult.data as Session | undefined
  } catch (error) {
    console.error("[Kilo New] SessionHandler: Cloud session import failed:", error)
    ctx.postMessage({
      type: "cloudSessionImportFailed",
      cloudSessionId,
      error: getErrorMessage(error) || "Failed to import session from cloud",
    })
    return
  }
  if (!session) {
    ctx.postMessage({
      type: "cloudSessionImportFailed",
      cloudSessionId,
      error: "Failed to import session from cloud",
    })
    return
  }

  // Track the new local session
  ctx.currentSession = session
  ctx.trackedSessionIds.add(session.id)

  ctx.postMessage({
    type: "cloudSessionImported",
    cloudSessionId,
    session: sessionToWebview(session),
  })

  // Step 2: Send the user's message/command on the new local session
  try {
    if (messageID) {
      ctx.connectionService.recordMessageSessionId(messageID, session.id)
    }

    if (command) {
      const fileParts = files?.map((f) => ({ type: "file" as const, mime: f.mime, url: f.url }))
      await ctx.client.session.command(
        {
          sessionID: session.id,
          directory: dir,
          command,
          arguments: commandArgs ?? "",
          messageID,
          model: providerID && modelID ? `${providerID}/${modelID}` : undefined,
          agent,
          variant,
          parts: fileParts,
        },
        { throwOnError: true },
      )
    } else {
      const parts: Array<TextPartInput | FilePartInput> = []
      if (files) {
        for (const f of files) {
          parts.push({ type: "file", mime: f.mime, url: f.url })
        }
      }
      parts.push({ type: "text", text })

      const editorContext = await ctx.gatherEditorContext()
      await ctx.client.session.promptAsync(
        {
          sessionID: session.id,
          directory: dir,
          messageID,
          parts,
          model: providerID && modelID ? { providerID, modelID } : undefined,
          agent,
          variant,
          editorContext,
        },
        { throwOnError: true },
      )
    }
  } catch (err) {
    console.error("[Kilo New] Failed to send message after cloud import:", err)
    ctx.postMessage({
      type: "sendMessageFailed",
      error: err instanceof Error ? err.message : "Failed to send message after import",
      text,
      sessionID: session.id,
      messageID,
      files,
    })
  }
}
