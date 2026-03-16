# Stability Regression Investigation — 2026-03-16

## Reported Symptoms

- **GUI crashes / webview instability**: After "Reload Window", the task completes but the GUI appears crashed
- **CLI disconnections**: Backend CLI process disconnecting from the extension

## Investigation Scope

All PRs merged in the last 2 days (March 14–16, 2026) across:

- `Kilo-Org/kilocode` — 34 merged PRs
- `Kilo-Org/cloud` — 30 merged PRs

---

## Probability Ranking — Most Likely Culprits

### 1. **#7029** — `feat(vscode): replace message queuing with promptAsync and queued UI indicator` — **HIGH**

**Author**: Marius | **Merged**: 2026-03-16T11:22:10Z

**Why this is the #1 suspect:**

This is the largest and most invasive change to core session/message state management in this batch. Key changes:

- **Switches from `prompt` (synchronous) to `promptAsync` (fire-and-forget)** in `KiloProvider.handleSendMessage()` and `handleImportAndSend()`. This fundamentally changes the request lifecycle — the extension no longer waits for the CLI to acknowledge the prompt before continuing.

- **Removes `trackedSessionIds.clear()` and `syncedChildSessions.clear()` from `clearSession`** handler. If session tracking state is not properly cleaned up, stale session data could accumulate and cause state corruption on reload.

- **Introduces optimistic message IDs with `pendingOptimistic` Map** in `session.tsx`. This new tracking layer has complex reconciliation logic in `handleMessagesLoaded()` that preserves "orphan" optimistic messages. A race condition here (e.g., during window reload while a message is pending) could leave the store in an inconsistent state.

- **New `handleSendMessageFailed` handler** that removes optimistic messages and shows toasts. If this fires at the wrong time (e.g., during reconnection after reload), it could corrupt the message list.

- **Changes `sendMessage` to allow sending while busy** (`canSend` no longer checks `isBusy()`). This enables message queuing but means the webview state could have multiple pending messages, increasing the complexity of state management during reload.

- **Removes cleanup of `permissions`, `respondingPermissions`, `questions`, `questionErrors` from `clearSession`**. These signals are no longer reset when starting a new session, which could cause stale permission/question state to persist across sessions.

**Specific failure mode matching reported symptoms:**

- User sends message → task starts → user reloads window → `pendingOptimistic` map is lost (in-memory only) → `handleMessagesLoaded` receives messages from the CLI but the optimistic reconciliation logic has no tracking state → message list gets into an inconsistent state → webview renders incorrectly or crashes.

| Category                        | Risk                                                 |
| ------------------------------- | ---------------------------------------------------- |
| GUI crash / webview instability | **HIGH**                                             |
| CLI disconnection               | **MEDIUM** (promptAsync changes error handling path) |
| Session/task state management   | **HIGH**                                             |

---

### 2. **#7102** — `perf(ui): defer markdown syntax highlighting to prevent main thread blocking` — **HIGH**

**Author**: Marius | **Merged**: 2026-03-16T14:30:02Z

**Why this is high risk:**

- **Complete rewrite of markdown rendering pipeline**: Removes synchronous `marked-shiki` integration and replaces with a two-pass system: plain HTML first, then deferred highlighting via `setTimeout(0)`.

- **Complex abort/generation-counter system**: `highlightState = { gen: 0, signal: { aborted: false } }` tracks concurrent highlight passes. A race condition between rapid streaming updates and highlight completion callbacks could corrupt DOM state.

- **`morphdom` guard for highlighted blocks**: Custom `onBeforeElUpdated` logic using FNV-1a hash comparison to decide whether to preserve or replace highlighted `<pre>` blocks. If the hash comparison has edge cases (e.g., empty code blocks, special characters), morphdom could make incorrect update decisions, leaving the DOM in an inconsistent state.

- **New highlight cache** with LRU eviction (500 entries). Memory pressure from large sessions with many code blocks could interact poorly with webview memory limits.

