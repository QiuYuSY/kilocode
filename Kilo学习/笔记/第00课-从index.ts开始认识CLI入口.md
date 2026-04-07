# 第00课：从 index.ts 开始认识 CLI 入口

## 本课目标

从项目真正的入口文件开始，学习：

1. TypeScript 入口文件长什么样
2. 为什么大型项目的入口一开始几乎全是 `import`
3. 这个项目怎样把各种命令和基础设施装配成一个 CLI

## 本课代码入口

- [index.ts](../../packages/opencode/src/index.ts)

## 本课学习方式

本课按“代码精读”进行：

- 先看真实代码片段
- 再讲 TS 语法
- 再讲运行时行为
- 最后讲设计意图

## 第一段：入口文件开头的 import 区

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
  - 导入默认导出
  - `yargs` 是一个第三方 CLI 参数解析库

- `import { hideBin } from "yargs/helpers"`
  - 花括号导入，表示导入命名导出
  - `hideBin` 是 `yargs` 提供的辅助函数

- `import { RunCommand } from "./cli/cmd/run"`
  - 从当前项目内部文件导入模块
  - `./` 表示相对当前文件

### 运行时理解

这一段代码本身还没有“执行业务”，它在做启动前的依赖装配。

### 设计意图

这里能看出一个很典型的大型项目设计：

- 入口文件不亲自实现所有命令
- 入口文件只负责“装配”
- 真正的命令逻辑分散在 `./cli/cmd/*`

这叫组合根思路。

也就是：

- 功能在别处实现
- 入口负责把它们拼起来

## 第二段：为什么这里导入了很多 Command

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

- 这个文件是整个 CLI 的总入口
- `serve`、`session`、`mcp`、`auth` 等都是 CLI 的子命令

### 设计意图

这说明这个 CLI 不是单功能工具，而是一个命令平台。

你可以把它想成：

- `kilo`
  - `kilo serve`
  - `kilo session`
  - `kilo auth`
  - `kilo mcp`

入口文件的工作，就是把这些子命令统一注册到同一个命令系统中。

## 第三段：Kilo 自己加的能力也在入口层接入

### 代码

```ts
import { Telemetry } from "@kilocode/kilo-telemetry"
import { Instance } from "./project/instance"
import { migrateLegacyKiloAuth, ENV_FEATURE, ENV_VERSION } from "@kilocode/kilo-gateway"
import { Config } from "./config/config"
import { Auth } from "./auth"
```

### TS 语法解释

- `@kilocode/kilo-telemetry`
  - 这是 workspace 内部包
  - 不是相对路径文件，而是 monorepo 里的一个包

- `@kilocode/kilo-gateway`
  - 也是 monorepo 内部包
  - 说明这个项目不是只有一个 `packages/opencode`

### 设计意图

这一段说明入口文件还承担一个角色：

- 把“Kilo 自己新增的平台能力”接进 upstream CLI

比如：

- telemetry
- gateway
- 旧鉴权迁移

所以入口文件通常最容易看到“这个 fork 到底改了什么”。

## 第四段：进程级错误处理

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
```

### TS / JS 语法解释

- `process.on(...)`
  - 给 Node/Bun 进程注册事件监听

- `e instanceof Error ? e.message : e`
  - 三元表达式
  - 如果 `e` 是 `Error`，取 `message`
  - 否则直接记录原值

### 运行时理解

这段代码在处理：

- 没有被 `catch` 的 Promise 错误
- 没有被捕获的异常

### 设计意图

大型 CLI 很怕“直接崩掉但没日志”。

所以这里先兜底：

- 至少把错误打到日志里
- 方便定位线上或用户现场问题

## 第五段：开始创建 CLI 对象

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
```

### TS / JS 语法解释

- `yargs(hideBin(process.argv))`
  - `process.argv` 是进程启动参数
  - `hideBin(...)` 会把 node/bun 自己那部分参数去掉

- 链式调用
  - `.help(...).alias(...).version(...)`
  - 每一步都返回同一个 CLI 对象，所以可以一直连着写

- `let cli = ...`
  - 这里用 `let`，因为后面还会继续重赋值

### 运行时理解

这一段在定义 CLI 的基础行为：

- 命令名叫 `kilo`
- 帮助信息怎么显示
- 版本号怎么显示

### 设计意图

从这里能看出，这个文件不是在“执行业务命令”，而是在“搭命令行外壳”。

