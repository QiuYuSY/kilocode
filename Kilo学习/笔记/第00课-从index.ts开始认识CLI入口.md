# 第00课：从 index.ts 开始认识 CLI 入口

## 本课目标

从项目真正的入口文件开始，学习 4 件事：

1. 大型 TypeScript CLI 的入口文件长什么样
2. 为什么入口文件主要负责装配，而不是直接写业务
3. 当前 `index.ts` 是怎样把参数、帮助输出、共享初始化、命令注册、错误收口、退出清理串起来的
4. 为什么下一步应该沿真实调用链进入 `serve.ts`

## 本课代码入口

- [index.ts](../../packages/opencode/src/index.ts)

## 当前只读哪里

这一课只精读 `packages/opencode/src/index.ts`。

如果中途提到别的模块，也只是为了帮助理解当前文件在“调用谁”，不展开读具体实现。

## 第一段：入口文件开头为什么几乎全是 `import`

### 代码

```ts
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RunCommand } from "./cli/cmd/run"
import { GenerateCommand } from "./cli/cmd/generate"
import { Log } from "./util/log"
import { ProvidersCommand } from "./cli/cmd/providers"
import { AgentCommand } from "./cli/cmd/agent"
import { UpgradeCommand } from "./cli/cmd/upgrade"
import { UninstallCommand } from "./cli/cmd/uninstall"
import { ModelsCommand } from "./cli/cmd/models"
```

### TS 语法解释

- `import yargs from "yargs"`
  - 这是默认导入
  - 表示从 `yargs` 包里拿默认导出的值

- `import { hideBin } from "yargs/helpers"`
  - 这是命名导入
  - 花括号里的名字必须和对方导出的名字一致

- `import { RunCommand } from "./cli/cmd/run"`
  - 这是相对路径导入
  - `./` 表示“相对当前文件”

### 运行时理解

这一段还没有真正开始执行命令，它在做启动前的依赖装配。

### 设计意图

大型项目的入口文件经常不是“写业务”，而是“拼装系统”。

这里已经能看出 `index.ts` 的角色：

- 不亲自实现所有命令
- 不亲自实现所有基础设施
- 只负责把它们装到同一个启动点上

这就是组合根思路。

## 第二段：入口层最容易看出这个 fork 新加了什么

### 代码

```ts
import { ConfigCommand as ConfigCLICommand } from "./cli/cmd/config"
import { RemoteCommand } from "./cli/cmd/remote"
import { Telemetry } from "@kilocode/kilo-telemetry"
import { Instance } from "./project/instance"
import { migrateLegacyKiloAuth, ENV_FEATURE, ENV_VERSION } from "@kilocode/kilo-gateway"
import { createHelpCommand } from "./kilocode/help-command"
```

### TS 语法解释

- `ConfigCommand as ConfigCLICommand`
  - `as`
  - 这里表示“导入后改个本地名字”
  - 原始导出名是 `ConfigCommand`，在当前文件里用 `ConfigCLICommand`

- `@kilocode/kilo-telemetry`
  - 这不是相对路径
  - 这是 monorepo 里的内部包

- `@kilocode/kilo-gateway`
  - 也是 monorepo 内部包
  - 说明这个仓库不是只有 `packages/opencode`

### 运行时理解

入口文件通常最容易看出：

- 上游原本的能力有哪些
- fork 额外加了哪些平台能力

这里能看到 Kilo 自己接入了：

- telemetry
- 旧鉴权迁移
- 自定义 help 命令
- Kilo 自己的 config / remote 等命令

### 设计意图

入口层就是整个 CLI 的“总装配点”，所以最适合观察：

- 哪些能力属于公共基础设施
- 哪些能力属于 fork 扩展

## 第三段：一启动就先给整个进程打元信息

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
  - 意思是“如果现在这个环境变量还没被设置”

- `isServe ? "unknown" : "cli"`
  - 这是三元表达式
  - 条件成立取前者，否则取后者

### 运行时理解

这段代码发生得很早。

它先给整个进程打两类元信息：

- 当前这次启动来自哪个 feature
- 当前 CLI 版本是什么

