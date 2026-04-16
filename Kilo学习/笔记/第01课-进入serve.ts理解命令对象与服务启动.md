# 第01课：进入 serve.ts 理解命令对象与服务启动

## 本课目标

从 `packages/opencode/src/cli/cmd/serve.ts` 开始，搞清楚 4 件事：

1. `ServeCommand` 这种“命令对象”到底是什么
2. `builder` 为什么只管参数，不直接执行业务
3. `handler` 是怎样把配置解析、服务启动、开发辅助、优雅退出串起来的
4. 下一步为什么应该进入 `packages/opencode/src/server/server.ts`

## 本课代码入口

- [serve.ts](../../packages/opencode/src/cli/cmd/serve.ts)
- [cmd.ts](../../packages/opencode/src/cli/cmd/cmd.ts)
- [network.ts](../../packages/opencode/src/cli/network.ts)

## 当前只读哪里

这一课主读 `packages/opencode/src/cli/cmd/serve.ts`。

但因为这里出现了两个很重要的辅助入口：

- `cmd.ts`
- `network.ts`

所以我们会少量跳过去看它们，只看和 `serve.ts` 直接相关的几行，不展开读更多实现。

## 第一段：先看 `serve.ts` 开头，它依赖了哪些层

### 代码

```ts
import { Server } from "../../server/server"
import { cmd } from "./cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "../../flag/flag"
import { Instance } from "../../project/instance"
import { Workspace } from "../../control-plane/workspace"
import { Project } from "../../project/project"
import { Installation } from "../../installation"
```

### TS 语法解释

- `import { Server } from "../../server/server"`
  - 这是命名导入
  - 表示从 `server.ts` 里拿出名为 `Server` 的导出

- `../../server/server`
  - `../` 表示回到上一层目录
  - `../../` 表示回到上两层目录
  - 这是相对路径导入

- `import { withNetworkOptions, resolveNetworkOptions } from "../network"`
  - 一次从同一个模块里导入两个命名导出

### 运行时理解

光看导入区就能看出 `serve.ts` 本身不是底层 HTTP 服务实现，它只是把几层东西串起来：

- 命令层类型包装：`cmd`
- 命令参数层：`withNetworkOptions`、`resolveNetworkOptions`
- 服务层：`Server`
- 工程运行期资源层：`Instance`
- 本地开发辅助层：`Workspace`

### 设计意图

这正是大项目里常见的“命令层协调器”写法。

也就是说，`serve.ts` 的职责不是：

- 自己实现网络监听
- 自己实现 HTTP 路由
- 自己实现 project 同步细节

它的职责是：

- 把这些能力按正确顺序接起来

## 第二段：`ServeCommand` 到底是什么对象

### 代码

```ts
export const ServeCommand = cmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless kilo server",
  handler: async (args) => {
```

辅助代码：

```ts
type WithDoubleDash<T> = T & { "--"?: string[] }

export function cmd<T, U>(input: CommandModule<T, WithDoubleDash<U>>) {
  return input
}
```

### TS 语法解释

- `export const ServeCommand = ...`
  - `const` 表示这是一个常量绑定
  - `export` 表示把它导出给别的文件用

- `cmd({ ... })`
  - 这是“把对象传给函数”
  - 这个对象里有 `command`、`builder`、`describe`、`handler` 等字段

- `type WithDoubleDash<T> = T & { "--"?: string[] }`
  - 这是类型别名
  - `T & X` 表示“交叉类型”，也就是把两种类型合并到一起
  - `{ "--"?: string[] }` 里的 `?` 表示这个字段可选
  - 合起来就是：在原有参数类型基础上，再补一个可选的 `"--"` 字段

- `cmd<T, U>(...)`
  - 这里的 `<T, U>` 是泛型
  - 你现在可以先把它理解成“这个函数不把参数类型写死，而是让调用方把类型带进来”

- `return input`
  - 运行时没有额外包装
  - 它就是原样返回

### 运行时理解

`cmd()` 在运行时几乎什么都没做，真正重要的是它的类型作用：

- 它要求传入的对象符合 `CommandModule`
- 它顺手给命令参数补上 `"--"` 这一类额外字段类型

所以 `ServeCommand` 的本质不是“函数”，而是：

- 一个符合 yargs 规范的命令模块对象

### 设计意图

这里能看到一个很典型的工程思路：

