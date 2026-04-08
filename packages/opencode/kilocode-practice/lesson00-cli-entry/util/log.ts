import { appendFileSync, writeFileSync } from "node:fs"
import { Global } from "../global"

type Level = "DEBUG" | "INFO" | "WARN" | "ERROR"

const rank: Record<Level, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
}

const state = {
  print: false,
  level: "INFO" as Level,
}

function write(level: Level, event: string, data: Record<string, unknown> = {}) {
  // 日志级别不够就直接忽略，这和真实项目里的 logger 思路一致。
  if (rank[level] < rank[state.level]) return

  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    data,
  })

  appendFileSync(Global.Path.log, line + "\n")
  if (state.print) {
    console.error(line)
  }
}

export namespace Log {
  export type Level = "DEBUG" | "INFO" | "WARN" | "ERROR"

  export async function init(input: { print: boolean; level: Level }) {
    // 每次新启动都重置日志文件，方便你观察这一次运行到底留下了什么。
    state.print = input.print
    state.level = input.level
    writeFileSync(Global.Path.log, "")
  }

  export function file() {
    return Global.Path.log
  }

  export const Default = {
    debug(event: string, data: Record<string, unknown> = {}) {
      write("DEBUG", event, data)
    },
    info(event: string, data: Record<string, unknown> = {}) {
      write("INFO", event, data)
    },
    warn(event: string, data: Record<string, unknown> = {}) {
      write("WARN", event, data)
    },
    error(event: string, data: Record<string, unknown> = {}) {
      write("ERROR", event, data)
    },
  }
}
