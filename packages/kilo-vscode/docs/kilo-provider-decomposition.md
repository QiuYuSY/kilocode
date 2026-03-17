# KiloProvider Decomposition Plan

## Problem

`KiloProvider` (`src/KiloProvider.ts`) is 2515 lines with 30 private state fields, 15 public methods, ~40 private methods, and a 59-case message dispatcher. It is the sole mediator between the webview UI and the CLI backend, handling at least 16 distinct responsibility domains. This makes it a classic god object: hard to test, hard to reason about, and high-risk for merge conflicts with upstream.

## Current Responsibilities

| #   | Domain                  | Methods                                                                                                                                                                 | State Fields                                                                                                                     | Lines (est.) |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | Webview lifecycle       | `resolveWebviewView`, `resolveWebviewPanel`, `attachToWebview`, `_getHtmlForWebview`, `postMessage`                                                                     | `webview`, `isWebviewReady`, `webviewMessageDisposable`                                                                          | ~120         |
| 2   | Connection management   | `initializeConnection`, `doInitializeConnection`, `syncWebviewState`                                                                                                    | `connectionState`, `initConnectionPromise`, `unsubscribeEvent`, `unsubscribeState`                                               | ~200         |
| 3   | Session CRUD            | `handleCreateSession`, `handleLoadMessages`, `handleSyncSession`, `handleLoadSessions`, `handleDeleteSession`, `handleRenameSession`, `registerSession`, `trackSession` | `currentSession`, `trackedSessionIds`, `syncedChildSessions`, `sessionDirectories`, `loadMessagesAbort`, `pendingSessionRefresh` | ~350         |
| 4   | Message routing         | `setupWebviewMessageHandler` (59-case switch)                                                                                                                           | —                                                                                                                                | ~350         |
| 5   | SSE event processing    | `handleEvent`, `extractSessionID`                                                                                                                                       | —                                                                                                                                | ~120         |
| 6   | Data fetching & caching | `fetchAndSendProviders`, `fetchAndSendAgents`, `fetchAndSendSkills`, `fetchAndSendConfig`, `fetchAndSendNotifications`                                                  | 5 `cached*Message` fields                                                                                                        | ~200         |
| 7   | Auth & profile          | `handleLogin`, `handleLogout`, `handleRefreshProfile`, `handleSetOrganization`, `reloadAfterAuthChange`                                                                 | `loginAttempt`                                                                                                                   | ~200         |
| 8   | Configuration           | `handleUpdateConfig`, `handleUpdateSetting`, `handleResetAllSettings`, `sendAutocompleteSettings`, `sendBrowserSettings`, `sendNotificationSettings`                    | —                                                                                                                                | ~150         |
| 9   | Cloud sessions          | `handleRequestCloudSessions`, `handleRequestCloudSessionData`, `handleImportAndSend`                                                                                    | —                                                                                                                                | ~200         |
| 10  | Permissions & questions | `handlePermissionResponse`, `fetchAndSendPendingPermissions`, `handleQuestionReply`, `handleQuestionReject`                                                             | —                                                                                                                                | ~150         |
| 11  | Editor context          | `gatherEditorContext`, `handleOpenFile`, `getWorkspaceDirectory`, `getProjectDirectory`, `getOpenTabPaths`, `getIgnoreController`                                       | `ignoreController`, `ignoreControllerDir`, `projectDirectory`                                                                    | ~150         |
| 12  | Telemetry               | `getTelemetryProperties`                                                                                                                                                | `extensionVersion`                                                                                                               | ~20          |
| 13  | Legacy migration        | `checkAndShowMigrationWizard`, `handleRequestLegacyMigrationData`, `handleStartLegacyMigration`, `handleSkipLegacyMigration`, `handleClearLegacyData`                   | `cachedLegacyData`, `migrationCheckInFlight`                                                                                     | ~130         |
| 14  | Marketplace             | `getMarketplace`, `fetchCliSkills`, marketplace switch cases                                                                                                            | `marketplace`                                                                                                                    | ~80          |
| 15  | Code review             | `appendReviewComments`, `flushPendingReviewComments`                                                                                                                    | `pendingReviewComments`                                                                                                          | ~40          |
| 16  | Autocomplete            | `handleChatCompletionRequest`, `handleChatCompletionAccepted` switch cases                                                                                              | —                                                                                                                                | ~30          |

