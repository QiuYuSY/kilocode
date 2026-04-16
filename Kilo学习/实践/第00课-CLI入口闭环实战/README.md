# 第00课实践：把一个 CLI 入口真正跑成完整生命周期

## 这门实践课的定位

这不是“源码阅读课”，而是一门小型闭环实践课。

目标不是让你把代码逐行背下来，而是让你亲手跑出一个最小但完整的 CLI 生命周期：

- 启动
- 根级参数解析
- 共享初始化
- 子命令执行
- 参数错误收口
- 业务异常收口
- 退出清理

做完后，你对第00课里这些概念会从“看懂了”变成“我亲手跑过了”。

## 实践产物放在哪里

- 学习说明在 [README.md](README.md)
- 真正可运行的 demo 在 [index.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts)

这个位置是专门的练习目录：

- 在 `packages` 下，能直接复用 `packages/opencode` 的依赖
- 不放在 `src/` 里，避免和正式源码贴太近
- 后续其他实践也可以继续放在 `packages/opencode/kilocode-practice/`

## 使用说明

这份实践 README 对应的是“可反复使用的练习目录”，不保证你的工作区永远处在“初始未完成状态”。

也就是说，像下面这些内容：

- `bye` 命令
- 根级 `--profile`

如果你之前已经做过，它们现在就可能已经存在于 demo 代码里。

遇到这种情况，不要把它理解成“文档错了”，而要理解成：

- 这道题你已经做过一轮了
- 现在可以把它当成复盘题、验收题、讲解题

具体做法可以选一种：

1. 直接阅读当前实现，再用自己的话解释它为什么这样接到根入口
2. 如果你想重新练一遍，再把它临时删掉后重做
3. 如果你不想改回旧状态，就把同类练习换个名字再做一次，比如把 `bye` 换成 `welcome`

## 这份 demo 和真实仓库源码的关系

这个实践 demo 的目标是教学闭环，不是 1:1 复刻当前 `packages/opencode/src/index.ts`。

所以它和真实源码的关系是：

- 核心结构对齐
- 细节实现允许简化

目前它和真实仓库已经对齐的重点是：

- 根入口装配思路
- `middleware` 统一初始化
- `.command(...)` 命令注册
- `.strict()` / `.fail(...)` 参数错误收口
- `try/catch/finally` 最终收口
- 启动期迁移
- telemetry 与退出清理

但它和当前真实源码也有一些刻意保留的差异，比如：

- demo 里仍保留了 `process.on("SIGHUP", ...)` 这一类更直观的入口兜底写法
- demo 里仍使用 `.usage("\n" + UI.logo())`
- demo 还没有完全复刻真实源码里的 `show()` 帮助输出包装
- demo 没有引入真实源码中的 `--pure`、`Heap.start()` 等额外细节

所以学习时请把它理解成：

- 一份为了看清“入口编排模式”而简化过的练习工程

## 你做完后应该真正掌握什么

完成这轮后，你应该能用自己的话说清楚：

1. 为什么入口文件一开始几乎全是 `import`
2. 为什么 `index.ts` 主要负责装配，而不是写业务
3. `yargs(...).option(...).middleware(...).command(...)` 这条链分别在定义什么
4. 为什么日志、telemetry、迁移这些要放在启动期统一做
5. `.strict()`、`.fail(...)`、`try/catch/finally` 分别收哪一层问题

## 运行前你只要知道一件事

这次的 demo 不是为了做复杂功能，而是为了练“入口编排”。

所以它的命令很小，但结构故意完整：

- `hello`：正常命令路径
- `inspect`：查看启动期产物
- `explode`：故意触发异常收口

## 实践方式

这一轮建议按这个节奏做：

1. 先跑，不急着读代码
2. 先观察现象，再猜原因
3. 最后回到代码里对照

也就是说，这轮的顺序是：

`先运行 -> 再观察 -> 再解释 -> 最后看代码验证`

## 场景 1：跑通一条正常 CLI 启动链

### 目标

先把“入口 + middleware + 命令执行 + 退出清理”这一条主链跑通。

