# 带读讲义

## 这份带读适合什么时候用

- 你第一次进入 `session/index.ts`
- 你还分不清 Session、Message、Part 的边界

## 阅读前准备

第一次阅读不要从上到下全看。

先按“数据对象”而不是“业务流程”来读。

## 第 1 步：先找 `Session.Info`

先只看 Session 顶层字段。

问自己：

- 它存了什么
- 它比普通聊天会话多了什么

### 停下来回答

- 这里有哪些字段一眼看出它不是普通聊天记录？

## 第 2 步：看 `create` / `createNext`

理解 Session 是如何创建的。

你这一轮不要追分享、fork、revert 等边缘能力。

### 停下来回答

- Session 创建时就绑定了哪些上下文？

## 第 3 步：找 `updateMessage` / `updatePart`

这是这一课最重要的阅读点。

你要理解：

- message 为什么单独更新
- part 为什么单独更新

### 停下来回答

- 为什么这里不用“一次性覆盖整条消息”？

## 第 4 步：再跳到 `message-v2.ts`

先只感受 part 的种类和结构，不追所有实现。

### 停下来回答

- tool part 与 text part 为什么要分开？

## 第一次阅读先停在哪

你能说清：

- Session 是容器
- Message 是轮次
- Part 是细粒度执行片段

就先停。

## 读完后的最小输出

画一张图：

`Session -> Message -> Part`

并在图旁边写一句：

“如果没有 Part，会少掉哪些表达能力？”