## Proposed Approach: Delegate Pattern with Handler Modules

Rather than introducing a heavyweight DI framework or abstract base classes, the approach is to extract cohesive groups of methods + state into **handler modules** — plain classes that own their state and receive only the dependencies they need via constructor injection.

`KiloProvider` becomes a thin orchestrator: it owns the webview lifecycle, wires up handlers, and delegates the 59-case switch to a dispatcher that routes messages to the correct handler.

### Design Principles

1. **Incremental** — each handler can be extracted one at a time in a separate PR, with no big-bang rewrite.
2. **No new abstractions** — handlers are plain classes, not interface hierarchies. No registries or plugin systems.
3. **Testable** — handlers depend on `KiloClient` and a `postMessage` callback, not on `vscode.Webview`. This makes them unit-testable without mocking VS Code.
4. **vscode-free where possible** — following the existing `kilo-provider-utils.ts` pattern, handler logic should not import `vscode` unless truly needed (e.g., `handleOpenFile`).
5. **Minimal merge conflict risk** — extracted files are new files in Kilo-specific paths, not restructurings of upstream code.

### Shared Context Object

Each handler needs a small set of shared capabilities. Instead of passing `KiloProvider` itself (which recreates the coupling), define a narrow context interface:

```ts
// src/kilo-provider-context.ts
interface ProviderContext {
  readonly client: KiloClient | null
  readonly connectionService: KiloConnectionService
  readonly extensionContext: vscode.ExtensionContext | undefined
  postMessage(msg: unknown): void
  getWorkspaceDirectory(sessionId?: string): string
  getProjectDirectory(sessionId?: string): string
}
```

`KiloProvider` implements this interface and passes `this` (typed as `ProviderContext`) to each handler's constructor.

## Extraction Plan

### Phase 1: Low-Risk, High-Value Extractions

These domains have the least coupling to the rest of KiloProvider and the highest standalone value.

#### 1.1 — AuthHandler

Extract auth/profile logic into `src/handlers/auth-handler.ts`.

**Owns:** `handleLogin`, `handleLogout`, `handleRefreshProfile`, `handleSetOrganization`, `reloadAfterAuthChange`
**State:** `loginAttempt`
**Messages:** `login`, `cancelLogin`, `logout`, `setOrganization`, `refreshProfile`

**Why first:** Self-contained OAuth flow with clear boundaries. No dependency on session state.

#### 1.2 — ConfigHandler

Extract config/settings logic into `src/handlers/config-handler.ts`.

**Owns:** `handleUpdateConfig`, `handleUpdateSetting`, `handleResetAllSettings`, `sendAutocompleteSettings`, `sendBrowserSettings`, `sendNotificationSettings`
**State:** None (stateless — reads/writes VS Code settings directly)
**Messages:** `requestConfig`, `updateConfig`, `setLanguage`, `requestAutocompleteSettings`, `updateAutocompleteSetting`, `updateSetting`, `requestBrowserSettings`, `requestNotificationSettings`, `resetAllSettings`

**Why early:** Completely stateless, pure request-response pattern.

#### 1.3 — MigrationHandler

Extract legacy migration logic into `src/handlers/migration-handler.ts`.

**Owns:** `checkAndShowMigrationWizard`, `handleRequestLegacyMigrationData`, `handleStartLegacyMigration`, `handleSkipLegacyMigration`, `handleClearLegacyData`
**State:** `cachedLegacyData`, `migrationCheckInFlight`
**Messages:** `requestLegacyMigrationData`, `startLegacyMigration`, `skipLegacyMigration`, `clearLegacyData`