## 第六段：middleware 是启动前总钩子

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
```

### TS 语法解释

- `.middleware(async (opts) => { ... })`
  - 在真正执行具体命令前，先跑这段逻辑

- `async`
  - 表示函数里可以用 `await`

- `(() => { ... })()`
  - 立即执行函数
  - 这里是为了在表达式位置写一段多分支逻辑

### 运行时理解

这里会在每次执行 CLI 命令前：

- 初始化日志
- 判断日志级别
- 设置运行环境

### 设计意图

这是一种“所有命令共享统一启动前逻辑”的设计。

好处是：

- 不用每个命令自己初始化日志
- 公共启动逻辑集中在一个地方

## 第七段：yargs 链式调用里每个方法在干嘛

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

### 逐个解释

#### `yargs(hideBin(process.argv))`

- 作用：创建一个 CLI 解析器对象
- 输入：处理过的命令行参数数组
- 结果：返回一个可以继续链式配置的 `cli` 对象

#### `.parserConfiguration({ "populate--": true })`

- 作用：设置解析器行为
- 这里的 `"populate--": true`` 表示把 `--` 后面的参数保留下来
- 设计意图：某些命令需要把 `--` 后面的内容原样传给子命令或脚本

#### `.scriptName("kilo")`

- 作用：指定 CLI 在帮助信息里显示的脚本名
- 结果：帮助文档里会显示成 `kilo`

#### `.wrap(100)`

- 作用：限制帮助输出的换行宽度
- 结果：终端帮助信息不会一行太长

#### `.help("help", "show help")`

- 作用：注册 `--help`
- 第一参数是这个选项的名字
- 第二参数是帮助说明

#### `.alias("help", "h")`

- 作用：给 `help` 增加别名
- 结果：用户既可以输 `--help`，也可以输 `-h`

#### `.version("version", "show version number", Installation.VERSION)`

- 作用：注册 `--version`
- 最后一个参数是真正显示的版本号
- 这里版本号来自 `Installation.VERSION`

#### `.alias("version", "v")`

- 作用：给 `version` 增加短别名
- 结果：用户可以输 `-v`

#### `.option("print-logs", { ... })`

- 作用：定义一个自定义命令行选项
- `describe`：这个选项在帮助信息里的说明
- `type: "boolean"`：这个选项是布尔值

#### `.option("log-level", { ... })`

- 作用：定义另一个自定义选项
- `type: "string"`：这是字符串选项
- `choices`：限制用户只能输入这几个值

### 设计意图

这一整段链式调用本质上在做两件事：

1. 定义 CLI 的公共外壳行为
2. 定义所有命令共享的全局选项

这也说明：

- 不是每个命令都要单独定义日志级别
- 一些全局能力应该挂在根 CLI 上

## 第八段：`middleware` 后半段在初始化什么

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
  - 这里不是判断“是否为 true”
  - 而是判断“只要不是明确写了 false，就算开启”

- `kiloAuth.type === "oauth" ? kiloAuth.access : kiloAuth.key`
  - 三元表达式
  - 根据鉴权类型选择不同字段

### 运行时理解

这里在做 4 件事：

1. 读取全局配置
2. 初始化 telemetry
3. 尝试把旧版 Kilo CLI 的鉴权迁移到新版格式
4. 如果已经有 Kilo 登录态，就把用户身份同步给 telemetry

### 设计意图

这说明入口层不仅在做“命令行初始化”，还在做“平台级基础设施初始化”。

也就是说：

- 日志
- telemetry
- 鉴权迁移
- 身份归因

这些都被视为每次 CLI 启动都应该先准备好的基础设施。

## 第九段：为什么 `import "./auth"` 可以工作

在 `index.ts` 里写的是：

```ts
import { Auth } from "./auth"
import { Global } from "./global"
```

但我们实际看到的文件是：

- `src/auth/index.ts`
- `src/global/index.ts`

### 这是怎么解析的

在 Node/Bun 的模块解析里：

- 如果导入的是一个目录
- 就会优先去找这个目录下的 `index.ts` 或 `index.js`

所以：

- `./auth` 实际上会解析到 `./auth/index.ts`
- `./global` 实际上会解析到 `./global/index.ts`

### 设计意图

这是一种很常见的大型项目组织方式：

- 一个目录代表一个模块
- `index.ts` 作为该模块的公共入口

