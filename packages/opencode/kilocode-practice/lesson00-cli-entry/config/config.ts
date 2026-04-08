import { existsSync, readFileSync } from "node:fs"
import { Global } from "../global"

export type Info = {
  experimental?: {
    openTelemetry?: boolean
  }
}

export namespace Config {
  export async function getGlobal() {
    if (!existsSync(Global.Path.cfg)) return {} satisfies Info
    return JSON.parse(readFileSync(Global.Path.cfg, "utf8")) as Info
  }
}