而且这里特别区分了：

- 普通 CLI 命令，记成 `cli`
- `serve` 命令，如果外部没传 feature，就记成 `unknown`

### 设计意图

这不是给当前文件自己用的，而是给后面的系统用的，比如：

- gateway 请求头
- telemetry 归因
- feature 统计

也就是说，入口文件先替整个进程准备“元信息”。

## 第四段：进程级错误监听先挂上，但这里只做最基础的兜底

### 代码

```ts
process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: errorMessage(e),
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: errorMessage(e),
  })
})
```

### TS / JS 语法解释

- `process.on(...)`
  - 给当前 Node/Bun 进程注册事件监听

- `errorMessage(e)`
  - 这里不是直接手写 `e instanceof Error ? e.message : ...`
  - 而是统一调用工具函数把错误转成更稳妥的文本

### 运行时理解

这里处理了两类进程级问题：

1. 没被 `catch` 的 Promise 错误
2. 没被捕获的异常

### 设计意图

大型 CLI 很怕一种情况：

- 程序崩了，但没有日志

所以入口层先把最基础的错误兜底监听挂上。

注意这里先不要和 `serve.ts` 里的信号退出混在一起。
这一课只先记住：

- `index.ts` 顶层负责最基本的进程级错误记录

## 第五段：`args` 和 `show()` 在做什么

### 代码

```ts
const args = hideBin(process.argv)

function show(out: string) {
  const text = out.trimStart()
  if (!text.startsWith("opencode ")) {
    process.stderr.write(UI.logo() + EOL + EOL)
    process.stderr.write(text)
    return
  }
  process.stderr.write(out)
}
```

### TS / JS 语法解释

- `hideBin(process.argv)`
  - `process.argv` 是进程启动参数数组
  - `hideBin(...)` 会把 bun/node 自己那部分参数去掉

- `function show(out: string) { ... }`
  - 这是普通函数声明
  - `out: string` 表示参数类型是字符串

- `text.startsWith("opencode ")`
  - 判断字符串是否以某个前缀开头

### 运行时理解

这里做了两件事：

1. 先把真正属于用户的参数取出来，后面交给 yargs
2. 自定义帮助输出的展示方式

`show()` 的逻辑是：

- 如果帮助文本本身不是以 `opencode ` 开头
- 就先补一个 `UI.logo()`
- 再把帮助文本写到 `stderr`

### 设计意图

这说明当前入口文件不只是“注册 help”，还在定制：

- help 最终怎么展示

也就是说：

- 参数解析层和终端展示层在这里接上了

## 第六段：开始创建根 CLI 对象

### 代码

```ts
let cli = yargs(args)
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
  .option("pure", {
    describe: "run without external plugins",
    type: "boolean",
  })
```

### TS / JS 语法解释

- `let cli = ...`
  - 这里用了 `let`
  - 因为后面还会继续给 `cli` 重新赋值

- 链式调用
  - `.help(...).alias(...).version(...)`
  - 每一步都会返回可继续配置的对象，所以可以一直连着写

- `.option("pure", { ... })`
  - 这是在根 CLI 上定义一个全局选项
  - 它不是某个子命令私有的参数

### 逐个理解这些方法

#### `.parserConfiguration({ "populate--": true })`

- 作用：设置解析器行为
- 这里表示把 `--` 后面的参数保留下来

#### `.scriptName("kilo")`

- 作用：指定帮助信息里显示的命令名

#### `.help("help", "show help")`

- 作用：注册 `--help`

#### `.version("version", "show version number", Installation.VERSION)`

- 作用：注册 `--version`
- 真正显示的版本号来自 `Installation.VERSION`

#### `.option("print-logs", ...)`

- 作用：定义根级共享选项

#### `.option("log-level", ...)`

- 作用：再定义一个根级共享选项

#### `.option("pure", ...)`

- 作用：声明一个“纯净模式”开关
- 含义是：本次运行不要加载外部插件

### 运行时理解

到这里为止，CLI 还没真正执行任何具体命令。

它只是在定义：

- 根命令叫什么
- help / version 怎么工作
- 所有命令共享的全局选项有哪些

