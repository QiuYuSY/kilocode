# 第00课：从 index.ts 开始认识 CLI 入口

## 本课目标

从项目真正的入口文件开始，学习：

1. TypeScript 入口文件长什么样
2. 为什么大型项目的入口一开始几乎全是 `import`
3. 这个项目怎样把命令、日志、遥测、迁移和退出清理装配成一个 CLI

## 本课代码入口

- [index.ts](../../packages/opencode/src/index.ts)

## 当前只读哪里

这一课只精读 `packages/opencode/src/index.ts`。

如果中途提到别的模块，也只是为了帮助理解当前代码，不展开读实现。

## 第一段：入口文件开头为什么几乎全是 `import`

### 代码

```ts
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RunCommand } from "./cli/cmd/run"
import { GenerateCommand } from "./cli/cmd/generate"
import { Log } from "./util/log"
import { AuthCommand } from "./cli/cmd/auth"
import { AgentCommand } from "./cli/cmd/agent"
import { UpgradeCommand } from "./cli/cmd/upgrade"
import { UninstallCommand } from "./cli/cmd/uninstall"
import { ModelsCommand } from "./cli/cmd/models"
```

### TS 语法解释

- `import yargs from "yargs"`
  - 这是默认导入
  - 表示从 `yargs` 这个包里拿默认导出的值

- `import { hideBin } from "yargs/helpers"`
  - 这是命名导入
  - 花括号里的名字必须和对方导出的名字一致

- `import { RunCommand } from "./cli/cmd/run"`
  - 这是相对路径导入
  - `./` 表示“相对当前文件”

### 运行时理解

这一段还没有进入真正的命令执行，它在做启动前的依赖装配。

### 设计意图

大型项目的入口文件经常不是“写业务”，而是“拼装系统”。

这里已经能看出 `index.ts` 的角色：

- 不亲自实现所有命令
- 不亲自实现所有基础设施
- 只负责把它们装到同一个启动点上

这就是组合根思路。

## 第二段：为什么 `./auth`、`./global` 这样写就能导入

### 代码

```ts
import { Config } from "./config/config"
import { Auth } from "./auth"
import { Global } from "./global"
```

### TS / 模块解析解释

- `./config/config`
  - 这是直接指向具体文件

- `./auth`
  - 这不是单个文件名
  - 它会解析到 `src/auth/index.ts`

- `./global`
  - 同理，会解析到 `src/global/index.ts`

### 运行时理解

当 Node/Bun 看到导入路径是一个目录时，会优先去找这个目录里的 `index.ts` 或 `index.js`。

### 设计意图

这是一种很常见的大型项目组织方式：

- 一个目录代表一个模块
- `index.ts` 作为该模块的公共入口

这样做的好处是：

- 模块内部可以拆成很多文件
- 对外导入路径仍然保持简洁

## 第三段：为什么入口一开始还导入了很多 `*Command`

### 代码

```ts
import { ServeCommand } from "./cli/cmd/serve"
import { WorkspaceServeCommand } from "./cli/cmd/workspace-serve"
import { DebugCommand } from "./cli/cmd/debug"
import { StatsCommand } from "./cli/cmd/stats"
import { McpCommand } from "./cli/cmd/mcp"
import { ExportCommand } from "./cli/cmd/export"
import { ImportCommand } from "./cli/cmd/import"
import { PrCommand } from "./cli/cmd/pr"
import { SessionCommand } from "./cli/cmd/session"
import { RemoteCommand } from "./cli/cmd/remote"
```

### 运行时理解

这些导入说明：

- `index.ts` 是整个 CLI 的总入口
- `serve`、`session`、`mcp`、`auth` 这些都是它的子命令

### 设计意图

这说明这个 CLI 不是单功能工具，而是一个命令平台。

你可以先把它理解成：

- `kilo`
- `kilo serve`
- `kilo session`
- `kilo auth`
- `kilo mcp`

入口文件的工作，就是把这些命令模块统一注册到同一个命令系统里。

## 第四段：Kilo 自己加的能力也会在入口层接入

### 代码

```ts
import { Telemetry } from "@kilocode/kilo-telemetry"
import { Instance } from "./project/instance"
import { migrateLegacyKiloAuth, ENV_FEATURE, ENV_VERSION } from "@kilocode/kilo-gateway"
```

### TS 语法解释

- `@kilocode/kilo-telemetry`
  - 这不是相对路径
  - 这是 monorepo 里的内部包

