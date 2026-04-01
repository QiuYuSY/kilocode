# 带读讲义

## 这份带读适合什么时候用

- 你第一次读 `packages/opencode/src/index.ts`
- 你容易被入口文件的大段初始化逻辑吓住
- 你想知道“这一课到底应该看到哪一层就先停”

## 阅读前准备

先不要试图把 `index.ts` 逐行全读懂。

你的目标只有 3 个：

1. 找到程序入口
2. 找到命令注册
3. 找到 `serve` 是怎么接进去的

## 第 1 步：先看 `packages/opencode/src/index.ts`

这一步只做两件事：

- 找 `.command(...)`
- 找 `ServeCommand`

先不要急着看上半部分的所有 import。

### 停下来回答

- 这个入口文件注册了哪些主要命令？
- `serve` 在这些命令中的位置是什么？

## 第 2 步：仍然在 `index.ts`，只看 middleware

重点看：

- 日志初始化
- 环境变量注入
- telemetry 初始化
- migration 逻辑

不要试图理解所有细节，只要回答：

- “这些动作为什么必须放在很早阶段？”

### 停下来回答

- 如果这些初始化不统一放在入口，会发生什么？

## 第 3 步：跳到 `packages/opencode/src/cli/cmd/cmd.ts`

这一步很轻。

你要知道：

- 命令对象是怎么被包装的
- 为什么命令层会有一个统一的轻量包装入口

### 停下来回答

- `cmd(...)` 的角色是什么？

## 第 4 步：跳到 `packages/opencode/src/cli/cmd/serve.ts`

这里是这一课的重点。

只盯 4 件事：

- `Server.listen(...)`
- 打印监听地址
- dev 下 workspace syncing
- signal shutdown

### 停下来回答

- `serve` 命令到底启动了什么？
- 为什么它需要优雅关闭逻辑？

## 第 5 步：回到 `index.ts`，看 finally

这一段很关键，但经常被忽略。

你要看：

- telemetry shutdown
- `Instance.disposeAll()`
- `process.exit()`

### 停下来回答

- 为什么这里宁愿显式退出，也不赌子进程自己结束？

## 第一次阅读先停在哪

看到这里就可以先停。

第一次阅读不需要：

- 追所有命令实现
- 研究每个 env var
- 研究所有异常分支

## 读完后的最小输出

你至少要能写出一段 5 句话总结：

1. 程序入口在哪
2. 命令如何注册
3. `serve` 如何接进来
4. 入口做了哪些全局初始化
5. 为什么 finally 清理重要
