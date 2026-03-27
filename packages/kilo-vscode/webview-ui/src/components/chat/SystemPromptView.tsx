/**
 * SystemPromptView component
 * Displays the full system prompt broken into collapsible sections by source.
 * Fetched on demand when the user clicks "Show System Prompt" in TaskHeader.
 */

import { Component, For, Show, createSignal, onCleanup } from "solid-js"
import { Icon } from "@kilocode/kilo-ui/icon"
import { IconButton } from "@kilocode/kilo-ui/icon-button"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { Spinner } from "@kilocode/kilo-ui/spinner"
import { useVSCode } from "../../context/vscode"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"
import type { ExtensionMessage, SystemPromptSource } from "../../types/messages"

export const SystemPromptView: Component<{ onClose: () => void }> = (props) => {
  const vscode = useVSCode()
  const session = useSession()
  const language = useLanguage()

  const [sources, setSources] = createSignal<SystemPromptSource[]>([])
  const [system, setSystem] = createSignal<string[]>([])
  const [loading, setLoading] = createSignal(true)
  const [expanded, setExpanded] = createSignal<Set<number>>(new Set())

  // Fetch system prompt on mount
  const sid = session.currentSessionID()
  if (sid) {
    vscode.postMessage({ type: "requestSystemPrompt", sessionID: sid })
  }

  const unsub = vscode.onMessage((msg: ExtensionMessage) => {
    if (msg.type !== "systemPromptLoaded") return
    setSystem(msg.system)
    setSources(msg.sources)
    setLoading(false)
  })
  onCleanup(unsub)

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const expandAll = () => {
    setExpanded(new Set(sources().map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpanded(new Set<number>())
  }

  const copyAll = () => {
    const text = system().join("\n\n---\n\n")
    navigator.clipboard.writeText(text)
  }

  return (
    <div data-component="system-prompt-view">
      <div data-slot="system-prompt-header">
        <span data-slot="system-prompt-title">{language.t("context.systemPrompt.title")}</span>
        <div data-slot="system-prompt-actions">
          <Tooltip value="Expand all" placement="bottom">
            <IconButton icon="expand" size="small" variant="ghost" onClick={expandAll} aria-label="Expand all" />
          </Tooltip>
          <Tooltip value="Collapse all" placement="bottom">
            <IconButton icon="collapse" size="small" variant="ghost" onClick={collapseAll} aria-label="Collapse all" />
          </Tooltip>
          <Tooltip value="Copy full prompt" placement="bottom">
            <IconButton icon="copy" size="small" variant="ghost" onClick={copyAll} aria-label="Copy full prompt" />
          </Tooltip>
          <Tooltip value="Close" placement="bottom">
            <IconButton icon="close" size="small" variant="ghost" onClick={props.onClose} aria-label="Close" />
          </Tooltip>
        </div>
      </div>

      <Show when={loading()}>
        <div data-slot="system-prompt-loading">
          <Spinner />
        </div>
      </Show>
      <Show when={!loading()}>
        <div data-slot="system-prompt-sources">
          <For each={sources()}>
            {(source, idx) => (
              <div data-slot="system-prompt-section">
                <button
                  data-slot="system-prompt-section-header"
                  onClick={() => toggle(idx())}
                  aria-expanded={expanded().has(idx())}
                >
                  <Icon
                    name="chevron-down"
                    size="small"
                    data-slot="system-prompt-section-arrow"
                    data-open={expanded().has(idx()) ? "" : undefined}
                  />
                  <span data-slot="system-prompt-section-name">{source.name}</span>
                  <Show when={source.path}>
                    <span data-slot="system-prompt-section-path">{source.path}</span>
                  </Show>
                </button>
                <Show when={expanded().has(idx())}>
                  <pre data-slot="system-prompt-section-content">{source.content}</pre>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
