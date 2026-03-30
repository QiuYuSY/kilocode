import { Component, createMemo, Switch, Match, createSignal, Show } from "solid-js"
import { Button } from "@kilocode/kilo-ui/button"
import { ErrorDetails } from "@kilocode/kilo-ui/error-details"
import type { AssistantMessage } from "@kilocode/sdk/v2"
import { useLanguage } from "../../context/language"
import {
  unwrapError,
  parseAssistantError,
  isUnauthorizedPaidModelError,
  isUnauthorizedPromotionLimitError,
} from "../../utils/errorUtils"

interface ErrorDisplayProps {
  error: NonNullable<AssistantMessage["error"]>
  onLogin?: () => void
}

export const ErrorDisplay: Component<ErrorDisplayProps> = (props) => {
  const { t } = useLanguage()
  const parsed = createMemo(() => parseAssistantError(props.error))
  const [expanded, setExpanded] = createSignal(false)

  const errorText = createMemo(() => {
    const msg = props.error.data?.message
    if (typeof msg === "string") return unwrapError(msg)
    if (msg === undefined || msg === null) return ""
    return unwrapError(String(msg))
  })

  return (
    <Switch
      fallback={
        <div class="startup-error-banner error-inline-banner">
          <div
            class="startup-error-header"
            onClick={() => setExpanded((v) => !v)}
            role="button"
            aria-expanded={expanded()}
          >
            <span class="startup-error-title">
              Error: <span class="startup-error-firstline">{errorText()}</span>
            </span>
            <button
              class="startup-error-retry"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
            >
              {t("error.details.show")}
            </button>
          </div>
          <Show when={expanded()}>
            <div class="error-inline-details">
              <ErrorDetails error={props.error} />
            </div>
          </Show>
        </div>
      }
    >
      <Match when={isUnauthorizedPaidModelError(parsed())}>
        <div data-component="auth-prompt">
          <div data-slot="auth-prompt-header">
            <span data-slot="auth-prompt-icon">✨</span>
            <span data-slot="auth-prompt-title">{t("error.paidModel.title")}</span>
          </div>
          <p data-slot="auth-prompt-description">{t("error.paidModel.description")}</p>
          <Button variant="primary" onClick={() => props.onLogin?.()}>
            {t("error.paidModel.action")}
          </Button>
        </div>
      </Match>
      <Match when={isUnauthorizedPromotionLimitError(parsed())}>
        <div data-component="auth-prompt">
          <div data-slot="auth-prompt-header">
            <span data-slot="auth-prompt-icon">🕙</span>
            <span data-slot="auth-prompt-title">{t("error.promotionLimit.title")}</span>
          </div>
          <p data-slot="auth-prompt-description">{t("error.promotionLimit.description")}</p>
          <Button variant="primary" onClick={() => props.onLogin?.()}>
            {t("error.promotionLimit.action")}
          </Button>
        </div>
      </Match>
    </Switch>
  )
}
