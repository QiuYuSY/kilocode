# Plan: Chat History Visualizer (Task Timeline)

Reverse-engineer the legacy "colorful vertical bars / token usage / cost" panel from `kilocode-legacy` and implement it in the new `packages/kilo-vscode/` extension.

## What the Feature Is (Exact Legacy Behavior)

The legacy extension has a **Task Timeline** inside `KiloTaskHeader.tsx` — a horizontal strip of colored bars where each bar represents a message/action. The header has two states: **collapsed** and **expanded**.

### Collapsed State (legacy layout)

```
┌──────────────────────────────────────────────────────────┐
│ ▶ Task: summarized text...                         [X]   │  ← chevron + task title + close
│ ▐▐▐ ▐▐▐▐ ▐▐ ▐▐▐▐▐▐ ▐▐ ▐▐▐ ▐▐▐▐▐▐ ▐▐▐                  │  ← TaskTimeline (26px height)
│ 12.3k [═══════════░░░░] 128k  [condense] [share] +8 −4  │  ← ContextWindowProgress + buttons + diff + cost
│                                                  $0.12   │
└──────────────────────────────────────────────────────────┘
```

### Expanded State (legacy layout)

```
┌──────────────────────────────────────────────────────────┐
│ ▼ Task                                             [X]   │
│ Full task text with @mentions and /commands...            │
│ [thumbnails if images]                                   │
│ ▐▐▐ ▐▐▐▐ ▐▐ ▐▐▐▐▐▐ ▐▐ ▐▐▐ ▐▐▐▐▐▐ ▐▐▐                  │  ← TaskTimeline
│ Context Window: 12.3k [═══════════░░░░] 128k [condense]  │
│ Tokens: ↑12.3k ↓2.1k                                    │
│ Cache: ☁↑1.1k ☁↓8.2k                                    │
│ API Cost: $0.12                              [actions]   │
│ Changes: +8 −4 ■■■■□                                    │
└──────────────────────────────────────────────────────────┘
```

### Timeline Bar Specifics (from legacy source)

- Each bar is a `<div>` absolutely positioned at the bottom of a 26px container
- **Width** = 8-32px, proportional to time delta to next message (normalized by max timing). Last message always gets `MIN_WIDTH_PX` (8px)
- **Height** = 8-26px (minus 4px top padding), proportional to content length (text + reasoning + images×100 + condense summary). Minimum 1 char
- **Colors** use VS Code CSS variables via `color-mix()` — NOT hardcoded hex values:
  - `USER_INTERACTION`: `bg-[color-mix(in_srgb,var(--vscode-editor-findMatchBackground)_50%,var(--vscode-errorForeground))]`
  - `SYSTEM_READ`: `bg-[var(--vscode-textLink-foreground)]`
  - `SYSTEM_WRITE`: `bg-[var(--vscode-focusBorder)]`
  - `SYSTEM_GENERAL_TOOL`: `bg-[var(--vscode-activityBarBadge-background)]`
  - `SUCCESS`: `bg-[var(--vscode-editorGutter-addedBackground)]`
  - `ERROR`: `bg-[var(--vscode-errorForeground)]`
  - `ASSISTANT_MUTTERING`: `bg-[var(--vscode-descriptionForeground)]`
  - `ASSISTANT_QUESTION`: `bg-[color-mix(in_srgb,var(--vscode-editor-findMatchBackground)_60%,var(--vscode-foreground))]`
  - `GROUPED`: `bg-[var(--vscode-textLink-activeForeground)]`
  - `DEFAULT`: `bg-[var(--vscode-badge-background)]`
- Bars have `rounded-t-xs`, `transition-all duration-200`, `hover:opacity-70`
- New bars get `animate-fade-in` (disappears after 1s)
- Active (last) bar gets `animate-slow-pulse-delayed`
- Container has `overflow: hidden` at 26px height, inner Virtuoso scroll area is 26px+25px (hides scrollbar)
- `HorizontalScroller`: converts vertical mouse wheel to horizontal scroll, supports drag-scroll via `@use-gesture/react` with pointer capture, `filterTaps: true`, `axis: "x"`, `touchAction: "pan-x"`
- Auto-scrolls to latest bar on new messages (smooth) and on initial mount (instant)

### Gutter Bars (from legacy source)

- 4px wide absolute-positioned left bar on each chat row
- Uses same `getTaskTimelineMessageColor()` color mapping
- `opacity-0` by default, transitions to `opacity-70` when `hoveringTaskTimeline` is true (set by `onMouseEnter`/`onMouseLeave` on the TaskTimeline container)

