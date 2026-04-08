import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { HelloCommand } from "./cli/cmd/hello"
import { InspectCommand } from "./cli/cmd/inspect"
import { ExplodeCommand } from "./cli/cmd/explode"
import { UI } from "./cli/ui"
import { Log } from "./util/log"
import { NamedError } from "./error"
import { FormatError } from "./cli/error"
import { Telemetry } from "./telemetry"
import { Config } from "./config/config"
import { Auth, migrateLegacyAuth } from "./auth"
import { Migration } from "./storage/migration"
import { Instance } from "./instance"
import { EOL } from "node:os"

const ENV_FEATURE = "LESSON00_FEATURE"
const ENV_VERSION = "LESSON00_VERSION"

// 启动一开始就给整个进程打上元信息，后面的日志和 telemetry 都会用到。
if (!process.env[ENV_FEATURE]) {
  process.env[ENV_FEATURE] = "cli"
}

if (!process.env[ENV_VERSION]) {
  process.env[ENV_VERSION] = "lesson00-demo"
}

// 进程级兜底：哪怕命令自己的错误处理漏掉了，这里也至少能留下日志。
process.on("unhandledRejection", (err) => {
  Log.Default.error("rejection", {
    err: err instanceof Error ? err.message : err,
  })
})

process.on("uncaughtException", (err) => {
  Log.Default.error("exception", {
    err: err instanceof Error ? err.message : err,
  })
})

process.on("SIGHUP", () => process.exit())

// 根入口只做装配：定义 CLI 外壳、共享初始化、命令注册和最终收口。
let cli = yargs(hideBin(process.argv))
  .parserConfiguration({ "populate--": true })
  .scriptName("lesson00-demo")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", process.env[ENV_VERSION]!)
  .alias("version", "v")
  .option("print-logs", {
    describe: "print logs to stderr",
    type: "boolean",
  })
  .option("log-level", {
    describe: "log level",
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .middleware(async (opts) => {
    // 这段 middleware 会在任何子命令执行前统一运行。
    await Log.init({
      print: Boolean(opts.printLogs),
      level: (() => {
        if (opts.logLevel) return opts.logLevel as Log.Level
        return "INFO"
      })(),
    })

    process.env.LESSON00 = "1"
    process.env.LESSON00_PID = String(process.pid)

    // 先记录一次启动日志，后面你在 demo.log 里能看到这条记录。
    Log.Default.info("boot", {
      version: process.env[ENV_VERSION],
      args: process.argv.slice(2),
    })

    const cfg = await Config.getGlobal()
    // telemetry 也属于“所有命令共享的启动前准备工作”。
    await Telemetry.init({
      version: process.env[ENV_VERSION]!,
      enabled: cfg.experimental?.openTelemetry !== false,
    })

    // 第一次启动时，把旧 auth 文件迁到新位置，避免每个命令自己关心兼容问题。
    const moved = await migrateLegacyAuth()
    if (moved) {
      Log.Default.info("auth.migrated", {})
    }

    const auth = await Auth.get()
    if (auth) {
      await Telemetry.updateIdentity(auth.access, auth.accountId)
    }

    // 模拟一次“启动期迁移”：底层数据先就绪，命令层才能放心执行。
    if (!(await Migration.exists())) {
      process.stderr.write("Running one time demo migration..." + EOL)
      await Migration.run({
        progress: (event) => {
          process.stderr.write(`migration ${event.current}/${event.total} ${event.label}` + EOL)
        },
      })
      process.stderr.write("Demo migration complete." + EOL)
    }

    // 把退出清理动作注册进去，最后统一由 finally 收口。
    Instance.add(async () => {
      Log.Default.info("cleanup", {
        pid: process.env.LESSON00_PID,
      })
    })

    Telemetry.trackCliStart()
  })
  .usage("\n" + UI.logo())
  .completion("completion", "generate shell completion script")
  .command(HelloCommand)
  .command(InspectCommand)
  .command(ExplodeCommand)

cli = cli
  .fail((msg, err) => {
    // 参数解析失败时，先把 help 打出来，再决定是否继续抛错。
    if (msg) {
      cli.showHelp((text) => process.stderr.write(text + EOL))
      process.stderr.write(msg + EOL)
    }

    if (err) throw err
    process.exit(1)
  })
  .strict()

try {
  // 真正开始解析参数并执行命令，是从这里才发生的。
  await cli.parse()
} catch (err) {
  const data: Record<string, unknown> = {}

  if (err instanceof NamedError) {
    const obj = err.toObject()
    Object.assign(data, obj.data)
  }

  if (err instanceof Error) {
    Object.assign(data, {
      name: err.name,
      message: err.message,
      cause: err.cause?.toString(),
      stack: err.stack,
    })
  }

  Log.Default.error("fatal", data)

  const text = FormatError(err)
  if (text) {
    UI.error(text)
  }

  if (text === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    process.stderr.write((err instanceof Error ? err.message : String(err)) + EOL)
  }

  // 这里只先设置退出码，不立刻退出，让 finally 里的统一清理还能正常跑完。
  process.exitCode = 1
} finally {
  // 不管命令成功还是失败，这里的清理都必须执行。
  const code = typeof process.exitCode === "number" ? process.exitCode : undefined
  Telemetry.trackCliExit(code)
  await Telemetry.shutdown()
  await Instance.disposeAll()
  process.exit()
}