- 运行时逻辑尽量简单
- 类型约束放在辅助函数里
- 每个命令文件只导出一个“命令对象”

这样根入口 `index.ts` 里就可以直接写：

```ts
.command(ServeCommand)
```

也就是说：

- `index.ts` 只负责注册
- `serve.ts` 自己负责描述这个命令

## 第三段：`builder` 为什么只管参数

### 代码

```ts
builder: (yargs) => withNetworkOptions(yargs),
```

辅助代码：

```ts
const options = {
  port: {
    type: "number" as const,
    describe: "port to listen on",
    default: 0,
  },
  hostname: {
    type: "string" as const,
    describe: "hostname to listen on",
    default: "127.0.0.1",
  },
  mdns: {
    type: "boolean" as const,
    describe: "enable mDNS service discovery (defaults hostname to 0.0.0.0)",
    default: false,
  },
  "mdns-domain": {
    type: "string" as const,
    describe: "custom domain name for mDNS service (default: kilo.local)",
    default: "kilo.local",
  },
  cors: {
    type: "string" as const,
    array: true,
    describe: "additional domains to allow for CORS",
    default: [] as string[],
  },
}

export type NetworkOptions = InferredOptionTypes<typeof options>

export function withNetworkOptions<T>(yargs: Argv<T>) {
  return yargs.options(options)
}
```

### TS 语法解释

- `builder: (yargs) => withNetworkOptions(yargs)`
  - 这是箭头函数
  - 含义是：接收 `yargs`，返回加上网络选项后的 `yargs`

- `"mdns-domain"`
  - 对象的 key 可以是带短横线的字符串
  - 这种 key 后面读取时通常要用 `args["mdns-domain"]`，不能写成 `args.mdns-domain`

- `"number" as const`
  - `as const` 会把值尽量收窄成字面量类型
  - 这里不是“任意 string”，而是明确告诉 TS：它就是 `"number"` 这个固定值

- `InferredOptionTypes<typeof options>`
  - `typeof options` 先拿到 `options` 这个对象的类型
  - `InferredOptionTypes<...>` 再根据这些 yargs 选项定义，自动推断出参数对象类型

- `Argv<T>`
  - 表示 yargs 实例的类型
  - `<T>` 表示这个实例当前携带的参数类型

### 运行时理解

`builder` 阶段还没有真正执行 `serve` 命令。

它做的是“声明这条命令支持哪些参数”，比如：

- `--port`
- `--hostname`
- `--mdns`
- `--mdns-domain`
- `--cors`

所以这时候发生的是：

- 参数帮助信息被定义
- 参数类型被定义
- 参数默认值被定义

而不是：

- 服务已经启动

### 设计意图

作者把“参数声明”和“命令执行”拆开，是为了让命令层更清晰：

- `builder` 负责定义输入长什么样
- `handler` 负责定义拿到输入后做什么

这样有几个明显好处：

- help 文档可以自动生成
- 参数校验由 yargs 接管
- `handler` 里不用再手写一大堆默认值逻辑

## 第四段：`handler` 前半段先做了哪几件事

### 代码

```ts
handler: async (args) => {
  if (!Flag.KILO_SERVER_PASSWORD) {
    console.log("Warning: KILO_SERVER_PASSWORD is not set; server is unsecured.")
  }
  const opts = await resolveNetworkOptions(args)
  const server = await Server.listen(opts)
  console.log(`kilo server listening on http://${server.hostname}:${server.port}`)
```

### TS 语法解释

- `handler: async (args) => { ... }`
  - 这是异步箭头函数
  - 说明里面会有 `await`

- `if (!Flag.KILO_SERVER_PASSWORD)`
  - `!` 表示取反
  - 意思是“如果没有配置这个值”

- `const opts = await resolveNetworkOptions(args)`
  - `await` 表示等待 Promise 完成
  - `opts` 会拿到最终整理好的网络配置对象

- `` `http://${server.hostname}:${server.port}` ``
  - 这是模板字符串
  - `${...}` 里可以嵌入表达式

### 运行时理解

这里按顺序做了 4 件事：

1. 检查服务是否缺少密码保护
2. 根据命令行参数和全局配置，算出最终网络配置
3. 调用 `Server.listen(opts)` 真正启动服务
4. 把监听地址打印出来

这里最关键的一点是：