- `@kilocode/kilo-gateway`
  - 也是 monorepo 里的内部包
  - 说明这个仓库不是只有 `packages/opencode`

### 运行时理解

入口文件不只装配 upstream 原本就有的 CLI 能力，也装配 Kilo 这条 fork 自己新增的平台能力。

### 设计意图

入口文件通常最容易看出：

- 这个 fork 新加了什么
- 这些新能力插在启动流程的哪个位置

## 第五段：`ENV_FEATURE` 和 `ENV_VERSION` 在做什么

### 代码

```ts
if (!process.env[ENV_FEATURE]) {
  const isServe = process.argv.includes("serve")
  process.env[ENV_FEATURE] = isServe ? "unknown" : "cli"
}

if (!process.env[ENV_VERSION]) {
  process.env[ENV_VERSION] = Installation.VERSION
}
```

### TS / JS 语法解释

- `process.env[...]`
  - 表示读写当前进程的环境变量

- `!process.env[ENV_FEATURE]`
  - `!` 表示取反
  - 意思是“如果这个环境变量现在还没被设置”

- `isServe ? "unknown" : "cli"`
  - 这是三元表达式
  - 条件成立取前者，否则取后者

### 运行时理解

这段代码发生得很早。

它先给整个进程打两类元信息：

- 当前这次启动的 feature 来源是什么
- 当前 CLI 版本是什么

### 设计意图

这不是给当前文件自己用的，而是给后面的系统用的，比如：

- gateway 请求头
- telemetry 归因
- feature 统计

也就是说，入口文件先替整个进程准备“元信息”。

## 第六段：进程级错误处理和信号兜底

### 代码

```ts
process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: e instanceof Error ? e.message : e,
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: e instanceof Error ? e.message : e,
  })
})

process.on("SIGHUP", () => process.exit())
```

### TS / JS 语法解释

- `process.on(...)`
  - 给当前 Node/Bun 进程注册事件监听

- `e instanceof Error ? e.message : e`
  - 这是三元表达式
  - 如果 `e` 是 `Error`，就取 `message`
  - 否则直接记录原值

- `() => process.exit()`
  - 这是一个很短的箭头函数
  - 收到信号就直接退出进程

### 运行时理解

这里处理了三类进程级问题：

1. 没被 `catch` 的 Promise 错误
2. 没被捕获的异常
3. 终端挂起或会话断开时的 `SIGHUP`

### 设计意图

大型 CLI 很怕两种情况：

- 程序崩了，但没有日志
- 终端关了，但后台还留着孤儿进程

所以入口层先把这些最基础的兜底逻辑挂上。

## 第七段：开始创建根 CLI 对象

### 代码

```ts
let cli = yargs(hideBin(process.argv))
  .parserConfiguration({ "populate--": true })
  .scriptName("kilo")
  .wrap(100)
  .help("help", "show help")
  .alias("help", "h")
  .version("version", "show version number", Installation.VERSION)
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
```

### TS / JS 语法解释

- `yargs(hideBin(process.argv))`
  - `process.argv` 是进程启动参数数组
  - `hideBin(...)` 会把 bun/node 自己那部分参数去掉
  - `yargs(...)` 则据此创建 CLI 解析器对象

- 链式调用
  - `.help(...).alias(...).version(...)`
  - 每一步都会返回可继续配置的对象，所以可以一直连着写

- `let cli = ...`
  - 这里用了 `let`
  - 因为后面还会继续给 `cli` 重新赋值

### 逐个理解这些方法

#### `.parserConfiguration({ "populate--": true })`

- 作用：设置解析器行为
- 这里表示把 `--` 后面的参数保留下来

#### `.scriptName("kilo")`

- 作用：指定帮助信息里显示的命令名

#### `.wrap(100)`

- 作用：限制帮助输出的换行宽度

#### `.help("help", "show help")`

- 作用：注册 `--help`

#### `.alias("help", "h")`

- 作用：给 `help` 增加 `-h` 这个短别名

#### `.version("version", "show version number", Installation.VERSION)`

- 作用：注册 `--version`
- 真正显示的版本号来自 `Installation.VERSION`

#### `.alias("version", "v")`

- 作用：给 `version` 增加 `-v`

#### `.option("print-logs", { ... })`

- 作用：定义根级选项
- `type: "boolean"` 表示这是布尔开关

#### `.option("log-level", { ... })`

- 作用：再定义一个根级选项
- `choices` 表示只允许这些字符串值

### 运行时理解

到这里为止，CLI 还没真正执行任何具体命令。

