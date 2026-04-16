# 第01课实践：把 `serve` 命令真正跑起来并观察它怎样挂起与退出

## 这门实践课的定位

这一课不再单独造一个 lesson01 demo，而是直接拿仓库里的真实 `serve` 命令做练习。

目标不是把 `server.ts` 全部读完，而是先亲手看到 4 件事：

- `builder` 定义出来的参数，最终怎样体现在 help 里
- `handler` 怎样先做启动前协调，再真正调用 `Server.listen(...)`
- 为什么 `serve` 启动后不会像普通命令那样立刻退出
- 为什么按 `Ctrl+C` 之后它能优雅收口

做完后，你对第 01 课里“命令对象、参数定义、启动服务、等待退出信号”这几件事会从“源码里看懂了”变成“我亲手跑过了”。

## 实践产物放在哪里

- 学习说明在 [README.md](README.md)
- 本轮直接使用真实源码入口 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts)
- 本轮实际运行的是根 CLI 入口 [index.ts](../../../packages/opencode/src/index.ts)

这轮和第 00 课实践不一样：

- 不新建练习目录
- 不单独造 lesson01 demo
- 直接使用真实仓库里的 `serve` 命令

## 你做完后应该真正掌握什么

完成这轮后，你应该能用自己的话说清楚：

1. 为什么 `serve --help` 里会自动出现 `--port`、`--hostname`、`--mdns`、`--cors`
2. 为什么 `serve.ts` 是命令层协调器，而不是底层 HTTP 实现
3. `resolveNetworkOptions()` 负责什么，`Server.listen()` 又负责什么
4. 为什么 `serve` 会一直挂着
5. `Ctrl+C` 到来后，`shutdown()`、`AbortController`、`server.stop(true)` 是怎样串起来的

## 运行前你只要知道一件事

这轮练习最好开两个终端：

- 终端 A：负责启动 `serve`
- 终端 B：负责发 HTTP 请求观察现象

如果你只开一个终端，也能做，但观察会不够顺手。

## 实践方式

这一轮仍然按“先跑现象，再解释原因，最后回代码验证”的顺序来：

`先运行 -> 再观察 -> 再回答 -> 最后回源码`

你会发现，这种顺序特别适合 `serve` 这种长生命周期命令。

## 场景 1：先用 `--help` 看清 `builder` 到底产出了什么

### 目标

先不启动服务，只观察“命令对象的参数定义”最终长成什么样。

### 执行

```powershell
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --help
```

### 你应该看到什么

- 顶部显示 `kilo serve`
- 描述文本是 `starts a headless kilo server`
- help 里出现这些参数：
  - `--port`
  - `--hostname`
  - `--mdns`
  - `--mdns-domain`
  - `--cors`

### 这一轮你要回答的问题

1. 为什么 `serve` 明明只写了一行 `builder: (yargs) => withNetworkOptions(yargs)`，help 里却已经有完整参数列表了
2. 哪些选项属于根 CLI 共享选项，哪些选项属于 `serve` 自己的选项
3. 为什么 `--mdns-domain` 的默认值能直接显示在 help 里

### 参考答案

建议先自己回答一遍，再对照下面：

1. 因为 `builder` 的职责不是“执行命令”，而是“把这条命令支持的参数声明给 yargs”。`withNetworkOptions(yargs)` 会调用 [network.ts](../../../packages/opencode/src/cli/network.ts) 里的 `yargs.options(options)`，所以 `options` 里定义的字段会自动变成 help 里的参数列表。
2. 根 CLI 共享选项来自 [index.ts](../../../packages/opencode/src/index.ts) 里的 `.option(...)`，比如 `--print-logs`、`--log-level`、`--pure`。`serve` 自己的选项来自 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts) 里的 `builder`，实际定义位置在 [network.ts](../../../packages/opencode/src/cli/network.ts)。
3. 因为默认值就是在 `options` 对象里声明的，yargs 在生成 help 时会把这些默认值一并展示出来。也就是说，参数定义、默认值、help 展示这三件事是同一套声明驱动出来的。

### 这一轮对应第01课的知识点

- `ServeCommand` 是命令对象
- `builder` 只负责参数形状
- yargs 会根据参数声明自动生成 help

## 场景 2：真正把 `serve` 启动起来，再从另一个终端探活

### 目标

把“命令层协调”真正跑成可观察现象。

### 执行

先在终端 A 运行：

```powershell
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --hostname 127.0.0.1 --port 3107 --print-logs
```

再在终端 B 运行：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3107/global/health | Select-Object -ExpandProperty Content
```

你还可以继续在终端 B 再跑一条：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3107/global/config | Select-Object -ExpandProperty Content
```

### 你应该看到什么

终端 A 里通常会看到：

- `Warning: KILO_SERVER_PASSWORD is not set; server is unsecured.`
- `kilo server listening on http://127.0.0.1:3107`
- 如果带了 `--print-logs`，还能看到服务日志和请求日志

终端 B 里通常会看到：

- `/global/health` 返回一段 JSON，里面包含 `healthy: true`
- `/global/config` 返回当前全局配置 JSON

### 这一轮你要回答的问题

1. 为什么安全警告会在“listening”之前出现
2. 为什么你已经能访问 `/global/health`，但这不代表 `serve.ts` 自己实现了 HTTP 路由
3. 在这条链路里，`serve.ts`、`network.ts`、`server.ts` 分别负责什么

### 参考答案

建议先自己回答一遍，再对照下面：