- 真正启动服务的是 `Server.listen(opts)`
- `serve.ts` 只是调用它，不在这里直接写底层监听逻辑

### 设计意图

这一段已经能看出很清楚的分工：

- `serve.ts` 决定调用顺序
- `network.ts` 负责整理配置
- `server.ts` 负责真正监听端口

这就叫“命令层只做装配，不做底层实现”。

## 第五段：`resolveNetworkOptions()` 到底帮我们做了什么

### 代码

```ts
export async function resolveNetworkOptions(args: NetworkOptions) {
  const config = await Config.getGlobal()
  const portExplicitlySet = process.argv.includes("--port")
  const hostnameExplicitlySet = process.argv.includes("--hostname")
  const mdnsExplicitlySet = process.argv.includes("--mdns")
  const mdnsDomainExplicitlySet = process.argv.includes("--mdns-domain")
  const corsExplicitlySet = process.argv.includes("--cors")

  const mdns = mdnsExplicitlySet ? args.mdns : (config?.server?.mdns ?? args.mdns)
  const mdnsDomain = mdnsDomainExplicitlySet ? args["mdns-domain"] : (config?.server?.mdnsDomain ?? args["mdns-domain"])
  const port = portExplicitlySet ? args.port : (config?.server?.port ?? args.port)
  const hostname = hostnameExplicitlySet
    ? args.hostname
    : mdns && !config?.server?.hostname
      ? "0.0.0.0"
      : (config?.server?.hostname ?? args.hostname)
  const configCors = config?.server?.cors ?? []
  const argsCors = Array.isArray(args.cors) ? args.cors : args.cors ? [args.cors] : []
  const cors = [...configCors, ...argsCors]

  return { hostname, port, mdns, mdnsDomain, cors }
}
```

### TS / JS 语法解释

- `config?.server?.mdns`
  - 这是可选链 `?.`
  - 如果前面某一层不存在，就直接返回 `undefined`，不会报错

- `??`
  - 这是空值合并运算符
  - 只有左边是 `null` 或 `undefined` 时，才退到右边

- `condition ? a : b`
  - 这是三元表达式
  - 条件成立取 `a`，否则取 `b`

- `[...configCors, ...argsCors]`
  - 这是展开语法
  - 作用是把两个数组拼成一个新数组

### 运行时理解

这个函数不是简单“把 args 原样传下去”，它在做最终配置决议。

可以把它理解成一条规则链：

1. 先看命令行有没有显式传参
2. 如果命令行没传，再看全局配置
3. 如果全局配置也没有，再退回 builder 里定义的默认值

其中有两个特别值得注意的点。

### 关键点 1：命令行优先级高于全局配置

例如：

- 传了 `--port 3000`，就优先用 `3000`
- 没传 `--port`，才回退到 `config?.server?.port`

这是一种很常见的 CLI 设计：

- 临时运行时，命令行优先
- 长期偏好，放在配置文件

### 关键点 2：开启 mDNS 时，可能自动改 hostname

这里的逻辑是：

```ts
const hostname = hostnameExplicitlySet
  ? args.hostname
  : mdns && !config?.server?.hostname
    ? "0.0.0.0"
    : (config?.server?.hostname ?? args.hostname)
```

意思是：

- 如果用户已经明确传了 `--hostname`，尊重用户
- 如果用户没显式传 hostname，但开了 mDNS，而且配置里也没写 hostname
- 那么默认把 hostname 设成 `0.0.0.0`

这是为了让局域网发现服务这件事更容易成立，而不是只绑在本机回环地址上。

### 设计意图

`resolveNetworkOptions()` 体现了一个很成熟的配置层设计：

- 参数定义在 `builder`
- 配置优先级决议在 `network.ts`
- 业务命令只拿最终结果

这样 `handler` 会干净很多。

## 第六段：为什么启动后还要做 `workspaceSync`

### 代码

```ts
let workspaceSync: Array<ReturnType<typeof Workspace.startSyncing>> = []
if (Installation.isLocal()) {
  workspaceSync = Project.list().map((project) => Workspace.startSyncing(project))
}
```

### TS 语法解释

- `Array<...>`
  - 泛型写法
  - 表示这是一个数组，数组元素类型写在尖括号里

- `typeof Workspace.startSyncing`
  - 这里不是“调用函数”
  - 而是“拿这个函数本身的类型”