它只是在定义：

- 根命令叫什么
- help / version 怎么工作
- 所有命令共享的全局选项有哪些

### 设计意图

这说明 `index.ts` 在做的不是业务执行，而是在搭整个 CLI 的公共外壳。

## 第八段：`middleware` 前半段是所有命令共享的启动前逻辑

### 代码

```ts
.middleware(async (opts) => {
  await Log.init({
    print: process.argv.includes("--print-logs"),
    dev: Installation.isLocal(),
    level: (() => {
      if (opts.logLevel) return opts.logLevel as Log.Level
      if (Installation.isLocal()) return "DEBUG"
      return "INFO"
    })(),
  })

  process.env.AGENT = "1"
  process.env.KILO = "1"
  process.env.KILO_PID = String(process.pid)

  Log.Default.info("opencode", {
    version: Installation.VERSION,
    args: process.argv.slice(2),
  })
```

### TS 语法解释

- `.middleware(async (opts) => { ... })`
  - 表示在真正执行具体命令前，先统一跑这段逻辑

- `async`
  - 表示函数里可以使用 `await`

- `(() => { ... })()`
  - 这是立即执行函数
  - 作用是在表达式位置写一段多分支逻辑

- `opts.logLevel as Log.Level`
  - `as`
  - 这是类型断言
  - 这里是在告诉 TypeScript：把这个值按 `Log.Level` 看待

- `String(process.pid)`
  - 把进程 ID 转成字符串

- `process.argv.slice(2)`
  - 取命令行参数数组里真正属于用户输入的那部分

### 运行时理解

这里在每次执行任何 CLI 命令前都会做 3 件事：

1. 初始化日志系统
2. 给当前进程打上 `AGENT`、`KILO`、`KILO_PID` 标记
3. 记录一条启动日志，写下版本号和命令参数

### 设计意图

这是一种“所有命令共享统一启动前逻辑”的设计。

好处是：

- 每个命令不用自己初始化日志
- 进程级标记集中设置
- 启动审计集中记录

## 第九段：`middleware` 后半段在做平台级基础设施初始化

### 代码

```ts
const globalCfg = await Config.getGlobal()
await Telemetry.init({
  dataPath: Global.Path.data,
  version: Installation.VERSION,
  enabled: globalCfg.experimental?.openTelemetry !== false,
})

await migrateLegacyKiloAuth(
  async () => (await Auth.get("kilo")) !== undefined,
  async (auth) => Auth.set("kilo", auth),
)

const kiloAuth = await Auth.get("kilo")
if (kiloAuth) {
  const token = kiloAuth.type === "oauth" ? kiloAuth.access : kiloAuth.key
  const accountId = kiloAuth.type === "oauth" ? kiloAuth.accountId : undefined
  await Telemetry.updateIdentity(token, accountId)
}

Telemetry.trackCliStart()
```

### TS 语法解释

- `await Config.getGlobal()`
  - 调用异步函数并等待结果

- `globalCfg.experimental?.openTelemetry`
  - `?.` 是可选链
  - 如果 `experimental` 不存在，不会报错，而是返回 `undefined`

- `!== false`
  - 这里不是判断“是否等于 true”
  - 而是判断“只要不是明确写了 false，就视为开启”

- `kiloAuth.type === "oauth" ? kiloAuth.access : kiloAuth.key`
  - 这是三元表达式
  - 根据鉴权类型选择不同字段

### 运行时理解

这一段在做 4 件事：

1. 读取全局配置
2. 初始化 telemetry
3. 尝试把旧版 Kilo CLI 的鉴权迁移到新格式
4. 如果已经有登录态，就把身份同步给 telemetry

最后 `Telemetry.trackCliStart()` 会记录一次 CLI 启动事件。

### 设计意图

这里说明入口层不仅在做“命令行初始化”，还在做“平台级基础设施初始化”。

也就是说：

- 日志
- telemetry
- 鉴权迁移
- 身份归因

这些都被视为每次 CLI 启动前就应该准备好的公共能力。

## 第十段：数据库迁移检查为什么也放在入口里

### 代码

```ts
const marker = path.join(Global.Path.data, "kilo.db")
if (!(await Filesystem.exists(marker))) {
  const tty = process.stderr.isTTY
  process.stderr.write("Performing one time database migration, may take a few minutes..." + EOL)

  try {
    await JsonMigration.run(Database.Client().$client, {
      progress: (event) => {
        const percent = Math.floor((event.current / event.total) * 100)
        ...
      },
    })
  } finally {
    ...
  }

  process.stderr.write("Database migration complete." + EOL)
}
```