### 执行

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" hello --name qiuyu --print-logs
```

### 你应该看到什么

- `hello, qiuyu`
- `feature=cli`
- `pid=...`
- `logs=ready`
- `boot` 日志
- `auth.migrated`
- demo migration 进度
- `cleanup` 日志

### 这一轮你要回答的问题

1. 为什么 `hello` 命令执行前，公共初始化已经先跑了
2. 为什么 `pid` 能在 `hello` 命令里直接读到
3. 为什么退出时还有 `cleanup`

### 参考答案

建议先自己回答一遍，再对照下面：

1. 因为根入口在 `index.ts` 里注册了 `middleware`，`await cli.parse()` 后会先执行这段共享启动逻辑，再进入 `hello` 的 `handler`。所以 `Log.init`、`Telemetry.init`、auth 迁移、demo migration 都已经先完成了。
2. 因为 `middleware` 里提前写了 `process.env.LESSON00_PID = String(process.pid)`，而 `hello.ts` 里的 `handler` 还是同一个进程，直接读同一个 `process.env` 就能拿到。
3. 因为 `middleware` 里通过 `Instance.add(...)` 注册了清理动作，最后无论命令成功还是失败，`finally` 都会执行 `Instance.disposeAll()`，所以退出前还会看到 `cleanup` 日志。

### 这一轮对应第00课的知识点

- 入口文件只做装配
- `middleware` 是共享启动前逻辑
- `try/finally` 负责统一收口

## 场景 2：看启动期到底生成了什么

### 目标

把“初始化不是抽象概念，而是会真的落盘”这件事看见。

### 执行

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" inspect
```

### 你应该看到什么

命令会打印一个 JSON，其中包含：

- `.runtime` 目录位置
- `auth.json`
- `demo-db.json`
- 当前读取到的 auth 内容
- 当前读取到的 demo 数据库内容

### 这一轮你要回答的问题

1. 旧 auth 是从哪里迁移来的
2. `demo-db.json` 是什么时候生成的
3. 为什么这些初始化不放在 `hello` 命令自己里面做

### 参考答案

建议先自己回答一遍，再对照下面：

1. 旧 auth 是从 `fixtures/legacy-auth.json` 迁过来的。`migrateLegacyAuth()` 会读取这个旧文件，再把内容转成新格式写到 `.runtime/auth.json`。
2. `demo-db.json` 是启动期生成的，不是 `inspect` 命令现建的。根入口的 `middleware` 会先检查 `Migration.exists()`，如果数据库文件还不存在，就执行 `Migration.run()`，最后把最小 demo 数据库写到 `.runtime/demo-db.json`。
3. 因为这不是 `hello` 独有的前置条件，而是所有命令共享的基础设施。把它们统一放在入口层，`hello`、`inspect`、后面新增的命令都能直接复用，也避免每个命令各自处理迁移和兼容逻辑。

### 这一轮对应第00课的知识点

- 启动期迁移
- 全局目录约定
- 入口层统一准备基础设施

## 场景 3：专门观察参数错误收口

### 目标

把 `.strict()` 和 `.fail(...)` 的职责分开看清楚。

### 执行

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" inspect --bad
```

### 你应该看到什么

- 当前命令的 help
- `Unknown argument: bad`

### 这一轮你要回答的问题

1. 是谁发现了 `--bad` 这个参数不合法
2. 是谁决定把 help 打出来
3. 如果没有 `.fail(...)`，用户体验会差在哪里

### 参考答案

建议先自己回答一遍，再对照下面：

1. 是 `yargs` 的 `.strict()` 发现了 `--bad` 不合法。它负责做严格参数校验，未知参数会在这里被拦下来。
2. 是根入口里自定义的 `.fail((msg, err) => { ... })` 决定先把当前命令的 help 打出来，再把错误信息输出到终端。
3. 如果没有 `.fail(...)`，用户通常只能看到一条参数错误，而看不到就地的 help，得自己回头查命令用法。这样错误虽然被发现了，但收口不友好，用户很难立刻知道下一步该怎么改。

### 这一轮对应第00课的知识点

- `.strict()` 负责严格校验
- `.fail(...)` 负责失败时的用户体验收口

## 场景 4：专门观察业务异常收口

### 目标

把 `catch` 和 `finally` 的职责真正分开。

### 执行

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" explode
```

### 你应该看到什么

- `[DemoExplode] Intentional demo error`

如果你继续看日志文件，还会看到：

- `demo.log` 里有 `fatal`
- `telemetry.log` 里有 `cli.exit` 和 `shutdown`

### 建议你再执行

```bash
Get-Content "packages/opencode/kilocode-practice/lesson00-cli-entry/.runtime/demo.log"
Get-Content "packages/opencode/kilocode-practice/lesson00-cli-entry/.runtime/telemetry.log"
```

### 这一轮你要回答的问题

1. 为什么 `catch` 里不直接 `process.exit(1)`
2. 为什么只先设置 `process.exitCode = 1`
3. 为什么 `finally` 一定要跑

### 参考答案

建议先自己回答一遍，再对照下面：