- **`deferredHighlight` replaces DOM nodes directly** via `replaceWithHighlighted()` which calls `pre.replaceWith(highlighted)`. If this runs after morphdom has already updated the parent, or if the container has been disconnected (e.g., during a view switch), it could cause errors.

**Specific failure mode matching reported symptoms:**

- During a streaming response with code blocks → rapid morphdom updates collide with in-flight deferredHighlight callbacks → DOM replacement on a disconnected/replaced node → uncaught exception → webview enters broken state.

| Category                        | Risk     |
| ------------------------------- | -------- |
| GUI crash / webview instability | **HIGH** |
| CLI disconnection               | Low      |
| Session/task state management   | Low      |

---

### 3. **#7112** — `feat(vscode): collapsible question dock with compact single-box layout` — **MEDIUM**

**Author**: Marius | **Merged**: 2026-03-16T16:16:59Z

**Why this is medium risk:**

- **Major rewrite of QuestionDock component**: Removes the `DockPrompt` component wrapper entirely and replaces with custom HTML structure. This is a significant DOM restructuring.

- **New collapse/expand state management** with CSS animations on `[data-slot="question-dock-body"]`. The CSS uses `max-height` transitions and `overflow: hidden` which can cause layout thrashing if triggered during rendering.

- **New `data-collapsed` attribute** drives visibility. If the collapsed state gets out of sync with the actual DOM during a rapid reload, the question dock could be in a broken state (visible but non-interactive, or hidden when it should be shown).

| Category                        | Risk       |
| ------------------------------- | ---------- |
| GUI crash / webview instability | **MEDIUM** |
| CLI disconnection               | Low        |
| Session/task state management   | Low        |

---

### 4. **#7081** — `fix(vscode): restore settings view and active tab after webview reload` — **MEDIUM**

**Author**: Mark | **Merged**: 2026-03-16T12:05:59Z

**Why this is medium risk:**

- **Changes the `webviewReady` handler in SettingsEditorProvider** to NOT dispose the readyDisposable after the first message. Previously, the ready handler fired once and was cleaned up. Now it fires on every `webviewReady` (including after "Developer: Reload Webviews"). This is explicitly intended to fix reload behavior, but:

- The `setTimeout(() => provider.postMessage(...)`, 50)` in the ready handler could fire at an unexpected time if the webview is in a transitional state during reload.

- **New `settingsTabChanged` message** added to the webview ↔ extension protocol. If the webview sends this message during initialization before the session context is ready, it could cause issues.

- **Tabs component changed from uncontrolled to controlled**: `defaultValue="providers"` replaced with `value={active()} onChange={onTabChange}`. If `active()` returns undefined during initialization, the Tabs component may not render correctly.

| Category                        | Risk                                    |
| ------------------------------- | --------------------------------------- |
| GUI crash / webview instability | **MEDIUM** (specifically during reload) |
| CLI disconnection               | Low                                     |
| Session/task state management   | Low                                     |

---

### 5. **#7091** — `Granular bash permission rules` — **MEDIUM**

**Author**: Imanol | **Merged**: 2026-03-16T16:43:17Z

**Why this is medium risk:**

- **Renames permission API**: `savePatternRules` → `saveAlwaysRules`, `approvedPatterns`/`deniedPatterns` → `approvedAlways`/`deniedAlways`. If the CLI backend hasn't been updated in lockstep with this rename, or if there's a version mismatch between the extension and CLI binary, permission responses could fail silently.

- **Changes `patterns` source**: `props.request.patterns` → `props.request.args?.rules`. If the CLI is sending the old `patterns` field but the webview is now reading `args.rules`, the permission dock would show no rules, potentially causing permission handling to fail.

- **The permission response flow** is critical path — if `handlePermissionResponse` fails, the CLI backend is left waiting for a permission reply that never comes, which could manifest as a "stuck" or "disconnected" session.

| Category                        | Risk                                          |
| ------------------------------- | --------------------------------------------- |
| GUI crash / webview instability | Low                                           |
| CLI disconnection               | **MEDIUM** (stuck permission = stuck session) |
| Session/task state management   | **MEDIUM**                                    |

---

### 6. **#7111** — `fix: guard config fetch/update against disconnected backend` — **LOW-MEDIUM**

**Author**: Mark | **Merged**: 2026-03-16T16:24:43Z

**Why this is noted:**

- This is explicitly a **fix** for disconnection handling — adds `this.connectionState !== "connected"` guard to `fetchAndSendConfig` and `handleUpdateConfig`. This is likely a **fix** for existing issues, not a cause. However, if the `connectionState` check is too aggressive (e.g., during a brief reconnection transient), it could prevent config from loading after reload.

| Category                        | Risk                |
| ------------------------------- | ------------------- |
| GUI crash / webview instability | Low                 |
| CLI disconnection               | Low (this is a fix) |
| Session/task state management   | Low                 |

---

### 7. **#7100** — `feat: add ability to remove custom modes from Agent Behaviour settings` — **LOW**

**Author**: Mark | **Merged**: 2026-03-16T16:00:24Z

- Adds `removeMode` to session context and new message types. The `setTimeout(() => session.removeMode(agent.name), 150)` delay in the dialog close handler is a code smell but unlikely to cause crashes. The new `handleRemoveMode` in KiloProvider properly handles errors with fallback refresh.

| Category                        | Risk |
| ------------------------------- | ---- |
| GUI crash / webview instability | Low  |
| CLI disconnection               | Low  |
| Session/task state management   | Low  |

---

### 8. **#7036** — `fix(vscode): fix ModelSelector hover lag and search debounce` — **LOW**

**Author**: Kirill | **Merged**: 2026-03-15T18:55:02Z

- Performance optimization using `createSelector` and debounced search. Swaps CSS class names (`active` ↔ `selected`). Low risk of crashes.

| Category                        | Risk |
| ------------------------------- | ---- |
| GUI crash / webview instability | Low  |
| CLI disconnection               | Low  |
| Session/task state management   | Low  |

---

### 9. **#7101** — `fix: use direct generateText for prompt enhancement instead of LLM.stream` — **LOW**

**Author**: Marius | **Merged**: 2026-03-16T14:31:41Z

- Replaces `LLM.stream` with direct `generateText` for prompt enhancement. This is a backend-only change that simplifies the enhance-prompt path. Could potentially cause issues if `generateText` behaves differently from `LLM.stream` (e.g., different timeout behavior), but unlikely to cause GUI crashes.

| Category                        | Risk |
| ------------------------------- | ---- |
| GUI crash / webview instability | Low  |
| CLI disconnection               | Low  |
| Session/task state management   | Low  |

---

## Cloud PRs — Stability Impact Assessment

### **#1113** — `Add Responses API support` — **LOW-MEDIUM**

Large refactor of the gateway proxy route to support both `/chat/completions` and `/responses` endpoints. Wraps request body in a discriminated union (`{ kind: 'chat_completions' | 'responses', body }`). Gated behind admin-only access. The refactoring touches the critical path for all API requests, but the changes are structural (wrapping/unwrapping) rather than behavioral. Could cause issues if any edge case in the body parsing fails.

### **#1107** — `fix(gastown): auto token refresh, rework dispatch, and escalation close` — **LOW**

Gastown (Cloudflare DO) changes. Not directly related to the VS Code extension or CLI stability.

### **#1105** — `perf(db): add query timing, statement timeouts, and replica routing for usage reads` — **LOW**

Database query optimization. No impact on client-side stability.

### **#1125** — `fix(google-setup): use manual OAuth flow` — **LOW**

Google auth setup changes. No impact on extension stability.

### All other cloud PRs — **LOW/NONE**

Infrastructure, admin UI, billing, model routing changes. Not directly related to the reported symptoms.

---

## Mentioned Open PRs (Not Yet Merged)

| PR                                                | Status              | Risk if deployed         |
| ------------------------------------------------- | ------------------- | ------------------------ |
| #7122 — marketplace skills tab                    | OPEN                | Low — UI addition only   |
| #7115 — exclude unbound gateway URL from lychee   | CLOSED (not merged) | None                     |
| cloud #1126 — api_kind field to microdollar_usage | OPEN                | Low — DB schema addition |

---

## Other Merged PRs — Low/No Impact

| PR    | Title                                          | Assessment                        |
| ----- | ---------------------------------------------- | --------------------------------- |
| #7125 | docs: add commit conventions to AGENTS.md      | No impact (docs only)             |
| #7121 | Remove (NEW) labels and feature toggle         | Low (display name change)         |
| #7118 | add inert to collapsed question dock body      | Low (accessibility fix)           |
| #7105 | docs: prune migration plan                     | No impact (docs only)             |
| #7103 | guard temperature and prevent prompt injection | Low (backend validation)          |
| #7098 | copy buttons overlaying text                   | Low (CSS fix)                     |
| #7097 | terminal Add to Context using clipboard        | Low (feature addition)            |
| #7094 | append to prompt instead of replacing          | Low (text handling)               |
| #7089 | auto-docs workflow                             | No impact (CI only)               |
| #7088 | local-bin --force fix                          | Low (build tooling)               |
| #7086 | correct config.json schema URL                 | Low (config)                      |
| #7084 | pass settings command URI as i18n var          | Low (i18n refactor)               |
| #7078 | return focus to textarea after selector closes | Low (focus management)            |
| #7076 | consistent icon button sizing                  | Low (CSS)                         |
| #7075 | align filename next to directory path          | Low (CSS)                         |
| #7073 | remove redundant openExternal call             | Low (removes double browser open) |
| #7072 | CI check for kilocode_change markers           | No impact (CI only)               |
| #7071 | de-duplicate reasoning hack for OpenRouter     | Low (backend)                     |
| #7070 | add ability to remove discovered skills        | Low (feature)                     |
| #7066 | handle array-format MCP command                | Low (display fix)                 |
| #7062 | Regenerate openapi.json                        | Low (generated code)              |
| #7050 | Permission prompt style improvements           | Low (CSS)                         |
| #7037 | Improved permission prompt layout              | Low (CSS)                         |
| #7032 | docs: Android Studio known issues              | No impact (docs)                  |
| #7028 | dev-snapshot build script                      | No impact (tooling)               |

---

## Summary & Recommended Actions

### Top 3 suspects to investigate first:

1. **#7029 (promptAsync + optimistic messages)** — Highest risk. The switch from synchronous `prompt` to fire-and-forget `promptAsync`, combined with the new `pendingOptimistic` tracking that doesn't survive webview reload, is the most likely cause of "task is done but GUI seems crashed" symptoms. **Recommendation**: Test reverting this PR first and see if stability improves. Pay special attention to the `clearSession` handler which no longer clears `trackedSessionIds` and `syncedChildSessions`.

2. **#7102 (deferred markdown highlighting)** — High risk for GUI freezes/crashes during streaming. The complex DOM manipulation with morphdom guards and deferred highlight passes could cause rendering corruption. **Recommendation**: Test with a session that has many code blocks and observe behavior during streaming and after reload.

3. **#7112 (collapsible question dock)** — Medium risk. The DOM restructuring could cause layout issues, especially if a question is pending during reload. **Recommendation**: Test with an active question prompt and reload the window.

### For CLI disconnections specifically:

- **#7091 (granular bash permissions)** is the most relevant — if the permission API field rename is not in sync between extension and CLI, permission handling breaks, which can manifest as stuck sessions that appear disconnected.
- **#7029** changes error handling to use `sendMessageFailed` instead of `error` type, which could mask connection errors.

### Recommended testing sequence:

1. Revert #7029 and test reload-during-task behavior
2. If that doesn't resolve it, additionally revert #7102
3. Verify #7091 permission field names match between CLI and extension builds
4. Check extension logs for `sendMessageFailed` messages during reload scenarios
