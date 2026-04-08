import { appendFileSync, writeFileSync } from "node:fs"
import { Global } from "../global"

const state = {
  enabled: true,
  version: "",
  accountId: undefined as string | undefined,
}

function track(type: string, data: Record<string, unknown> = {}) {
  // demo 版 telemetry 很简单：每个事件就往文件里追加一行 JSON。
  if (!state.enabled) return

  appendFileSync(
    Global.Path.tele,
    JSON.stringify({
      time: new Date().toISOString(),
      type,
      data,
    }) + "\n",
  )
}

export namespace Telemetry {
  export async function init(input: { version: string; enabled: boolean }) {
    state.enabled = input.enabled
    state.version = input.version
    // 重置 telemetry 文件，确保你每次实践看到的都是本轮数据。
    writeFileSync(Global.Path.tele, "")
    track("init", {
      version: input.version,
    })
  }

  export async function updateIdentity(token: string, accountId?: string) {
    state.accountId = accountId
    track("identity", {
      token: token.slice(0, 4) + "***",
      accountId,
    })
  }

  export function trackCliStart() {
    track("cli.start", {
      pid: process.pid,
      feature: process.env.LESSON00_FEATURE,
    })
  }

  export function trackCliExit(code?: number) {
    track("cli.exit", {
      code,
      accountId: state.accountId,
    })
  }

  export async function shutdown() {
    track("shutdown", {})
  }
}