### TS / JS 语法解释

- `path.join(...)`
  - 用来安全拼接路径

- `!(await Filesystem.exists(marker))`
  - 先等待异步结果
  - 再取反
  - 表示“如果这个文件不存在”

- `progress: (event) => { ... }`
  - 这是把一个回调函数作为参数传进去
  - 迁移过程中会不断回调它来更新进度

- `try { ... } finally { ... }`
  - 表示无论迁移成功还是失败，`finally` 里的清理逻辑都会执行

### 运行时理解

这段逻辑表示：

- 如果本地 `kilo.db` 还不存在
- 说明旧数据可能还没迁移到 sqlite
- 那就在真正执行命令前，先做一次数据库迁移

而且作者还顺手处理了终端体验：

- TTY 环境下显示动态进度条
- 非 TTY 环境下输出普通进度文本
- 结束时恢复终端状态

### 设计意图

作者不希望把迁移做成“用户必须手动执行的单独命令”，而是希望：

- 启动时自动兜底
- 先把底层存储修好
- 再让后续命令建立在已就绪的存储之上

这是一种典型的“启动期自修复”设计。

## 第十一段：`.usage(...)`、`.completion(...)`、`.command(...)`

### 代码

```ts
.usage("\n" + UI.logo())
.completion("completion", "generate shell completion script")
.command(AcpCommand)
.command(McpCommand)
.command(TuiThreadCommand)
.command(AttachCommand)
.command(RunCommand)
.command(GenerateCommand)
.command(DebugCommand)
.command(AuthCommand)
.command(AgentCommand)
.command(UpgradeCommand)
.command(UninstallCommand)
.command(ServeCommand)
.command(ModelsCommand)
.command(StatsCommand)
.command(ExportCommand)
.command(ImportCommand)
.command(PrCommand)
.command(SessionCommand)
.command(RemoteCommand)
.command(DbCommand)
```

### 逐个解释

#### `.usage("\n" + UI.logo())`

- 作用：设置帮助页的展示内容
- 这里用了 `UI.logo()`，说明帮助页会带项目 logo

#### `.completion("completion", "generate shell completion script")`

- 作用：注册 shell 自动补全能力
- 让 CLI 可以生成补全脚本

#### `.command(XxxCommand)`

- 作用：注册一个子命令
- 每调用一次，就把一个命令模块接到根 CLI 上

### 运行时理解

到这里，CLI 已经把自己支持的子命令列表完整挂好了。

### 设计意图

这一段正是 CLI 命令平台化的核心：

- 根入口不自己实现命令
- 根入口负责把命令模块注册进来

## 第十二段：为什么 `WorkspaceServeCommand` 要单独注册

### 代码

```ts
if (Installation.isLocal()) {
  cli = cli.command(WorkspaceServeCommand)
}
```

### 运行时理解

这个命令不是所有环境都开放，只在本地开发环境里注册。

### 设计意图

这体现的是环境分层：

- 某些命令只给开发期用
- 不应该对所有发布环境暴露

## 第十三段：`.fail(...)` 和 `.strict()` 在做什么

### 代码

```ts
cli = cli
  .fail((msg, err) => {
    if (
      msg?.startsWith("Unknown argument") ||
      msg?.startsWith("Not enough non-option arguments") ||
      msg?.startsWith("Invalid values:")
    ) {
      if (err) throw err
      cli.showHelp("log")
    }
    if (err) throw err
    process.exit(1)
  })
  .strict()
```

### TS / JS 语法解释

- `msg?.startsWith(...)`
  - 这里又用到了可选链 `?.`
  - 表示如果 `msg` 本身不存在，就不要继续调 `startsWith`

- `.strict()`
  - 开启严格参数校验

- `.fail((msg, err) => { ... })`
  - 定义参数解析失败时的处理策略

### 运行时理解

这里的策略是：

- 常见参数错误时，把帮助信息顺手打出来
- 如果有真正的错误对象，就继续往外抛
- 最后退出进程

### 设计意图

这说明入口层不仅在做“解析参数”，还在做两层收口：

- 参数合法性收口
- 用户体验收口

## 第十四段：最后的 `try/catch/finally`

### 代码