这样做的好处是：

- 模块内部可以继续拆很多文件
- 对外导入路径仍然保持简洁

## 第十段：数据库迁移检查为什么放在入口里

### 代码

```ts
const marker = path.join(Global.Path.data, "kilo.db")
if (!(await Filesystem.exists(marker))) {
  await JsonMigration.run(Database.Client().$client, {
    progress: (event) => {
      ...
    },
  })
}
```

### TS / JS 语法解释

- `path.join(...)`
  - 用来安全拼路径

- `!(await Filesystem.exists(marker))`
  - 先等异步结果
  - 再取反
  - 表示“如果文件不存在”

- `progress: (event) => { ... }`
  - 这是把一个回调函数作为参数传进去
  - 迁移过程中会不断调用它来更新进度

### 运行时理解

这段逻辑表示：

- 如果本地数据库文件 `kilo.db` 还不存在
- 说明这是第一次迁移或旧数据尚未转成 sqlite
- 那么就在真正执行命令前先做一次性迁移

### 设计意图

作者不希望把迁移放到某个单独命令里要求用户手动执行，而是：

- 在 CLI 启动时自动兜底
- 保证后续命令运行时，底层存储已经就绪

这是一种“启动期自修复”设计。

## 第十一段：`Global.Path` 是全局目录约定

相关实现见：

- [../packages/opencode/src/global/index.ts](../../packages/opencode/src/global/index.ts)

它定义了：

- `data`
- `cache`
- `config`
- `state`
- `log`
- `bin`

并且模块加载时就会创建这些目录。

### 设计意图

这说明项目把：

- 配置
- 数据
- 状态
- 缓存
- 日志

明确分了层，而不是全部堆在一个目录下。

## 第十二段：`Telemetry.init()` 的真实含义

相关实现见：

- [../../packages/kilo-telemetry/src/telemetry.ts](../../packages/kilo-telemetry/src/telemetry.ts)

它做的事情包括：

- 设置 identity 数据路径
- 读取环境变量覆盖 app 信息
- 初始化客户端
- 决定 telemetry 是否启用
- 初始化 tracer
- 获取机器 ID

### 设计意图

这不是简单的“开个埋点开关”，而是在建立一个完整的观测基础设施。

## 第十三段：`migrateLegacyKiloAuth()` 的真实含义

相关实现见：

- [../../packages/kilo-gateway/src/auth/legacy-migration.ts](../../packages/kilo-gateway/src/auth/legacy-migration.ts)

它会：

- 检查旧版 `~/.kilocode/cli/config.json`
- 提取旧的 Kilo token
- 转成新 auth 结构
- 写入新的 `auth.json`

### 设计意图

这说明入口文件还承担“兼容升级旧用户数据”的职责。

大型项目常见的一种现实就是：

- 不能假设所有用户都是全新安装
- 启动期往往要做兼容迁移

## 第十四段：`index.ts` 里目前还缺哪些要点

对照我们已经讲过的内容，当前这篇笔记还缺下面这些部分：

- `process.on("SIGHUP", ...)` 的作用
- `ENV_FEATURE`、`ENV_VERSION` 相关环境变量初始化
- `middleware` 里设置 `process.env.AGENT/KILO/KILO_PID`
- `Log.Default.info("opencode", ...)` 这一层启动日志
- `.usage(...)`
- `.completion(...)`
- `.command(...)`
- `WorkspaceServeCommand` 只在本地环境注册
- `.fail(...)`
- `.strict()`
- 最后的 `try/catch/finally`

下面把这些内容补齐。

## 第十五段：为什么还要监听 `SIGHUP`

### 代码

```ts
process.on("SIGHUP", () => process.exit())
```

### TS / JS 语法解释

- `process.on("SIGHUP", handler)`
  - 监听进程收到的 `SIGHUP` 信号

- `() => process.exit()`
  - 一个很短的箭头函数
  - 收到信号就直接退出进程

### 运行时理解

如果用户关闭终端页签，或者终端会话断掉，长时间运行的 CLI 进程可能还活着。

这在 `serve` 这种长生命周期命令上尤其危险。

### 设计意图

作者想避免：

- 终端关了
- 但后台还残留一个孤儿 `kilo serve`

所以在入口层直接做了进程级兜底退出。

## 第十六段：`ENV_FEATURE` 和 `ENV_VERSION` 在干嘛

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

