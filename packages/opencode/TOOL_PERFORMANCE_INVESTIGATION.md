# Tool Definition Performance Investigation

**Date**: 2026-03-26
**Scope**: Long session performance regressions related to tool definitions

## Executive Summary

Investigation into potential performance regressions in long sessions related to tool definitions. Found **one critical issue** (tool re-initialization on every loop step without caching) and several contributing factors including increased tool description sizes and new tools added to every session.

---

## Architecture Overview

Tool definitions flow through this path on **every tool-loop step**:

1. `SessionPrompt.loop()` (`src/session/prompt.ts:656`) calls `resolveTools()` inside the `while(true)` loop
2. `resolveTools()` (`src/session/prompt.ts:827`) calls `ToolRegistry.tools()`
3. `ToolRegistry.tools()` (`src/tool/registry.ts:133`) calls `t.init({ agent })` for **every registered tool** on every invocation
4. Each `init()` reads `.txt` description files, constructs Zod schemas, and runs async operations (e.g., `Skill.all()`)
5. The initialized tools are passed to `LLM.stream()` where they are serialized as JSON schemas in the API request

**There is no caching of initialized tool definitions across loop iterations.** Every tool-loop step re-initializes all ~20 tools from scratch.

---

## Finding 1: No Tool Definition Caching (CRITICAL)

**File**: `packages/opencode/src/tool/registry.ts:159-161`
**Impact**: High — scales with number of tools × number of loop steps per turn

```typescript
// Called on EVERY loop iteration — no caching
.map(async (t) => {
  using _ = log.time(t.id)
  const tool = await t.init({ agent })  // <-- re-initialized every step
```

The `ToolRegistry.tools()` function is called from `resolveTools()` on every iteration of the prompt loop. Each call re-runs `init()` for all ~20 registered tools. For a session with 50 tool-loop steps, this means ~1000 tool initializations.

The `SkillTool.init()` is particularly expensive as it:

- Calls `Skill.all()` to scan the filesystem for available skills
- Evaluates permission rules for each skill
- Constructs a multi-line description with XML-formatted skill listings

**Recommendation**: Cache initialized tool definitions per (model, agent) tuple and invalidate on config changes.

---

## Finding 2: Tool Description Size Growth (MODERATE)

Total tool description text payload sent with every API request: **~38.9 KB** across `.txt` files alone, plus inline descriptions in `.ts` files.

### Largest tool descriptions (bytes):

| File              | Size  | Notes                                        |
| ----------------- | ----- | -------------------------------------------- |
| `bash.txt`        | 9,603 | Full git commit/PR workflow instructions     |
| `todowrite.txt`   | 8,845 | 8 detailed examples with reasoning blocks    |
| `task.txt`        | 3,799 | Agent descriptions + examples                |
| `multiedit.txt`   | 2,406 |                                              |
| `edit.txt`        | 1,369 |                                              |
| `read.txt`        | 1,158 |                                              |
| `apply_patch.txt` | 1,098 | Expanded from 1 line to 33 lines in Jan 2026 |

### Recent description changes that increased size:

1. **`apply_patch.txt`** — Expanded from 1 line (95 bytes) to 33 lines (1,098 bytes)
   - Commit: `4299450d` (Jan 19, 2026) — "tweak apply_patch tool description"
   - Commit: `dd0906be` (Jan 19, 2026) — "tweak: apply patch description"

2. **`warpgrep.txt`** — New file, 974 bytes
   - Commit: `cd26320f` (Mar 17, 2026) — "feat: add WarpGrep AI-powered codebase search tool (#6685)"

3. **`skill.ts` description** — Significantly expanded with XML-formatted skill listings
   - Commit: `39753296` (Feb 3, 2026) — Changed from simple one-line descriptions to multi-line XML blocks with `<available_skills>`, `<skill>`, `<name>`, `<description>`, `<location>` tags

---

## Finding 3: New Tools Added to Every Session (MODERATE)

Several new tools were added in 2026, each adding to the per-request payload:

| Tool                         | Added  | Commit     | Gating                                                             |
| ---------------------------- | ------ | ---------- | ------------------------------------------------------------------ |
| `codebase_search` (warpgrep) | Mar 17 | `cd26320f` | `config.experimental?.codebase_search`                             |
| `apply_patch`                | Jan 17 | `b7ad6bd8` | Only for GPT models                                                |
| `plan_exit`                  | Jan 13 | `0a3c72d6` | Was conditionally gated, now always registered (`4129abac`, Mar 6) |

The `plan_exit` tool registration change is notable: commit `4129abac` (Mar 6) changed it from conditionally gated to **always registered**, meaning every session now includes this tool definition even when not in plan mode.

---

## Finding 4: Environment Details Timestamp — Cache Busting Fixed (RESOLVED)

A series of commits in March 2026 fixed a cache-busting issue with `environment_details`:

1. **`c619d670`** (Feb 24) — Introduced `toISOString()` timestamp that changed every second, breaking prompt caching
2. **`c619d670`** (Feb 24) — Fixed back to `toDateString()` format
3. **`376cffa3`** (Mar 17) — Injected `environment_details` ephemerally to avoid stale accumulation
4. **`22f83d21`** (Mar 17) — Cached `envBlock` per turn for prompt caching
5. **`22fad9db`** (Mar 17) — Keyed cache by `lastUser.id` to recompute on new user messages
6. **`801b561c`** (Mar 17) — Fixed mutation bug that caused duplicate `environment_details` blocks accumulating

**Current state**: `environmentDetails()` now includes an ISO 8601 timestamp (`b38ccb77`, Mar 17) but is cached per user message ID, so it doesn't break prompt caching within a single turn's tool loop.

---

## Finding 5: Websearch Tool Date Cache Bust Fix (RESOLVED)

- **`179c4074`** (Feb 13) — Changed websearch description from `{{date}}` (full ISO date that changes daily) to `{{year}}` (changes annually), specifically to avoid cache busts.

---

## Finding 6: Skill Tool Presentation Changes (LOW)

Two upstream commits adjusted skill presentation to reduce token usage:

- **`f96e2d42`** — "adjust skill presentation to be a little less token heavy (#17098)"
- **`0f6bc8ae`** — "adjust way skills are presented to agent to increase likelihood of skill invocations (#17053)"

These changes occurred in tool descriptions but the actual `.ts` changes were in the upstream opencode repo.

---

## Recommendations

### 1. Cache tool definitions across loop iterations (HIGH PRIORITY)

The `ToolRegistry.tools()` function should cache initialized tool definitions. Since tool descriptions and schemas don't change within a session, the result can be memoized per `(modelID, providerID, agentName)` tuple:

```typescript
// In registry.ts — conceptual fix
const cache = new Map<string, ReturnType<typeof tools>>()

export async function tools(model, agent) {
  const key = `${model.providerID}:${model.modelID}:${agent?.name}`
  const hit = cache.get(key)
  if (hit) return hit
  // ... existing init logic ...
  cache.set(key, result)
  return result
}
```

### 2. Conditionally gate plan_exit tool (LOW PRIORITY)

The `plan_exit` tool is now always registered but only useful in plan mode. Consider gating it by agent permission evaluation at registration time rather than sending it in every API request.

### 3. Consider lazy-loading large tool descriptions (LOW PRIORITY)

The `bash.txt` (9.6 KB) and `todowrite.txt` (8.8 KB) descriptions are quite large. These are loaded on every `init()` call. While the import is cached by the module system, the JSON schema serialization still happens every time.

---

## Appendix: Key File Paths

- Tool definitions: `packages/opencode/src/tool/*.ts` + `*.txt`
- Tool registry: `packages/opencode/src/tool/registry.ts`
- Tool base: `packages/opencode/src/tool/tool.ts`
- Prompt loop: `packages/opencode/src/session/prompt.ts`
- LLM stream: `packages/opencode/src/session/llm.ts`
- Schema transform: `packages/opencode/src/provider/transform.ts`
- Editor context: `packages/opencode/src/kilocode/editor-context.ts`
