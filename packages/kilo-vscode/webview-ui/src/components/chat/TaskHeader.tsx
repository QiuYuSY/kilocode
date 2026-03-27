/**
 * TaskHeader component
 * Sticky header above the chat messages showing session title,
 * cost, context usage, task timeline, context progress bar, and token breakdown.
 * Collapsible: click title row to expand/collapse the detail panel.
 * Also shows todo progress when the session has todos.
 */

import { Component, For, Show, createMemo, createSignal } from "solid-js"
import { IconButton } from "@kilocode/kilo-ui/icon-button"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { Icon } from "@kilocode/kilo-ui/icon"
import { Checkbox } from "@kilocode/kilo-ui/checkbox"
import { useSession } from "../../context/session"
import { useProvider } from "../../context/provider"
import { useLanguage } from "../../context/language"
import type { TodoItem, StepFinishPart } from "../../types/messages"
import { compute } from "../../utils/timeline/sizes"
import { TaskTimeline } from "./TaskTimeline"
import { ContextProgress } from "./ContextProgress"

interface TaskHeaderProps {
  readonly?: boolean
  onTimelineHover?: (hovering: boolean) => void
}

function fmtNum(n: number, locale: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString(locale)
}

export const TaskHeader: Component<TaskHeaderProps> = (props) => {
  const session = useSession()
  const provider = useProvider()
  const language = useLanguage()

  const title = createMemo(() => session.currentSession()?.title ?? language.t("command.session.new"))
  const hasMessages = createMemo(() => session.messages().length > 0)
  const busy = createMemo(() => session.status() === "busy")
  const canCompact = createMemo(() => !busy() && hasMessages() && !!session.selected())

  const cost = createMemo(() => {
    const total = session.totalCost()
    if (total === 0) return undefined
    return new Intl.NumberFormat(language.locale(), {
      style: "currency",
      currency: "USD",
    }).format(total)
  })

  const context = createMemo(() => {
    const usage = session.contextUsage()
    if (!usage) return undefined
    const tokens = usage.tokens.toLocaleString(language.locale())
    const pct = usage.percentage !== null ? `${usage.percentage}%` : undefined
    return { tokens, pct }
  })

  // Timeline bars — recomputes reactively when messages or parts change
  const bars = createMemo(() => {
    const msgs = session.messages()
    if (msgs.length === 0) return []
    return compute(msgs, session.getParts)
  })

  // Model context limit and max output tokens for the progress bar
  const model = createMemo(() => {
    const sel = session.selected()
    return sel ? provider.findModel(sel) : undefined
  })
  const limit = createMemo(() => model()?.limit?.context ?? model()?.contextLength ?? 0)
  const reserved = createMemo(() => model()?.limit?.output)

  // Cumulative token breakdown from all StepFinishParts across the session
  const breakdown = createMemo(() => {
    const msgs = session.messages()
    let input = 0
    let output = 0
    let reasoning = 0
    let read = 0
    let write = 0
    for (const m of msgs) {
      if (m.role !== "assistant") continue
      for (const p of session.getParts(m.id)) {
        if (p.type !== "step-finish") continue
        const sf = p as StepFinishPart
        if (!sf.tokens) continue
        input += sf.tokens.input
        output += sf.tokens.output
        reasoning += sf.tokens.reasoning ?? 0
        read += sf.tokens.cache?.read ?? 0
        write += sf.tokens.cache?.write ?? 0
      }
    }
    if (input === 0 && output === 0) return undefined
    const cache = read || write ? { read, write } : undefined
    return { input, output, reasoning, cache }
  })

  // Click-to-scroll: find the turn containing this message and scroll to it.
  // Turns have data-message set to the user message ID, so for assistant message
  // bars we need to find the preceding user message that owns the turn.
  function scrollTo(messageID: string) {
    // Direct match (user message bars)
    const direct = document.querySelector(`[data-message="${messageID}"]`)
    if (direct) {
      direct.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    // Find the user message that precedes this assistant message
    const msgs = session.messages()
    let owner: string | undefined
    for (const m of msgs) {
      if (m.role === "user") owner = m.id
      if (m.id === messageID) break
    }
    if (owner) {
      const el = document.querySelector(`[data-message="${owner}"]`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const todos = createMemo(() => session.todos())
  const hasTodos = createMemo(() => todos().length > 0)
  const doneCount = createMemo(() => todos().filter((t: TodoItem) => t.status === "completed").length)
  const totalCount = createMemo(() => todos().length)
  const allDone = createMemo(() => doneCount() === totalCount() && totalCount() > 0)

  const todoSummary = createMemo(() => {
    const done = doneCount()
    const total = totalCount()
    if (total === 0) return ""
    if (done === total) return language.t("task.todos.allDone", { count: String(total) })
    return language.t("task.todos.progress", { done: String(done), total: String(total) })
  })

  const [todosOpen, setTodosOpen] = createSignal(false)
  // Default collapsed — matches legacy where the header starts compact
  const [expanded, setExpanded] = createSignal(false)
  const loc = () => language.locale()

  return (
    <Show when={hasMessages()}>
      {/* Title row with expand toggle */}
      <div data-component="task-header">
        <div data-slot="task-header-title" title={title()}>
          {title()}
        </div>
        <div data-slot="task-header-stats">
          <Show when={cost()}>
            {(c) => (
              <Tooltip value={language.t("context.usage.sessionCost")} placement="bottom">
                <span>{c()}</span>
              </Tooltip>
            )}
          </Show>
          <Show when={context()}>
            {(ctx) => (
              <Tooltip
                value={ctx().pct ? `${ctx().tokens} tokens (${ctx().pct} of context)` : `${ctx().tokens} tokens`}
                placement="bottom"
              >
                <span>{ctx().pct ?? ctx().tokens}</span>
              </Tooltip>
            )}
          </Show>
          <Show when={!props.readonly}>
            <Tooltip value={language.t("command.session.compact")} placement="bottom">
              <IconButton
                icon="compress"
                size="small"
                variant="ghost"
                disabled={!canCompact()}
                onClick={() => session.compact()}
                aria-label={language.t("command.session.compact")}
              />
            </Tooltip>
          </Show>
          {/* Expand/collapse toggle for metrics detail */}
          <Tooltip value={expanded() ? "Hide details" : "Show details"} placement="bottom">
            <IconButton
              icon="chevron-down"
              size="small"
              variant="ghost"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Toggle details"
              data-slot="task-header-expand"
              data-expanded={expanded() ? "" : undefined}
            />
          </Tooltip>
        </div>
      </div>

      {/* Everything below title is only visible when expanded */}
      <Show when={expanded()}>
        <Show when={bars().length > 0}>
          <TaskTimeline bars={bars()} active={busy()} onBarClick={scrollTo} onHover={props.onTimelineHover} />
        </Show>
        <Show when={session.contextUsage() && limit() > 0}>
          <ContextProgress tokens={session.contextUsage()!.tokens} limit={limit()} reserved={reserved()} />
        </Show>
        <Show when={breakdown()}>
          {(bd) => (
            <div data-slot="task-header-tokens">
              <Tooltip value="Input tokens" placement="bottom">
                <span data-slot="token-in">
                  {"\u2191"}
                  {fmtNum(bd().input, loc())}
                </span>
              </Tooltip>
              <Tooltip value="Output tokens" placement="bottom">
                <span data-slot="token-out">
                  {"\u2193"}
                  {fmtNum(bd().output, loc())}
                </span>
              </Tooltip>
              <Show when={bd().cache}>
                {(cache) => (
                  <>
                    <Tooltip value="Cache read" placement="bottom">
                      <span data-slot="token-cache">R:{fmtNum(cache().read, loc())}</span>
                    </Tooltip>
                    <Tooltip value="Cache write" placement="bottom">
                      <span data-slot="token-cache">W:{fmtNum(cache().write, loc())}</span>
                    </Tooltip>
                  </>
                )}
              </Show>
            </div>
          )}
        </Show>
      </Show>

      {/* Todos */}
      <Show when={hasTodos()}>
        <div data-component="task-header-todos">
          <button
            data-slot="task-header-todos-trigger"
            onClick={() => setTodosOpen((v) => !v)}
            aria-expanded={todosOpen()}
          >
            <Icon name="checklist" size="small" />
            <span data-slot="task-header-todos-summary" data-all-done={allDone() ? "" : undefined}>
              {todoSummary()}
            </span>
            <Icon
              name="chevron-down"
              size="small"
              data-slot="task-header-todos-arrow"
              data-open={todosOpen() ? "" : undefined}
            />
          </button>
          <Show when={todosOpen()}>
            <div data-slot="task-header-todos-list">
              <For each={todos()}>
                {(todo: TodoItem) => (
                  <Checkbox readOnly checked={todo.status === "completed"}>
                    <span
                      data-slot="task-header-todo-content"
                      data-completed={todo.status === "completed" ? "" : undefined}
                    >
                      {todo.content}
                    </span>
                  </Checkbox>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </Show>
  )
}
