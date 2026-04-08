import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { Global } from "../global"

export type Event = {
  current: number
  total: number
  label: string
}

type Db = {
  version: number
  tasks: Array<{
    id: number
    title: string
    done: boolean
  }>
}

export namespace Migration {
  export async function exists() {
    return existsSync(Global.Path.db)
  }

  export async function run(input: { progress: (event: Event) => void }) {
    // 用几个很短的步骤模拟真实项目里的启动迁移流程。
    const steps = ["scan", "copy", "verify", "finalize"] as const

    for (const [idx, label] of steps.entries()) {
      input.progress({
        current: idx + 1,
        total: steps.length,
        label,
      })
      await Bun.sleep(300)
    }

    // 迁移完成后，把一个最小数据库文件落到 .runtime 里，后续 inspect 会直接读取它。
    const db: Db = {
      version: 2,
      tasks: [
        { id: 1, title: "read index.ts", done: true },
        { id: 2, title: "trace the middleware flow", done: false },
      ],
    }

    writeFileSync(Global.Path.db, JSON.stringify(db, null, 2))
  }

  export async function get() {
    if (!existsSync(Global.Path.db)) return undefined
    return JSON.parse(readFileSync(Global.Path.db, "utf8")) as Db
  }
}