- `ReturnType<...>`
  - 这是 TS 内置工具类型
  - 可以取出某个函数返回值的类型

所以：

- `Array<ReturnType<typeof Workspace.startSyncing>>`
  - 意思就是“一个数组，里面装着 `Workspace.startSyncing()` 返回的对象”

### 运行时理解

这段逻辑不是核心服务启动必需的一部分，而是本地开发模式下的附加行为：

- 先准备一个空数组
- 如果当前是本地开发环境
- 就把所有项目列出来
- 给每个项目启动一个 workspace 同步器
- 并把这些同步器保存起来，留到后面统一关停

### 设计意图

这里能明显看出“正式能力”和“开发辅助能力”的分层：

- `Server.listen()` 是正式服务能力
- `Workspace.startSyncing()` 是本地开发辅助能力

所以作者才会加：

```ts
if (Installation.isLocal()) { ... }
```

这样生产环境不会默认带上开发态的附加同步逻辑。

## 第七段：为什么最后要自己挂信号并等待

### 代码

```ts
const abort = new AbortController()
const shutdown = async () => {
  try {
    await Instance.disposeAll()
    await server.stop(true)
    await Promise.all(workspaceSync.map((item) => item.stop()))
  } finally {
    abort.abort()
  }
}
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
process.on("SIGHUP", shutdown)
await new Promise((resolve) => abort.signal.addEventListener("abort", resolve))
```

### TS / JS 语法解释

- `new AbortController()`
  - 创建一个中止控制器
  - 它内部会带一个 `signal`

- `const shutdown = async () => { ... }`
  - 定义一个异步关停函数

- `Promise.all(...)`
  - 并发等待一组 Promise 全部完成

- `process.on("SIGTERM", shutdown)`
  - 给当前进程挂一个信号监听器
  - 收到 `SIGTERM` 时执行 `shutdown`

- `new Promise((resolve) => ...)`
  - 手动创建 Promise
  - 只有 `resolve()` 被调用时它才结束

- `abort.signal.addEventListener("abort", resolve)`
  - 当 `abort.abort()` 被调用时，`resolve` 就会触发

### 运行时理解

这一段是 `serve` 命令之所以能“长期挂着”的关键。

真实执行顺序是：

1. 启动完 server
2. 定义一个统一的 `shutdown()` 函数
3. 给进程挂上 `SIGTERM`、`SIGINT`、`SIGHUP` 三种退出信号
4. 然后停在最后这句 `await new Promise(...)`
5. 只要没收到退出信号，这个 Promise 就不结束，命令就一直活着
6. 一旦收到信号，就执行 `shutdown()`

`shutdown()` 又会按顺序做这些事：

1. 释放所有 `Instance`
2. 停掉 server
3. 并发停掉所有 workspace 同步器
4. 最后调用 `abort.abort()`

而 `abort.abort()` 一发生：

- 最后那个 Promise 就结束
- `handler` 才真正跑完

### 设计意图

这说明 `kilo serve` 和普通短命令不一样。

像：

- `kilo auth login`
- `kilo models`

通常是做完就退出。

但：

- `kilo serve`

是长生命周期命令，所以它必须自己管理：

- 挂起等待
- 信号退出
- 资源清理
- 优雅收口

## 第八段：这课真正读懂了什么

到这里，我们真正搞懂了：

- `ServeCommand` 不是普通函数，而是一个可被 yargs 注册的命令对象
- `cmd()` 主要承担类型约束，不承担复杂运行时逻辑
- `builder` 负责声明参数形状
- `resolveNetworkOptions()` 负责把“命令行参数 + 全局配置 + 默认值”决议成最终配置
- `handler` 负责把警告、配置解析、服务启动、开发辅助、优雅退出串起来
- `serve.ts` 是命令层协调器，不是底层 server 实现

## 仍然没完全展开的点

这一课先知道，但暂时不展开：

- `Server.listen()` 里面究竟怎么创建 HTTP 服务
- `server.stop(true)` 的停止流程具体做了什么
- 为什么 `server.ts` 里会同时出现 Hono、WebSocket、mDNS

## 下一步

下一课沿真实调用链继续往下：

- 进入 [server.ts](../../packages/opencode/src/server/server.ts)
- 重点看 `Server.listen(opts)` 怎样把路由、适配器、监听端口、mDNS 发布和停止逻辑真正接起来