1. 因为如果在 `catch` 里直接 `process.exit(1)`，进程会立刻结束，后面的统一清理很可能来不及执行。那样 `Telemetry.trackCliExit()`、`Telemetry.shutdown()`、`Instance.disposeAll()` 这一整套退出动作就会被跳过。
2. 先设置 `process.exitCode = 1`，等于先把“本次执行失败”这个结果记下来，但控制流仍然继续往下走，让 `finally` 还有机会把日志、telemetry 和清理动作完整跑完。
3. 因为 `finally` 是整个 CLI 生命周期最后的统一收口点。成功时它要跑，失败时它更要跑；不然退出行为会依赖命令路径是否报错，整个入口就不再完整闭环了。

### 这一轮对应第00课的知识点

- `try/catch/finally`
- 结构化错误日志
- 退出前统一清理

## 场景 5：回顾练习，给根入口接入一个 `bye` 命令

### 目标

练一次“子命令怎么接入根入口”。

### 你要做的事

如果你的当前目录里还没有 `bye`，就按下面步骤新做一遍：

1. 参考 `hello.ts` 新建一个 `bye.ts`
2. 支持 `--name`
3. 输出 `bye, <name>`
4. 在根入口里把它用 `.command(ByeCommand)` 接进去

如果你的当前目录里已经有 `bye`，这题就改成复盘：

1. 打开 [bye.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/bye.ts)
2. 找到根入口里 `.command(ByeCommand)` 的注册位置
3. 用自己的话解释：`builder`、`handler`、根入口注册分别负责什么
4. 如果你还想再做一遍，就改成新增一个同类型命令，比如 `welcome`

### 你做完后的验收

下面命令能跑通，或者你能清楚讲出它是怎样接进根入口的，都算完成：

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" bye --name qiuyu
```

### 这一步在练什么

- 命令模块化
- `builder`
- `handler`
- 根入口的命令注册

## 场景 6：回顾练习，给根 CLI 增加一个全局选项

### 目标

练一次“根级 option 和子命令 option 的边界”。

### 你要做的事

如果你的当前目录里还没有 `--profile`，就按下面步骤新做一遍：

1. 在根入口增加 `--profile`
2. 让它成为所有命令共享的根级选项
3. 在 `middleware` 里把这个值打印到日志里

如果你的当前目录里已经有 `--profile`，这题就改成复盘：

1. 找到根入口里 `.option("profile", { ... })`
2. 找到 `middleware` 里记录 `profile` 的日志位置
3. 用自己的话解释：为什么它必须定义在根入口，而不是定义在 `hello.ts` 里
4. 如果你还想再做一遍，就换一个根级选项名，比如 `--mode`

### 你做完后的验收

下面两条命令都应该能带上 `--profile`，或者你能清楚解释它为什么属于“根级选项”，都算完成：

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" hello --name qiuyu --profile dev
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" inspect --profile prod
```

### 参考答案

做完后，代码应该接近下面这个思路：

1. 在根入口上加 `.option("profile", { ... })`，而不是加到 `hello.ts` 或 `inspect.ts` 里。因为场景 6 练的是“根级选项”，目标就是让所有命令都天然共享它。
2. 在 `middleware` 里读 `opts.profile`，并且在 `Log.init(...)` 之后用日志系统记录它，比如 `Log.Default.info("profile", { profile: opts.profile })`。
3. 不要直接用 `console.log` 打 `profile`。因为 `console.log` 会污染标准输出，像 `inspect` 这种本来应该只输出 JSON 的命令就会被破坏。

你做完后的正确现象应该是：

- `hello --profile dev` 能正常执行
- `inspect --profile prod` 能正常执行
- `demo.log` 里能看到一条带 `profile` 的日志
- `inspect` 的标准输出依然保持纯 JSON

### 这一步在练什么

- 根 CLI 配置
- 全局选项和命令内选项的差别
- `middleware` 为什么适合处理共享启动逻辑

## 场景 6.5：可选加练，让 demo 更贴近真实仓库

### 目标

如果你已经完成过前面的基础练习，可以选做一题，把这个 demo 再往真实仓库靠近一点。

### 你要做的事

下面两个方向任选一个：

1. 给 demo 增加一个根级 `--pure` 选项，并在 `middleware` 里把它写进环境变量
2. 给 demo 增加一个 `show()` 帮助输出包装函数，把 help 输出方式做成和真实入口更像

### 你做完后的验收

任选其一满足即可：

1. `hello --pure` 能跑通，而且命令里能观察到对应环境变量
2. `--help` 或参数错误时，帮助输出展示方式发生了你预期的变化

