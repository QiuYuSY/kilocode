import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { Global } from "../global"

export type Info = {
  type: "oauth"
  access: string
  accountId: string
}

type Legacy = {
  token: string
  accountId: string
}

export namespace Auth {
  export async function get() {
    if (!existsSync(Global.Path.auth)) return undefined
    return JSON.parse(readFileSync(Global.Path.auth, "utf8")) as Info
  }

  export async function set(auth: Info) {
    writeFileSync(Global.Path.auth, JSON.stringify(auth, null, 2))
  }
}

export async function migrateLegacyAuth() {
  // 已经迁过了就直接跳过，保证这是一次性启动迁移。
  if (existsSync(Global.Path.auth)) return false
  if (!existsSync(Global.Path.legacy)) return false

  const raw = JSON.parse(readFileSync(Global.Path.legacy, "utf8")) as Legacy
  await Auth.set({
    type: "oauth",
    access: raw.token,
    accountId: raw.accountId,
  })
  return true
}