### 设计意图

这说明 `index.ts` 在做的不是业务执行，而是在搭整个 CLI 的公共外壳。

## 第七段：`middleware` 前半段是所有命令共享的启动前逻辑

### 代码

```ts
.middleware(async (opts) => {
  if (opts.pure) {
    process.env.KILO_PURE = "1"
  }

  await Log.init({
    print: process.argv.includes("--print-logs"),
    dev: Installation.isLocal(),
    level: (() => {
      if (opts.logLevel) return opts.logLevel as Log.Level
      if (Installation.isLocal()) return "DEBUG"
      return "INFO"
    })(),
  })

  Heap.start()

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

- `opts.pure`
  - 这里的 `opts` 就是解析好的根级参数对象

- `(() => { ... })()`
  - 这是立即执行函数
  - 作用是在表达式位置写一段多分支逻辑

- `opts.logLevel as Log.Level`
  - `as`
  - 这是类型断言
  - 这里是在告诉 TypeScript：把这个值按 `Log.Level` 看待

### 运行时理解

这里在每次执行任何 CLI 命令前都会先做这些事：

1. 如果传了 `--pure`，先给进程打上 `KILO_PURE=1`
2. 初始化日志系统
3. 启动 heap 监控
4. 给当前进程打上 `AGENT`、`KILO`、`KILO_PID` 标记
5. 记录一条启动日志

### 设计意图

这是一种“所有命令共享统一启动前逻辑”的设计。

好处是：

- 每个命令不用自己初始化日志
- 进程级标记集中设置
- 启动审计集中记录
- 插件模式、监控模式也能集中控制

## 第八段：`middleware` 后半段在做平台级基础设施初始化

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

## 第九段：数据库迁移检查为什么也放在入口里

### 代码

```ts
const marker = path.join(Global.Path.data, "kilo.db")
if (!(await Filesystem.exists(marker))) {
  const tty = process.stderr.isTTY
  process.stderr.write("Performing one time database migration, may take a few minutes..." + EOL)
  const width = 36
  ...
  try {
    await JsonMigration.run(drizzle({ client: Database.Client().$client }), {
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

- `drizzle({ client: Database.Client().$client })`
  - 这里不是直接把数据库 client 丢进去
  - 而是先用 `drizzle(...)` 包装成迁移逻辑需要的数据库对象

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

## 第十段：`.usage(...)`、`.command(...)` 和自定义 help 命令

### 代码

```ts
.usage("")
.completion("completion", "generate shell completion script")
.command(AcpCommand)
.command(McpCommand)
.command(TuiThreadCommand)
.command(AttachCommand)
.command(RunCommand)
.command(GenerateCommand)
.command(DebugCommand)
.command(ProvidersCommand)
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
.command(ConfigCLICommand)
.command(PluginCommand)
.command(DbCommand)

cli = cli.command(createHelpCommand(() => cli))
```

### 逐个解释

#### `.usage("")`

- 作用：把默认 usage 文本清空
- 也就是说，当前 help 的展示不再主要靠旧式 usage 文本

#### `.completion(...)`

- 作用：注册 shell 自动补全能力

#### `.command(XxxCommand)`

- 作用：注册一个子命令
- 每调用一次，就把一个命令模块接到根 CLI 上

#### `createHelpCommand(() => cli)`

- 这里不是直接传一个现成对象
- 而是先创建一个 help 命令，再把当前 `cli` 传给它

### 运行时理解

到这里，CLI 已经把自己支持的子命令列表挂好了。

而且当前入口层不仅注册了普通 help 选项，还额外注册了：

- 自定义 help 命令

### 设计意图

这一段正是 CLI 命令平台化的核心：

- 根入口不自己实现命令
- 根入口负责把命令模块注册进来
- help 也是一个被接进来的命令能力

## 第十一段：`.fail(...)` 和 `.strict()` 在做什么

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
      cli.showHelp(show)
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

- `cli.showHelp(show)`
  - 表示调用 help 输出
  - 并且把上面定义过的 `show()` 当作输出函数传进去

### 运行时理解

这里的策略是：

- 常见参数错误时，顺手把 help 按自定义方式打出来
- 如果有真正的错误对象，就继续往外抛
- 最后退出进程

### 设计意图

这说明入口层不仅在做“解析参数”，还在做两层收口：

- 参数合法性收口
- 帮助输出体验收口

## 第十二段：为什么 `--help` 走了一条单独的解析分支

### 代码

```ts
try {
  if (args.includes("-h") || args.includes("--help")) {
    await cli.parse(args, (err: Error | undefined, _argv: unknown, out: string) => {
      if (err) throw err
      if (!out) return
      show(out)
    })
  } else {
    await cli.parse()
  }
```

### TS / JS 语法解释

- `args.includes("--help")`
  - 判断参数数组里是否包含某个值

- `await cli.parse(args, callback)`
  - 这里不是最简单的 `await cli.parse()`
  - 而是传入参数和回调，拿到 help 文本后交给 `show()`

- `_argv`
  - 前面的下划线通常表示“这个参数先接着，但当前不打算使用”

### 运行时理解

这里把 help 场景单独拿出来处理了：

- 如果用户显式传了 `-h` 或 `--help`
- 就走 `parse(args, callback)` 这一支
- 把帮助文本交给 `show()` 自定义展示

普通场景才走：

```ts
await cli.parse()
```

### 设计意图

这说明作者不满足于“默认 help 能用就行”，而是希望：

- help 输出也纳入入口层统一编排

这属于 CLI 体验设计的一部分。

## 第十三段：最后的 `catch/finally` 是整个 CLI 生命周期的收口

### 代码

```ts
} catch (e) {
  let data: Record<string, any> = {}
  ...
  Log.Default.error("fatal", data)
  const formatted = FormatError(e)
  if (formatted) UI.error(formatted)
  if (formatted === undefined) {
    UI.error("Unexpected error, check log file at " + Log.file() + " for more details" + EOL)
    process.stderr.write(errorMessage(e) + EOL)
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
  - `try` 里放主流程
  - `catch` 里处理错误
  - `finally` 里的代码无论是否出错都会执行

- `let data: Record<string, any> = {}`
  - `Record<string, any>` 可以先理解成“一个对象，key 是字符串，value 先不严格限制”

- `process.exitCode = 1`
  - 这里只是先设置退出码
  - 不是立刻退出

- `typeof process.exitCode === "number" ? process.exitCode : undefined`
  - 先判断退出码是否真的被设置过
  - 再传给 telemetry

### 运行时理解

这一段是整个 CLI 生命周期的最后收口。

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
- 执行时统一进入解析流程
- 出错时统一格式化和记录
- 结束时统一清理资源

## 第十四段：本课先知道、暂时不展开的 4 个点

### 1. `show()`

目前先记住：

- 它是 help 输出包装器
- 用来控制帮助页最终怎么显示

### 2. `Heap.start()`

目前先记住：

- 它属于启动期公共基础设施
- 不是某个单独命令自己的逻辑

### 3. `migrateLegacyKiloAuth()`

目前先记住：

- 它负责兼容旧版 Kilo CLI 的鉴权数据
- 启动期就会尝试把旧数据迁移到新格式

### 4. `JsonMigration.run(...)`

目前先记住：

- 它不是某个命令里的业务步骤
- 而是启动前的底层存储准备动作

## 本课结论

到这里，我们已经明确了：

- `index.ts` 是 CLI 的组合根
- 它负责装配命令、帮助输出、日志、遥测、鉴权迁移、数据库迁移和退出清理
- 入口文件最重要的职责不是写业务，而是统一初始化、注册、收口和清理
- `yargs` 这条链是在定义根 CLI 的公共外壳和全局选项
- `middleware` 不只是参数解析钩子，它还承担平台级基础设施初始化
- `.command(...)`、`.fail(...)`、`try/catch/finally` 说明入口文件在编排整个 CLI 生命周期

## 下一步

下一课沿着真实调用链继续往下：

- 进入 [serve.ts](../../packages/opencode/src/cli/cmd/serve.ts)
- 看 `ServeCommand` 这个命令对象到底长什么样