### Context Window Progress Bar (from legacy source)

- Three-segment horizontal bar: used (darkest) | reserved for output (medium) | available (transparent)
- Background: `color-mix(in_srgb,var(--vscode-foreground)_20%,transparent)`
- Used segment turns red (`color-mix` with `errorForeground`) when `>= 50%`
- Reserved: `color-mix(in_srgb,var(--vscode-foreground)_30%,transparent)`
- Shows token count (left) and context window size (right) flanking the bar
- Tooltip shows: tokens used/total, reserved for response, available space

## What Already Exists in the New Extension

The new extension has in `TaskHeader.tsx` (`webview-ui/src/components/chat/TaskHeader.tsx`):

- Session title
- Total session cost (formatted as Intl currency)
- Context usage (tokens + percentage as tooltip)
- Todo progress section
- Compact button

Data available in the session context (`useSession()`) from `session.tsx`:

- `totalCost()` (line 1559) — `createMemo(() => calcTotalCost(messages()))` — reactive, recomputes on any message change
- `contextUsage()` (lines 1575-1588) — scans backwards for last assistant message with `tokens`, computes vs model context limit
- `messages()` — full message list with `cost`, `tokens`, `time`, `parts` per message
- `getParts(messageID)` — individual parts per message
- `status()` — session status (idle/busy/retry)
- `sessions()` — all sessions sorted by update time

**Gap**: No timeline visualization, no per-message color mapping, no gutter bars, no segmented context window progress bar, no token breakdown, no diff stats.

## Token/Cost Data Flow — Critical Details

### How cost/tokens arrive from OpenRouter