**Why early:** Already delegates to `MigrationService`. Fully self-contained, temporary feature that will eventually be removed.

#### 1.4 — MarketplaceHandler

Extract marketplace logic into `src/handlers/marketplace-handler.ts`.

**Owns:** `getMarketplace`, marketplace-related switch cases, `fetchCliSkills`, `removeSkillViaCli`
**State:** `marketplace`
**Messages:** `fetchMarketplaceData`, `filterMarketplaceItems`, `installMarketplaceItem`, `removeInstalledMarketplaceItem`, `removeSkill`, `removeMode`

### Phase 2: Medium-Complexity Extractions

#### 2.1 — SessionHandler

Extract session CRUD into `src/handlers/session-handler.ts`.

**Owns:** `handleCreateSession`, `handleLoadMessages`, `handleSyncSession`, `handleLoadSessions`, `handleDeleteSession`, `handleRenameSession`
**State:** `currentSession`, `trackedSessionIds`, `syncedChildSessions`, `sessionDirectories`, `loadMessagesAbort`, `pendingSessionRefresh`, `projectID`
**Messages:** `createSession`, `clearSession`, `loadMessages`, `syncSession`, `loadSessions`, `deleteSession`, `renameSession`

**Challenge:** Session state is read by SSE event handler, editor context, send message. The handler exposes getters (`currentSessionId`, `trackedSessionIds`) consumed by other handlers.

#### 2.2 — CloudSessionHandler

Extract cloud session logic into `src/handlers/cloud-session-handler.ts`.

**Owns:** `handleRequestCloudSessions`, `handleRequestCloudSessionData`, `handleImportAndSend`
**State:** None (stateless)
**Messages:** `requestCloudSessions`, `requestCloudSessionData`, `importAndSend`

**Dependency:** Needs `SessionHandler.createSession()` for import flow.

#### 2.3 — DataCacheHandler

Extract the fetch-cache-post pattern into `src/handlers/data-cache-handler.ts`.

**Owns:** `fetchAndSendProviders`, `fetchAndSendAgents`, `fetchAndSendSkills`, `fetchAndSendConfig`, `fetchAndSendNotifications`
**State:** 5 `cached*Message` fields
**Messages:** `requestProviders`, `requestAgents`, `requestSkills`, `requestConfig`, `requestNotifications`

**Value:** Consolidates the repeated cache pattern into one place. The 5 fetch methods all follow the same shape: `fetch → normalize → cache → post`.

#### 2.4 — PermissionHandler

Extract permissions/questions into `src/handlers/permission-handler.ts`.

**Owns:** `handlePermissionResponse`, `fetchAndSendPendingPermissions`, `handleQuestionReply`, `handleQuestionReject`
**State:** None
**Messages:** `permissionResponse`, `questionReply`, `questionReject`

### Phase 3: Structural Improvements

#### 3.1 — Message Dispatcher

Replace the 59-case switch with a dispatcher that routes messages to registered handlers.

```ts
// src/message-dispatcher.ts
type Handler = (msg: Record<string, unknown>) => Promise<void> | void

class MessageDispatcher {
  private routes = new Map<string, Handler>()

  register(type: string, handler: Handler) {
    this.routes.set(type, handler)
  }

  async dispatch(msg: Record<string, unknown>) {
    const handler = this.routes.get(msg.type as string)
    if (handler) await handler(msg)
  }
}
```

Each handler registers its own routes during construction. `KiloProvider.setupWebviewMessageHandler` shrinks to: intercept → dispatch → done.

#### 3.2 — SSE Event Router

Extract SSE event handling from `handleEvent` into a dedicated `SSEEventRouter` that delegates to the appropriate handler based on event type. This pairs naturally with `SessionHandler` (which owns the `trackedSessionIds` filter) and `DataCacheHandler` (which needs to refresh on config/provider changes).

