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

- 学习说明在 [README.md](d:/Code/kilocode/Kilo学习/实践/第00课-CLI入口闭环实战/README.md)
- 真正可运行的 demo 在 [index.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts)

这个位置是专门的练习目录：

- 在 `packages` 下，能直接复用 `packages/opencode` 的依赖
- 不放在 `src/` 里，避免和正式源码贴太近
- 后续其他实践也可以继续放在 `packages/opencode/kilocode-practice/`

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

### 这一轮对应第00课的知识点

- `try/catch/finally`
- 结构化错误日志
- 退出前统一清理

## 场景 5：第一次自己改代码，加一个 `bye` 命令

### 目标

练一次“子命令怎么接入根入口”。

### 你要做的事

1. 参考 `hello.ts` 新建一个 `bye.ts`
2. 支持 `--name`
3. 输出 `bye, <name>`
4. 在根入口里把它用 `.command(ByeCommand)` 接进去

### 你做完后的验收

下面命令能跑通就算完成：

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" bye --name qiuyu
```

### 这一步在练什么

- 命令模块化
- `builder`
- `handler`
- 根入口的命令注册

## 场景 6：给根 CLI 增加一个全局选项

### 目标

练一次“根级 option 和子命令 option 的边界”。

### 你要做的事

1. 在根入口增加 `--profile`
2. 让它成为所有命令共享的根级选项
3. 在 `middleware` 里把这个值打印到日志里

### 你做完后的验收

下面两条命令都应该能带上 `--profile`：

```bash
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" hello --name qiuyu --profile dev
bun "packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts" inspect --profile prod
```

### 这一步在练什么

- 根 CLI 配置
- 全局选项和命令内选项的差别
- `middleware` 为什么适合处理共享启动逻辑

## 场景 7：扩展一次启动迁移

### 目标

练一次“为什么启动期迁移适合做成统一钩子”。

### 你要做的事

1. 打开 [migration.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/storage/migration.ts)
2. 给 `steps` 再加一步，比如 `verify`
3. 同时把最终写入的 `db.version` 改成 `2`

### 你做完后的验收

1. 删除 `.runtime`
2. 重跑 `hello`
3. 观察输出里是否多了一步迁移
4. 再跑 `inspect`
5. 看 `db.version` 是否变成 `2`

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

- [index.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/index.ts)
- [hello.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/hello.ts)
- [inspect.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/inspect.ts)
- [explode.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/cli/cmd/explode.ts)
- [log.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/util/log.ts)
- [telemetry/index.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/telemetry/index.ts)
- [migration.ts](d:/Code/kilocode/packages/opencode/kilocode-practice/lesson00-cli-entry/storage/migration.ts)

## 一句话总结

这轮实践不是让你“读懂一个文件”，而是让你亲手把一个 CLI 的启动、初始化、命令执行、错误收口、退出清理完整跑一遍、改一遍、验证一遍。