### 这一步在练什么

- 把练习工程和真实仓库主线继续对齐
- 观察“入口编排模式”和“具体产品细节”之间的关系

## 场景 7：扩展一次启动迁移

### 目标

练一次“为什么启动期迁移适合做成统一钩子”。

### 你要做的事

1. 打开 [migration.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/storage/migration.ts)
2. 给 `steps` 再加一步，比如 `verify`
3. 同时把最终写入的 `db.version` 改成 `2`

### 你做完后的验收

1. 删除 `.runtime`
2. 重跑 `hello`
3. 观察输出里是否多了一步迁移
4. 再跑 `inspect`
5. 看 `db.version` 是否变成 `2`

### 参考答案

做完后，代码应该接近下面这个思路：

1. 打开 `storage/migration.ts`，把 `steps` 从 `["scan", "copy", "finalize"]` 改成 `["scan", "copy", "verify", "finalize"]`。
2. 把最终写入数据库的 `version` 从 `1` 改成 `2`。
3. 改完后一定要先删掉 `.runtime`。因为根入口会先检查 `Migration.exists()`；只要旧的 `demo-db.json` 还在，迁移就不会重新跑。

你做完后的正确现象应该是：

- 第一次重跑 `hello` 时，会重新出现启动迁移
- 终端里会看到 `migration 1/4 scan`、`migration 2/4 copy`、`migration 3/4 verify`、`migration 4/4 finalize`
- 再跑 `inspect` 时，输出里的 `db.version` 会变成 `2`

这一步真正想让你理解的是：

- 入口层负责“什么时候跑迁移、怎么显示进度”
- 迁移模块负责“迁移有哪些步骤、最终写出什么数据”
- 所以新增一步迁移时，通常只改迁移模块，不用改每个命令

### 这一步在练什么

- 启动期迁移
- 回调进度更新
- 为什么入口层适合兜住这些一次性准备工作

## 场景 8：自己制造一次未格式化错误

### 目标

把“格式化错误”和“兜底错误”区别开来。

### 你要做的事

1. 在 `explode.ts` 里临时把 `NamedError` 改成普通 `new Error("plain boom")`
2. 再跑一遍 `explode`

### 你要观察什么

- 终端输出是否变化
- `FormatError` 是否还能识别
- `demo.log` 里记录的结构化字段有什么差别

### 参考答案

做完后，代码应该接近下面这个思路：

1. 先把 `explode.ts` 里的 `throw new NamedError(...)` 临时改成 `throw new Error("plain boom")`。
2. 再跑一遍 `explode`，观察终端输出和 `demo.log`。
3. 看完后记得把代码改回 `NamedError`，因为这个场景的重点是对比，不是永久改成普通错误。

你做完后的正确现象应该是：

- 终端输出会从 `[DemoExplode] Intentional demo error` 变成更普通的 `plain boom`
- `FormatError` 依然能识别这是一个 `Error`，所以还能给用户输出错误消息
- 但它不再有 `NamedError` 的名字和附加数据，所以显示信息会更“平”
- `demo.log` 里原本来自 `NamedError.toObject()` 的 `tip` 等结构化字段会消失，只会剩下普通 `Error` 的 `name`、`message`、`stack`

这一步真正想让你理解的是：

- `NamedError` 适合承载“给用户看的名字”和“给日志系统的结构化数据”
- 普通 `Error` 也能被兜底处理，但表达力更弱
- 所以 `catch` 里的错误整理其实分成两层：一层给用户显示，一层给日志保留细节

### 这一步在练什么

- `catch` 里的错误整理
- “用户看到的错误”和“日志里的错误”是两层东西

## 这一轮建议的完成标准

如果你能做到下面 5 件事，这轮实践就算真正完成：

1. 跑通 `hello`、`inspect`、`inspect --bad`、`explode`
2. 自己说清楚 `middleware` 为什么会先于命令执行
3. 自己新增一个 `bye` 命令
4. 自己新增一个根级全局选项
5. 自己扩展一次启动迁移

## 参考代码入口

- [index.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts)
- [hello.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/hello.ts)
- [inspect.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/inspect.ts)
- [explode.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/explode.ts)
- [log.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/util/log.ts)
- [telemetry/index.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/telemetry/index.ts)
- [migration.ts](../../../packages/opencode/kilocode-practice/lesson00-cli-entry/storage/migration.ts)

## 一句话总结

这轮实践不是让你“读懂一个文件”，而是让你亲手把一个 CLI 的启动、初始化、命令执行、错误收口、退出清理完整跑一遍、改一遍、验证一遍。