#### 3.3 — EditorContextService

Extract editor/workspace logic into `src/services/editor-context.ts`.

**Owns:** `gatherEditorContext`, `handleOpenFile`, `getWorkspaceDirectory`, `getProjectDirectory`, `getOpenTabPaths`, `getIgnoreController`, `getGitRemoteUrl`
**State:** `ignoreController`, `ignoreControllerDir`, `projectDirectory`

This is one of the few handlers that genuinely needs `vscode` imports — that's fine, it's a VS Code-specific service.

### Phase 4: Final Cleanup

#### 4.1 — Slim KiloProvider

After all extractions, `KiloProvider` should contain only:

- Constructor (creates handlers, wires up dispatcher)
- `resolveWebviewView` / `resolveWebviewPanel` / `attachToWebview` (webview lifecycle)
- `postMessage` (thin passthrough)
- `dispose` (disposes all handlers)
- Public API surface consumed by `extension.ts` and `AgentManagerProvider` (delegates to handlers)

**Target:** <400 lines.

#### 4.2 — Review Public API

Some public methods exist solely because `extension.ts` or `AgentManagerProvider` need them. After decomposition, consider whether those callers should depend on a handler directly rather than going through `KiloProvider`. For example, `AgentManagerProvider` could receive `SessionHandler` directly instead of calling `provider.registerSession()`.

## Execution Order & Dependencies

```
Phase 1 (parallel, no dependencies):
  1.1 AuthHandler
  1.2 ConfigHandler
  1.3 MigrationHandler
  1.4 MarketplaceHandler

Phase 2 (sequential):
  2.1 SessionHandler (foundational — other handlers depend on session state)
  2.2 CloudSessionHandler (depends on 2.1)
  2.3 DataCacheHandler
  2.4 PermissionHandler

Phase 3 (after Phase 2):
  3.1 MessageDispatcher (routes to all handlers)
  3.2 SSEEventRouter
  3.3 EditorContextService

Phase 4 (final):
  4.1 Slim KiloProvider
  4.2 Review Public API
```

## Migration Strategy

Each extraction follows this pattern:

1. Create the new handler file with methods + state copied from `KiloProvider`
2. Add the handler as a private field on `KiloProvider`, created in the constructor
3. Replace the original methods with one-line delegations to the handler
4. Update the switch cases to delegate to the handler
5. Remove the now-unused state fields from `KiloProvider`
6. Run `bun run compile` and `bun run test` in `packages/kilo-vscode/`

Delegations are kept temporarily so external consumers (`extension.ts`, `AgentManagerProvider`) don't break. They're cleaned up in Phase 4.

## Risks & Mitigations

| Risk                                   | Mitigation                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Circular dependencies between handlers | Handlers depend on `ProviderContext` interface, not on each other. Cross-handler calls go through the context or via events.                |
| `AgentManagerProvider` breaks          | It uses `attachToWebview`, `registerSession`, `trackSession`, `postMessage` — all stay on `KiloProvider` as thin delegations until Phase 4. |
| Upstream merge conflicts               | New handler files are in `src/handlers/` (Kilo-specific path). `KiloProvider.ts` changes are deletions, which merge cleanly.                |
| Regression in message handling         | The switch statement is preserved during extraction — cases delegate rather than disappear. Full removal happens only in Phase 3.1.         |
| Over-engineering                       | No abstract base classes, no registries, no DI containers. Just classes with constructors.                                                  |

## Success Criteria

- `KiloProvider.ts` is under 400 lines
- No handler imports `vscode` unless it genuinely needs editor/workspace APIs
- Each handler is independently unit-testable with a mock `ProviderContext`
- `bun run compile` and `bun run test` pass at every intermediate step
- External consumers (`extension.ts`, `AgentManagerProvider`, `SettingsEditorProvider`, `SubAgentViewerProvider`) require no changes until Phase 4