1. 因为 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts) 里的 `handler` 顺序就是：先检查 `Flag.KILO_SERVER_PASSWORD`，然后 `await resolveNetworkOptions(args)`，再 `await Server.listen(opts)`。所以警告一定先于真正监听出现。
2. 因为 `serve.ts` 只负责“把服务启动起来”，并不自己定义 HTTP 路由。真正的 HTTP 路由注册发生在 [server.ts](../../../packages/opencode/src/server/server.ts) 和 [global.ts](../../../packages/opencode/src/server/routes/global.ts) 里。你访问 `/global/health` 看到成功，证明的是“服务层已经起来了”，不是“命令层自己在处理请求”。
3. 分工是这样的：
   - [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts)：命令层协调器，决定启动顺序
   - [network.ts](../../../packages/opencode/src/cli/network.ts)：把 CLI 参数和全局配置决议成最终网络配置
   - [server.ts](../../../packages/opencode/src/server/server.ts)：真正创建 HTTP 服务、注册路由、开始监听端口

### 这一轮对应第01课的知识点

- `handler` 是真正执行业务的地方
- `resolveNetworkOptions()` 负责配置决议
- `Server.listen()` 才是真正启动服务

## 场景 3：只按一次 `Ctrl+C`，观察为什么它不是“直接死掉”

### 目标

把“长生命周期命令为什么需要自己挂信号并等待”这件事看清楚。

### 执行

保持场景 2 的终端 A 仍在运行，然后在终端 A 中直接按：

```text
Ctrl+C
```

### 你应该看到什么

- 终端会回到命令提示符
- `serve` 进程结束
- 终端 B 再访问 `http://127.0.0.1:3107/global/health` 时会失败

### 这一轮你要回答的问题

1. 为什么 `serve` 在打印出 listening 之后不会自动结束
2. 为什么按 `Ctrl+C` 后它能正常退出，而不是只能强杀
3. `AbortController` 在这里到底起了什么作用

### 参考答案

建议先自己回答一遍，再对照下面：

1. 因为 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts) 最后故意停在：

```ts
await new Promise((resolve) => abort.signal.addEventListener("abort", resolve))
```

只要 `abort.abort()` 还没发生，这个 Promise 就不会结束，所以 `handler` 也不会结束，命令就会一直挂着。

2. 因为 `serve.ts` 在 `handler` 里显式挂了：
   - `SIGTERM`
   - `SIGINT`
   - `SIGHUP`

按 `Ctrl+C` 会触发 `SIGINT`，然后执行 `shutdown()`。`shutdown()` 又会：
   - `Instance.disposeAll()`
   - `server.stop(true)`
   - 停掉 `workspaceSync`
   - 最后 `abort.abort()`

所以它不是“被系统硬砍掉”，而是走了一条命令层自己设计好的关停路径。

3. `AbortController` 在这里不是拿来取消网络请求的，而是被当成“让命令继续挂着 / 让命令结束等待”的控制器。平时它让 `serve` 卡在最后那个 Promise 上；收到退出信号后，`abort.abort()` 会把那个 Promise resolve 掉，于是 `handler` 才真正结束。

### 这一轮对应第01课的知识点

- 长生命周期命令和短命令的区别
- 信号监听
- `AbortController` 作为等待/退出开关

## 场景 4：做一个极小的临时修改，亲眼看到 `shutdown()` 真的被执行了

### 目标

不要只靠推理，亲眼看见 `shutdown()` 触发。

### 你要做的事

在你的学习分支里，临时打开 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts)，在 `shutdown` 函数开头加一行：

```ts
process.stderr.write("shutdown start\n")
```

也就是改成接近这样：

```ts
const shutdown = async () => {
  process.stderr.write("shutdown start\n")
  try {
    await Instance.disposeAll()
    await server.stop(true)
    await Promise.all(workspaceSync.map((item) => item.stop()))
  } finally {
    abort.abort()
  }
}
```

然后重新启动一次：

```powershell
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --hostname 127.0.0.1 --port 3108
```

启动后按一次 `Ctrl+C`。

### 你做完后的验收

如果你看到了：

- `shutdown start`

就说明这条信号退出链确实走进了 `shutdown()`，而不是进程直接瞬间消失。

看完后记得把这行临时日志删掉。

### 参考答案

这一步真正想让你确认的是：

1. `Ctrl+C` 触发的不是“神秘退出”，而是 [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts) 里自己注册的 `process.on("SIGINT", shutdown)`。
2. `shutdown()` 才是这条优雅退出链的核心入口。
3. `abort.abort()` 不是提前执行的，而是放在 `finally` 里兜底执行，保证无论前面的清理步骤成功还是失败，最后那个等待中的 Promise 都能被结束。

### 这一步在练什么

- 用最小改动验证源码推断
- 理解 `shutdown()` 是命令层退出主入口
- 理解 `finally` 为什么适合兜底收尾

## 这一轮建议的完成标准

如果你能做到下面 5 件事，这轮实践就算真正完成：

1. 跑通 `serve --help`
2. 真正启动一次 `serve`
3. 用另一个终端访问一次 `/global/health`
4. 自己说清楚 `serve.ts`、`network.ts`、`server.ts` 的分工
5. 自己说清楚为什么按 `Ctrl+C` 后它能优雅退出

## 参考代码入口

- [index.ts](../../../packages/opencode/src/index.ts)
- [serve.ts](../../../packages/opencode/src/cli/cmd/serve.ts)
- [cmd.ts](../../../packages/opencode/src/cli/cmd/cmd.ts)
- [network.ts](../../../packages/opencode/src/cli/network.ts)
- [server.ts](../../../packages/opencode/src/server/server.ts)
- [global.ts](../../../packages/opencode/src/server/routes/global.ts)

## 一句话总结

这轮实践不是让你继续抽象地谈“命令对象”，而是让你亲手把 `serve` 的参数定义、服务启动、挂起等待、信号退出、优雅收口完整跑一遍、看一遍、解释一遍。