### 运行时理解

这段逻辑在启动很早期就给进程环境打标：

- 当前特性来源是什么
- 当前 CLI 版本是什么

### 设计意图

这不是给当前文件自己用的，而是给后续系统用的，比如：

- Kilo Gateway header
- telemetry
- feature attribution

也就是说，入口文件在替整个进程准备“元信息”。

## 第十七段：`middleware` 里设置的进程环境变量

### 代码

```ts
process.env.AGENT = "1"
process.env.KILO = "1"
process.env.KILO_PID = String(process.pid)

Log.Default.info("opencode", {
  version: Installation.VERSION,
  args: process.argv.slice(2),
})
```

### TS / JS 语法解释

- `process.pid`
  - 当前进程 ID

- `String(process.pid)`
  - 把数字转成字符串

- `process.argv.slice(2)`
  - 取命令行参数数组的后半段

### 运行时理解

这里又做了两件事：

1. 给进程打上 Kilo/Agent 标记
2. 打一条启动日志，记录版本和命令参数

### 设计意图

入口文件在做的不是“当前命令自己的打印”，而是整个 CLI 进程的启动审计。

## 第十八段：`.usage(...)`、`.completion(...)`、`.command(...)`

### 代码

```ts
.usage("\\n" + UI.logo())
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

#### `.usage("\\n" + UI.logo())`

- 作用：设置帮助页展示内容
- 这里用了 `UI.logo()`，说明帮助页会显示项目 logo

#### `.completion("completion", "generate shell completion script")`

- 作用：注册 shell 自动补全相关能力
- 让 CLI 可以生成补全脚本

#### `.command(XxxCommand)`

- 作用：注册一个子命令
- 每注册一次，就把一个命令模块接入到根 CLI

### 设计意图

这一段就是 CLI 命令平台化的核心：

- 根入口不自己实现命令
- 根入口负责把各个命令模块注册进来

## 第十九段：为什么 `WorkspaceServeCommand` 单独注册

### 代码

```ts
if (Installation.isLocal()) {
  cli = cli.command(WorkspaceServeCommand)
}
```

### 运行时理解

这个命令不是在所有环境都开放，而是只在本地开发环境里注册。

### 设计意图

这体现了一种环境分层思路：

- 某些命令只给开发阶段用
- 不应该对所有发布环境暴露

## 第二十段：`.fail(...)` 和 `.strict()`

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

### 逐个解释

#### `.strict()`

- 作用：开启严格参数校验
- 不认识的参数、不足的参数、非法值都不能放过

#### `.fail((msg, err) => { ... })`

- 作用：定义解析失败时怎么处理
- 这里的策略是：
  - 常见参数错误时，顺手把帮助信息打出来
  - 真正的错误对象往外抛
  - 最后退出进程

### 设计意图

这说明入口层在做两层工作：

- 参数合法性收口
- 用户体验收口

## 第二十一段：最后的 `try/catch/finally`

### 代码骨架

```ts
try {
  await cli.parse()
} catch (e) {
  ...
} finally {
  ...
}
```

### 运行时理解

#### `await cli.parse()`

- 真正开始解析并执行命令
- 前面所有链式调用都只是“搭壳”

#### `catch`

- 把不同类型的错误整理成结构化信息
- 打日志
- 格式化输出给用户

#### `finally`

- 记录 CLI 退出 telemetry
- 关闭 telemetry
- `Instance.disposeAll()`
- 最终强制 `process.exit()`

### 设计意图

这说明入口文件是 CLI 生命周期总调度器：

- 启动前统一初始化
- 执行时统一解析命令
- 异常时统一收口
- 结束时统一清理资源

## 当前理解到哪里了

到这里我们已经明确了：

- `index.ts` 是 CLI 的组合根
- 它负责装配命令、日志、遥测、鉴权迁移和进程级错误处理
- 入口文件最重要的角色不是写业务，而是统一初始化和注册
- `yargs` 这条链是在定义 CLI 的公共壳层和根级选项
- `middleware` 后半段在做平台级基础设施初始化，而不只是解析参数
- `.command(...)`、`.fail(...)`、`try/catch/finally` 说明入口文件还在编排整个 CLI 生命周期

## 下一步

下一段继续精读：

- `index.ts` 里的命令对象到底长什么样
- 然后再进入第一个真正的命令文件：`serve.ts`
