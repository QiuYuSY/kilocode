# 第01课：进入 serve.ts 理解命令对象与服务启动

## 本课目标

从 `packages/opencode/src/cli/cmd/serve.ts` 开始，搞清楚：

1. `ServeCommand` 这种命令对象到底长什么样
2. `builder` 和 `handler` 分别负责什么
3. `serve` 命令如何启动服务并等待退出信号

## 本课代码入口

- [serve.ts](../../packages/opencode/src/cli/cmd/serve.ts)
- [cmd.ts](../../packages/opencode/src/cli/cmd/cmd.ts)
- [network.ts](../../packages/opencode/src/cli/network.ts)

## 本课学习方式

本课继续按“代码精读”进行：

- 先看真实代码片段
- 再讲 TS 语法
- 再讲运行时行为
- 最后讲设计意图

## 第一段：`ServeCommand` 这个命令对象到底是什么

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
export function cmd<T, U>(input: CommandModule<T, WithDoubleDash<U>>) {
  return input
}
```

### TS 语法解释

- `export const ServeCommand = ...`
  - `const` 表示定义一个常量
  - `export` 表示把这个常量导出，供别的文件导入

- `cmd({ ... })`
  - 这是“把一个对象传给函数”
  - 对象里有 `command`、`builder`、`describe`、`handler` 这些字段

- `builder: (yargs) => withNetworkOptions(yargs)`
  - 这是箭头函数
  - 意思是：收到 `yargs` 这个对象后，再把它交给 `withNetworkOptions`

- `handler: async (args) => { ... }`
  - 这是一个异步箭头函数
  - `args` 是解析好的命令行参数
  - 因为后面要 `await` 异步操作，所以这里必须写 `async`

### 运行时理解

- `cmd()` 在这里几乎没有运行时逻辑，它只是把传进去的对象原样返回
- 真正重要的是它的类型：它要求传入的对象长得像 `yargs` 的 `CommandModule`
- 所以 `ServeCommand` 本质上就是一个“可被 yargs 注册的命令模块对象”

### 设计意图

这里的关键设计是：

- 根入口 `index.ts` 不直接写 `serve` 的逻辑
- `serve.ts` 自己提供一个完整命令对象
- 入口层只负责 `.command(ServeCommand)` 把它接上去

这就是大型 CLI 很常见的“命令模块化”。

## 第二段：`builder` 在做什么

### 代码

```ts
builder: (yargs) => withNetworkOptions(yargs),
```

辅助代码：

```ts
export function withNetworkOptions<T>(yargs: Argv<T>) {
  return yargs.options(options)
}
```

### TS 语法解释

- `Argv<T>`
  - 这里的 `<T>` 是泛型
  - 你可以先把它理解成“yargs 当前持有的一组参数类型”

- `withNetworkOptions<T>(yargs: Argv<T>)`
  - 这是一个泛型函数
  - 它接受一个 yargs 对象，再返回一个加过网络参数的新 yargs 对象

### 运行时理解

`builder` 不是执行命令主体的地方，它是在“定义这个命令支持哪些参数”。

这里给 `serve` 命令挂上了这些网络相关选项：

- `--port`
- `--hostname`
- `--mdns`
- `--mdns-domain`
- `--cors`

所以 `kilo serve --port 3000 --hostname 0.0.0.0` 这种写法，靠的就是这一层配置。

### 设计意图

把“参数定义”和“命令执行”分开，有几个好处：

- help 文档可以自动生成
- 参数校验可以统一交给 yargs
- 真正执行命令时，`handler` 里就不用再手写一堆参数声明

## 第三段：`handler` 前半段在做什么

### 代码

```ts
handler: async (args) => {
  if (!Flag.KILO_SERVER_PASSWORD) {
    console.log("Warning: KILO_SERVER_PASSWORD is not set; server is unsecured.")
  }
  const opts = await resolveNetworkOptions(args)
  const server = Server.listen(opts)
  console.log(`kilo server listening on http://${server.hostname}:${server.port}`)
```

辅助代码：

```ts
export async function resolveNetworkOptions(args: NetworkOptions) {
  const config = await Config.global()
  const portExplicitlySet = process.argv.includes("--port")
  ...
  return { hostname, port, mdns, mdnsDomain, cors }
}
```

### TS 语法解释

- `if (!Flag.KILO_SERVER_PASSWORD)`
  - `!` 是否定
  - 意思是“如果这个值不存在”

- `const opts = await resolveNetworkOptions(args)`
  - `await` 表示等待 Promise 完成
  - `opts` 会拿到最终解析好的网络配置对象

- `` `http://${server.hostname}:${server.port}` ``
  - 这是模板字符串
  - 可以把变量直接嵌进字符串里

### 运行时理解

这一段依次做了 4 件事：

1. 如果没有配置 `KILO_SERVER_PASSWORD`，先打印一个安全警告
2. 调用 `resolveNetworkOptions(args)` 把命令行参数和全局配置合并
3. 调用 `Server.listen(opts)` 真正启动 HTTP 服务
4. 把最终监听地址打印给用户

其中 `resolveNetworkOptions()` 还有一个很重要的规则：

- 如果用户在命令行显式传了 `--port`、`--hostname` 等参数，优先用命令行
- 否则再退回到全局配置

### 设计意图

这里体现了一个很典型的职责分层：

- `serve.ts` 负责“协调流程”
- `network.ts` 负责“整理网络配置”
- `server.ts` 负责“真正启动服务”

也就是说，`serve.ts` 仍然没有直接写底层网络监听细节，它还是一个装配层。

## 第四段：为什么还要有 `workspaceSync`

### 代码

```ts
let workspaceSync: Array<ReturnType<typeof Workspace.startSyncing>> = []
if (Installation.isLocal()) {
  workspaceSync = Project.list().map((project) => Workspace.startSyncing(project))
}
```

辅助代码：

```ts
export function list() {
  return Database.use((db) =>
    db
      .select()
      .from(ProjectTable)
      .all()
      .map((row) => fromRow(row)),
  )
}

export function startSyncing(project: Project.Info) {
  const stop = new AbortController()
  ...
  return {
    async stop() {
      stop.abort()
    },
  }
}
```

### TS 语法解释

- `Array<...>`
  - 这是泛型写法
  - 表示“一个数组，数组里的元素类型是尖括号里的那个类型”

- `ReturnType<typeof Workspace.startSyncing>`
  - `typeof Workspace.startSyncing` 先拿到这个函数的类型
  - `ReturnType<...>` 再取出“这个函数返回值的类型”
  - 合起来就是：`workspaceSync` 是一个数组，数组里装的是 `Workspace.startSyncing()` 返回的那些对象

### 运行时理解

- 默认先准备一个空数组
- 如果当前是本地开发环境，就把所有 project 枚举出来
- 对每个 project 启动一个 workspace 同步器
- 每个同步器都会返回一个带 `stop()` 方法的控制对象

所以这里保存 `workspaceSync`，不是为了立刻使用，而是为了后面关停时统一停掉。

### 设计意图

这里能看出作者把“开发辅助能力”和“正式服务能力”分开了：

- `Server.listen()` 是核心服务能力
- `Workspace.startSyncing()` 是本地开发才需要的辅助能力

这样发布环境不会默认带上开发期的附加行为。

## 第五段：为什么最后要自己挂信号并等待

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

- `const shutdown = async () => { ... }`
  - 定义一个异步函数，专门负责关停

- `Promise.all(...)`
  - 表示并发等待一组 Promise 全部完成
  - 这里是在并发停止所有 workspace 同步器

- `process.on("SIGTERM", shutdown)`
  - 给当前 Node/Bun 进程注册信号监听器
  - 收到系统信号时，就执行 `shutdown`

- `new Promise((resolve) => ...)`
  - 这是“手动创建一个 Promise”
  - 只有当 `resolve()` 被调用时，这个 Promise 才会结束

- `abort.signal.addEventListener("abort", resolve)`
  - 给 `AbortController` 的 signal 挂一个事件监听
  - 当执行 `abort.abort()` 时，这个 Promise 就会被 resolve

### 运行时理解

这一段的真实执行顺序是：

1. 创建一个 `AbortController`
2. 定义 `shutdown()` 关停函数
3. 给进程注册 `SIGTERM`、`SIGINT`、`SIGHUP` 三种退出信号
4. 命令随后停在最后这句 `await new Promise(...)`
5. 只要进程还没收到退出信号，这个 Promise 就一直不结束，`serve` 命令也就一直活着
6. 一旦收到信号，执行 `shutdown()`：
   - 释放所有 project 实例
   - 停掉 HTTP server
   - 停掉所有 workspace sync
   - 最后 `abort.abort()` 让等待中的 Promise 结束
7. `handler` 才真正执行完

### 设计意图

这是长生命周期命令和普通短命令最大的区别。

像 `kilo auth login` 这种命令：

- 做完就结束

但 `kilo serve` 这种命令：

- 启动后要一直挂着
- 直到用户或系统发出退出信号

所以它必须自己管理：

- 生命周期
- 资源清理
- 优雅退出

## 第六段：这段代码和下一步调用链怎么连起来

### 关键代码

```ts
const server = Server.listen(opts)
```

`Server.listen()` 的定义在 `packages/opencode/src/server/server.ts` 里。

目前我们已经知道：

- 它接收 `{ hostname, port, mdns, mdnsDomain, cors }`
- 它内部调用 `Bun.serve(...)`
- 它最后返回 `server`

这说明下一步要进入的真实主链就是：

`serve.ts` -> `Server.listen(opts)` -> `server.ts`

## 本课结论

这一课我们真正搞懂了：

- `ServeCommand` 本质上是一个 yargs 命令对象
- `cmd()` 在这里主要是类型封装，不是复杂运行时逻辑
- `builder` 负责声明这个命令有哪些参数
- `handler` 负责真正执行“启动服务”这件事
- `serve.ts` 不是底层 server 实现，而是命令层调度器
- 长生命周期命令必须自己处理信号、清理和退出

## 仍然没完全展开的点

- `Server.listen()` 里面到底怎样组装 HTTP server
- `App().fetch`、`websocket`、mDNS 发布这些细节
- workspace 同步循环内部到底如何工作

## 下一步

下一轮从这里继续：

- `packages/opencode/src/server/server.ts` 中的 `Server.listen()`
- 重点看它怎样把 Hono/Bun server 真正启动起来