```ts
try {
  await cli.parse()
} catch (e) {
  let data: Record<string, any> = {}

  if (e instanceof NamedError) {
    const obj = e.toObject()
    Object.assign(data, {
      ...obj.data,
    })
  }

  if (e instanceof Error) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      cause: e.cause?.toString(),
      stack: e.stack,
    })
  }

  if (e instanceof ResolveMessage) {
    Object.assign(data, {
      name: e.name,
      message: e.message,
      code: e.code,
      specifier: e.specifier,
      referrer: e.referrer,
      position: e.position,
      importKind: e.importKind,
    })
  }

  Log.Default.error("fatal", data)

  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    process.stderr.write((e instanceof Error ? e.message : String(e)) + EOL)
  }

  process.exitCode = 1
} finally {
  const exitCode = typeof process.exitCode === "number" ? process.exitCode : undefined
  Telemetry.trackCliExit(exitCode)
  await Telemetry.shutdown()
  await Instance.disposeAll()
  process.exit()
}
```

### TS / JS 语法解释

- `try / catch / finally`
  - `try` 里放可能抛错的主流程
  - `catch` 里处理错误
  - `finally` 里的代码无论是否出错都会执行

- `e instanceof NamedError`
  - 判断错误是不是 `NamedError`

- `Object.assign(data, { ... })`
  - 把额外字段合并进 `data`

- `e.cause?.toString()`
  - 这里再次用到了可选链
  - 如果 `cause` 不存在，就不会报错

- `process.exitCode = 1`
  - 这里只是先设置退出码
  - 不是立刻退出

- `typeof process.exitCode === "number" ? process.exitCode : undefined`
  - 先判断 `exitCode` 是否已经被设置
  - 再把它传给 telemetry

### 运行时理解

这一段是整个 CLI 生命周期的最后收口。

#### `await cli.parse()`

- 这里才真正开始解析并执行命令
- 前面所有 yargs 链式调用都只是“搭壳”

#### `catch (e)`

这里做了 4 层事情：

1. 尝试把不同类型的错误整理成结构化字段
2. 把结构化错误打到日志里
3. 尝试把错误格式化成更适合用户阅读的文本
4. 设置 `process.exitCode = 1`

这里特别值得注意的是：

- 它没有在 `catch` 里直接 `process.exit(1)`
- 因为它还要让 `finally` 里的清理逻辑跑完

#### `finally`

无论命令成功还是失败，这里都会执行：

- 上报 CLI 退出事件
- 关闭 telemetry
- 释放所有 `Instance`
- 最后显式 `process.exit()`

### 设计意图

这说明入口文件不只是“命令注册表”，它还是整个 CLI 生命周期的总调度器：

- 启动前统一初始化
- 执行时统一进入 `cli.parse()`
- 出错时统一格式化和记录
- 结束时统一清理资源

## 第十五段：本课先知道、暂时不展开的 3 个点

### 1. `Global.Path`

在这一课里，我们已经看到：

```ts
const marker = path.join(Global.Path.data, "kilo.db")
```

目前先记住：

- `Global.Path` 提供全局目录约定
- 比如 `data`、`config`、`log` 这些路径

### 2. `Telemetry.init()`

在这一课里，我们已经看到：

```ts
await Telemetry.init({
  dataPath: Global.Path.data,
  version: Installation.VERSION,
  enabled: globalCfg.experimental?.openTelemetry !== false,
})
```

目前先记住：

- 它不是简单开个埋点开关
- 它在初始化一整套 telemetry / tracing 相关基础设施

### 3. `migrateLegacyKiloAuth()`

在这一课里，我们已经看到：

```ts
await migrateLegacyKiloAuth(
  async () => (await Auth.get("kilo")) !== undefined,
  async (auth) => Auth.set("kilo", auth),
)
```

目前先记住：

- 它负责兼容旧版 Kilo CLI 的鉴权数据
- 启动期就会尝试把旧数据迁移到新格式

## 本课结论

到这里，我们已经明确了：

- `index.ts` 是 CLI 的组合根
- 它负责装配命令、日志、遥测、鉴权迁移和进程级兜底处理
- 入口文件最重要的职责不是写业务，而是统一初始化、注册、收口和清理
- `yargs` 这条链是在定义根 CLI 的公共外壳和全局选项
- `middleware` 不只是参数解析钩子，它还承担平台级基础设施初始化
- `.command(...)`、`.fail(...)`、`try/catch/finally` 说明入口文件在编排整个 CLI 生命周期

## 下一步

下一课沿着真实调用链继续往下：

- 先进入 `packages/opencode/src/cli/cmd/serve.ts`
- 看 `ServeCommand` 这个命令对象到底长什么样