1. **Backend** (`packages/opencode/src/session/index.ts:842-951`): `getUsage()` extracts cost from `providerMetadata.openrouter.usage`:
   - **Kilo BYOK**: Uses `costDetails.upstreamInferenceCost` (excludes OpenRouter's 5% fee)
   - **Direct OpenRouter**: Uses `openrouterUsage.cost` (includes OpenRouter's fee)
   - **Fallback**: Per-million-token calculation from model rate card

2. **Per-step accumulation** (`packages/opencode/src/session/processor.ts:248-287`):
   - `assistantMessage.cost += usage.cost` — **accumulated** across steps
   - `assistantMessage.tokens = usage.tokens` — **overwritten** each step (last step only)
   - Each `step-finish` part carries per-step `cost` and `tokens`

3. **SSE to webview** (`packages/kilo-vscode/src/kilo-provider-utils.ts:256-264`): `message.updated` passes through `cost` and `tokens` via spread. No filtering.

4. **Reactive chain**: SSE → `handleMessageCreated` upserts in store → `messages()` signal → `totalCost` and `contextUsage` memos auto-recompute.

### Implications for Display

| Data                               | Source                                                              | Correctness                                                                               |
| ---------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Session total cost**             | `totalCost()` = sum of `message.cost` across all assistant messages | Correct — cost is accumulated per-step                                                    |
| **Context usage**                  | `contextUsage()` = last assistant message's `tokens`                | Correct for context monitoring — last step sends full conversation                        |
| **Per-message tokens**             | `message.tokens`                                                    | Shows **last step's** tokens only. For multi-step messages, earlier steps are overwritten |
| **Per-step tokens**                | `StepFinishPart.tokens` in `getParts(messageID)`                    | Individually correct per step                                                             |
| **Token breakdown (in/out/cache)** | `message.tokens.{input, output, reasoning, cache.{read, write}}`    | Correct for the last step; for cumulative, must sum `StepFinishPart` tokens               |

**Decision**: For the header token breakdown display, use cumulative sums from ALL `StepFinishPart` parts across the session — this gives accurate totals. For context usage percentage, continue using the existing `contextUsage()` memo (correct as-is).

## Implementation Plan

### Phase 1: Color Classification System

**New file**: `webview-ui/src/utils/timeline/colors.ts`

Port the exact color palette from legacy `messageColors.ts`, using the same VS Code CSS variable bindings. Adapt the classification from legacy `ClineMessage` ask/say subtypes to the new extension's `Part` types.

**Exact color variable mapping** (same CSS as legacy):

```ts
export const palette = {
  USER: "var(--vscode-editor-findMatchBackground)", // mixed with errorForeground
  READ: "var(--vscode-textLink-foreground)",
  WRITE: "var(--vscode-focusBorder)",
  TOOL: "var(--vscode-activityBarBadge-background)",
  SUCCESS: "var(--vscode-editorGutter-addedBackground)",
  ERROR: "var(--vscode-errorForeground)",
  ASSISTANT: "var(--vscode-descriptionForeground)",
  QUESTION: "var(--vscode-editor-findMatchBackground)", // mixed with foreground
  DEFAULT: "var(--vscode-badge-background)",
}
```

**Part → color mapping**:

| Part type               | Tool name                                   | Color              |
| ----------------------- | ------------------------------------------- | ------------------ |
| `tool` (any state)      | `read`, `glob`, `grep`                      | READ               |
| `tool` (any state)      | `edit`, `write`                             | WRITE              |
| `tool` (any state)      | `bash`                                      | TOOL               |
| `tool` (any state)      | `webfetch`, `task`, `todowrite`, `todoread` | TOOL               |
| `tool` (error state)    | any                                         | ERROR              |
| `text` (role=user)      | —                                           | USER               |
| `text` (role=assistant) | —                                           | ASSISTANT          |
| `reasoning`             | —                                           | ASSISTANT          |
| `step-start`            | —                                           | (skip — not a bar) |
| `step-finish`           | —                                           | (skip — not a bar) |

The legacy extension classifies at the `ClineMessage` level (ask/say); the new extension has `Part` types within `Message`. Each visible Part becomes one bar. Messages with only step-start/step-finish parts are skipped.

Export:

```ts
export type TimelineColor =
  | "user"
  | "read"
  | "write"
  | "tool"
  | "success"
  | "error"
  | "assistant"
  | "question"
  | "default"
export function classify(part: Part, role: "user" | "assistant"): TimelineColor | null
export function cssColor(color: TimelineColor): string // returns the color-mix CSS string
export function label(part: Part, t: TranslateFunction): string // tooltip label
```

### Phase 2: Timeline Size Calculation

**New file**: `webview-ui/src/utils/timeline/sizes.ts`

Port exactly from legacy `calculateTaskTimelineSizes.ts`. Identical constants:

```ts
export const MAX_HEIGHT = 26
const AVG_TIMING = 3000
const MIN_WIDTH = 8
const MAX_WIDTH = 32
const MIN_HEIGHT = 8
const TOP_PAD = 4
```

```ts
export interface BarData {
  id: string // part.id or message.id
  messageID: string
  color: TimelineColor
  width: number // 8-32
  height: number // 8-22 (26 - 4 padding)
  label: string // tooltip text
}

export function compute(messages: Message[], parts: (id: string) => Part[], t: TranslateFunction): BarData[]
```

Logic:

1. Iterate messages, for each get parts via `parts(message.id)`
2. Filter parts to renderable types (text, tool, reasoning — skip step-start, step-finish)
3. Compute content length per part: `text.length` for text/reasoning, `JSON.stringify(state.input).length` for tool parts
4. Compute timing: `message.time.completed - message.time.created` (or delta to next message's `time.created`)
5. Find max content length and max timing across all bars
6. Normalize and lerp to get width (from timing) and height (from content length)
7. Last bar gets `MIN_WIDTH` (legacy behavior)

### Phase 3: TaskTimeline Component

**New file**: `webview-ui/src/components/chat/TaskTimeline.tsx`

SolidJS component matching the exact legacy rendering. Key differences from legacy (React → SolidJS):

- `react-virtuoso` → plain CSS horizontal scroll (SolidJS has no virtuoso equivalent; typical sessions have <500 bars so virtualization is unnecessary)
- `@use-gesture/react` → native `onWheel` + `onPointerDown`/`onPointerMove`/`onPointerUp` for drag-scroll
- `memo` → SolidJS fine-grained reactivity (no memoization needed)
- `useState`/`useEffect` → `createSignal`/`onMount`/`onCleanup`

```tsx
interface Props {
  bars: BarData[]
  active: boolean // is session busy (pulse last bar)
  onBarClick?: (messageID: string) => void
  onHover?: (hovering: boolean) => void
}
```

**Exact rendering per bar** (matching legacy `TaskTimelineMessage.tsx`):

```tsx
<div style={{ width: `${bar.width}px`, height: `${MAX_HEIGHT}px` }} class="mr-0.5 relative overflow-hidden">
  <Tooltip>
    <div
      class="absolute bottom-0 left-0 right-0 cursor-pointer rounded-t-xs transition-all duration-200 hover:opacity-70"
      classList={{ "animate-fade-in": isNew(), "animate-slow-pulse-delayed": isActive }}
      style={{ height: `${(bar.height / MAX_HEIGHT) * 100}%`, "background-color": cssColor(bar.color) }}
      onClick={() => props.onBarClick?.(bar.messageID)}
    />
  </Tooltip>
</div>
```

**Container** (matching legacy):

- Outer div: `w-full px-2 overflow-hidden`, height `26px` (clips scrollbar)
- Inner div: `overflow-x-auto overflow-y-hidden touch-none cursor-grab`, height `51px` (26+25 for scrollbar hiding)
- `display: flex; align-items: flex-end` for skyline effect
- `onWheel`: `e.preventDefault(); container.scrollLeft += e.deltaY` (vertical → horizontal)
- Drag scroll: `onPointerDown` sets grabbing cursor, `onPointerMove` adjusts `scrollLeft`, `onPointerUp` resets
- `onMouseEnter`/`onMouseLeave` → call `props.onHover(true/false)`

**Auto-scroll**: Use `createEffect` watching `bars.length` — on increase, scroll to end. On mount with data, instant scroll; on streaming, smooth scroll.

### Phase 4: Context Window Progress Bar

**New file**: `webview-ui/src/components/chat/ContextProgress.tsx`

Port exactly from legacy `ContextWindowProgress.tsx`. A segmented horizontal bar.

```tsx
interface Props {
  tokens: number
  limit: number
  reserved?: number // max output tokens
}
```

Three segments matching legacy CSS:

1. **Used**: `background-color: color-mix(in srgb, var(--vscode-foreground) 50%, transparent)` — turns red (`color-mix(in srgb, var(--vscode-errorForeground) 70%, transparent)`) when `>= 50%`
2. **Reserved for output**: `background-color: color-mix(in srgb, var(--vscode-foreground) 30%, transparent)`
3. **Available**: transparent (remainder of bar)

Bar container: 4px height, `rounded-[2px]`, background `color-mix(in srgb, var(--vscode-foreground) 20%, transparent)`

Layout: `[token_count] [bar] [context_window_size]` in a flex row with `gap-2`, matching legacy exactly.

Tooltip (matching legacy):

- "X of Y tokens used"
- "Z reserved for response" (if reserved > 0)
- "W available space" (if available > 0)

### Phase 5: Integrate into TaskHeader — DO NOT DISTURB EXISTING ROW

The existing `TaskHeader.tsx` title+stats row must remain **unchanged**. The timeline and context bar are **additions below** the existing content.

**Modify** `webview-ui/src/components/chat/TaskHeader.tsx`:

Add below the existing header content (after the `task-header-stats` div, before todos):

```tsx
<Show when={showTimeline()}>
  <TaskTimeline
    bars={bars()}
    active={session.status() === "busy"}
    onBarClick={scrollToMessage}
    onHover={setHovering}
  />
</Show>
<Show when={contextUsage()}>
  <ContextProgress
    tokens={contextUsage()!.tokens}
    limit={contextLimit()}
    reserved={maxOutputTokens()}
  />
</Show>
<Show when={tokenBreakdown()}>
  {(breakdown) => (
    <div data-slot="task-header-tokens">
      <span>↑{formatNumber(breakdown().input)}</span>
      <span>↓{formatNumber(breakdown().output)}</span>
      <Show when={breakdown().cache}>
        {(cache) => (
          <>
            <span>cache R:{formatNumber(cache().read)}</span>
            <span>W:{formatNumber(cache().write)}</span>
          </>
        )}
      </Show>
    </div>
  )}
</Show>
```

**Token breakdown computation**: Create a `createMemo` that accumulates ALL `StepFinishPart` tokens from the entire session:

```ts
const tokenBreakdown = createMemo(() => {
  const msgs = session.messages()
  let input = 0,
    output = 0,
    reasoning = 0,
    read = 0,
    write = 0
  for (const m of msgs) {
    if (m.role !== "assistant") continue
    for (const p of session.getParts(m.id)) {
      if (p.type !== "step-finish" || !p.tokens) continue
      input += p.tokens.input
      output += p.tokens.output
      reasoning += p.tokens.reasoning ?? 0
      read += p.tokens.cache?.read ?? 0
      write += p.tokens.cache?.write ?? 0
    }
  }
  if (input === 0 && output === 0) return undefined
  return { input, output, reasoning, cache: read || write ? { read, write } : undefined }
})
```

This is **correct for OpenRouter** because:

- Each `step-finish` part has accurate per-step tokens from OpenRouter's `usage` response
- Summing all step-finish parts gives the true cumulative totals
- This avoids the `message.tokens` overwrite issue where only the last step's tokens survive

### Phase 6: Gutter Bars on Chat Rows

**New file**: `webview-ui/src/components/chat/GutterBar.tsx`

Exact port of legacy `KiloChatRowGutterBar.tsx`:

```tsx
export function GutterBar(props: { color: TimelineColor; hovering: boolean }) {
  return (
    <div
      style={{ "background-color": cssColor(props.color) }}
      class="absolute w-[4px] left-[4px] top-0 bottom-0 opacity-0 transition-opacity"
      classList={{ "opacity-70": props.hovering }}
    />
  )
}
```

**Reactivity**: The `hovering` boolean comes from a signal in the parent, set by `TaskTimeline`'s `onHover` callback. This signal must be:

1. Defined at a level accessible to both `TaskTimeline` and the chat row components
2. Updated on `mouseenter`/`mouseleave` on the timeline container
3. Reactive — SolidJS signals propagate automatically, so when hovering changes, all `GutterBar` instances re-render their opacity

**Option A**: Add `hovering` signal to the session context (simple, global)
**Option B**: Use a SolidJS context provider wrapping the chat view (more scoped)

Recommend **Option A** — add `[timelineHover, setTimelineHover] = createSignal(false)` to the chat view level and pass down via props, matching the legacy pattern where `hoveringTaskTimeline` was in `ExtensionStateContext`.

### Phase 7: Click-to-Scroll & Reactivity on Session Changes

**Click-to-scroll** (matching legacy behavior):

1. Each `BarData` has a `messageID`
2. On click: find DOM element `[data-message-id="${messageID}"]` (add `data-message-id` to chat row containers if not already present)
3. `element.scrollIntoView({ behavior: "smooth", block: "center" })`
4. Optional: flash highlight animation (CSS animation toggled via a signal)

**Reactivity on session actions** — the timeline must update when:

- **New message arrives** — `messages()` signal updates → `bars` memo recomputes → `<For each={bars()}>` adds new bar
- **Session changes** (user selects different session) — `currentSessionID()` changes → `messages()` returns new session's messages → full timeline remount
- **New session created** — `messages()` becomes empty → timeline shows nothing → bars appear as messages stream in
- **Parts update** (streaming) — `getParts(messageID)` updates → if `bars` memo depends on it, recomputes. Need to ensure `compute()` is called reactively by tracking both `messages()` length AND the parts for each message
- **Session status changes** (idle→busy→idle) — `status()` signal → `active` prop on timeline → last bar pulse animation

The key reactive dependency is:

```ts
const bars = createMemo(() => {
  const msgs = session.messages() // tracks messages signal
  return compute(msgs, session.getParts, language.t) // getParts is a function, called per msg
})
```

Since `getParts` reads from the store (which is a SolidJS store with fine-grained tracking), accessing `session.getParts(m.id)` inside the memo tracks those specific store paths. When a part updates via SSE → store mutation, the memo recomputes.

**However**: `createMemo` in SolidJS only tracks signals accessed during its **synchronous** execution. Since `getParts` accesses `store.parts[messageID]`, and the store uses Solid's `createStore`, these accesses ARE tracked. The bars memo WILL recompute when:

- A new message is added to `store.messages[sessionID]`
- A part is added/updated in `store.parts[messageID]` for any messageID accessed by the memo

This means the timeline updates reactively on every streaming event — no manual refresh needed.

### Phase 8: Settings Toggle

Add a `showTaskTimeline` setting:

1. **Session context or config context**: Add a `showTimeline` signal, default `true`
2. **Persistence**: Store in VS Code `globalState` via the existing config flow
3. **Settings UI**: Add checkbox — "Show task timeline: Visual minimap of session activity"
4. **TaskHeader**: Wrap `<TaskTimeline>` in `<Show when={showTimeline()}>`

### Phase 9: CSS / Theming

**Add to**: `webview-ui/src/styles/chat.css`

```css
/* Task Timeline */
[data-component="task-timeline"] {
  display: flex;
  align-items: flex-end;
  overflow-x: auto;
  overflow-y: hidden;
  touch-action: none;
  cursor: grab;
  width: 100%;
  padding: 0 8px;
}

[data-component="task-timeline"]:active {
  cursor: grabbing;
}

[data-slot="timeline-bar"] {
  position: relative;
  margin-right: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

[data-slot="timeline-bar-inner"] {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  border-radius: 1px 1px 0 0;
  transition: all 0.2s;
}

[data-slot="timeline-bar-inner"]:hover {
  opacity: 0.7;
}

/* Context Progress */
[data-component="context-progress"] {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  white-space: nowrap;
}

[data-slot="context-progress-bar"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  background: color-mix(in srgb, var(--vscode-foreground) 20%, transparent);
}

[data-slot="context-progress-used"] {
  height: 100%;
  background: color-mix(in srgb, var(--vscode-foreground) 50%, transparent);
  transition: width 0.3s ease-out;
}

[data-slot="context-progress-used"][data-warning] {
  background: color-mix(in srgb, var(--vscode-errorForeground) 70%, transparent);
}

[data-slot="context-progress-reserved"] {
  height: 100%;
  background: color-mix(in srgb, var(--vscode-foreground) 30%, transparent);
  transition: width 0.3s ease-out;
}

/* Gutter Bar */
[data-slot="gutter-bar"] {
  position: absolute;
  width: 4px;
  left: 4px;
  top: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

[data-slot="gutter-bar"][data-visible] {
  opacity: 0.7;
}

/* Token Breakdown */
[data-slot="task-header-tokens"] {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--vscode-font-size);
  color: var(--vscode-descriptionForeground);
}

/* Animations */
@keyframes timeline-fade-in {
  from {
    opacity: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes timeline-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

[data-slot="timeline-bar-inner"][data-new] {
  animation: timeline-fade-in 0.3s ease-out;
}

[data-slot="timeline-bar-inner"][data-active] {
  animation: timeline-pulse 2s ease-in-out infinite;
  animation-delay: 0.5s;
}
```

## Files to Create/Modify

### New Files

| File                                                 | Purpose                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `webview-ui/src/utils/timeline/colors.ts`            | Part → color classification, CSS variable mapping       |
| `webview-ui/src/utils/timeline/sizes.ts`             | Bar width/height calculation (same constants as legacy) |
| `webview-ui/src/components/chat/TaskTimeline.tsx`    | Horizontal bar strip with drag-scroll, auto-scroll      |
| `webview-ui/src/components/chat/ContextProgress.tsx` | Three-segment context window progress bar               |
| `webview-ui/src/components/chat/GutterBar.tsx`       | Per-row 4px colored indicator                           |

### Modified Files

| File                                            | Change                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `webview-ui/src/components/chat/TaskHeader.tsx` | Add timeline, context bar, token breakdown BELOW existing content             |
| `webview-ui/src/styles/chat.css`                | Add Task Timeline, Context Progress, Gutter Bar, Token Breakdown CSS sections |
| Chat message row component                      | Add `data-message-id` attribute and `<GutterBar>` child                       |

### No Backend Changes Needed

All required data is already flowing from CLI → SSE → webview:

- `Message.cost` (accumulated per-step, correct for OpenRouter)
- `Message.tokens` (last step's tokens — adequate for context usage display)
- `StepFinishPart.cost` and `.tokens` (per-step, correct — use these for cumulative token breakdown)
- `Message.time.{created, completed}` (for bar width timing)
- `Part` types (text, tool, reasoning — for bar color classification)

## Dependencies

- **No new npm dependencies**
- Legacy uses `react-virtuoso` → replaced with plain CSS horizontal scroll (sufficient for <500 bars)
- Legacy uses `@use-gesture/react` → replaced with native pointer events (onPointerDown/Move/Up)
- SolidJS primitives (`createSignal`, `createMemo`, `For`, `Show`, `onMount`, `onCleanup`, `createEffect`) replace React hooks

## Testing

- Unit tests for `colors.ts` — part classification for all tool types
- Unit tests for `sizes.ts` — bar dimension calculation, edge cases (empty, single message, no timing)
- Unit tests for token breakdown accumulation from StepFinishParts
- Visual regression tests via Storybook if applicable
- Manual testing: verify colors match VS Code theme, bars appear on streaming, click-to-scroll works, gutter bars highlight on hover, timeline updates on session switch/create

## Implementation Order

1. `colors.ts` + `sizes.ts` — pure logic, testable first
2. `TaskTimeline.tsx` — render the bars
3. `TaskHeader.tsx` integration — visible result, timeline appears
4. `ContextProgress.tsx` — segmented bar below timeline
5. Token breakdown display — cumulative StepFinishPart sums
6. `GutterBar.tsx` + hover interaction — polish
7. Click-to-scroll wiring
8. Settings toggle (show/hide)
9. CSS animations and theming refinement
