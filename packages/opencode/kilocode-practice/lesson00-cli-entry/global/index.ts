import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const data = resolve(root, ".runtime")
const log = resolve(data, "demo.log")
const tele = resolve(data, "telemetry.log")
const auth = resolve(data, "auth.json")
const db = resolve(data, "demo-db.json")
const cfg = resolve(root, "fixtures", "global.json")
const legacy = resolve(root, "fixtures", "legacy-auth.json")

mkdirSync(data, { recursive: true })

export namespace Global {
  export const Root = root
  export const Path = {
    data,
    log,
    tele,
    auth,
    db,
    cfg,
    legacy,
  }
}
