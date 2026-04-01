# 07 课：SessionProcessor 与执行循环

## 适合谁

- 已经理解 Session 数据模型，想真正看执行过程的人

## 前置要求

- 完成 06 课

## 预计时长

- 总时长：2.5 到 4 小时
- 推荐分 3 次完成

## 你已经学会了什么

- 你已经知道 Session、Message、Part 是如何建模的
- 你知道执行结果为什么会落成细粒度数据

## 这节课新增什么

- 真正的执行循环
- 流式事件处理
- tool 生命周期

## 完成线

- 最低完成线：知道 `SessionProcessor` 是执行循环中枢
- 标准完成线：能追踪一次 tool call 生命周期
- 深入完成线：能解释 retry、patch、summary、compaction 的位置

## 难度梯度

1. 观察：认流式事件类型
2. 追链：追一次执行循环
3. 解释：说明状态如何落到 Session
4. 思考：理解为什么这里必须是事件驱动处理器

## 源码阅读顺序卡

1. `packages/opencode/src/session/processor.ts`
2. 只看 `create(...)`
3. 只看 `process(...)`
4. 按顺序盯 `text-*`、`tool-*`、`finish-step`
5. 再回去看 `Session.updatePart`

## 必须关注的函数/结构

- `SessionProcessor.create`
- `process(...)`
- `tool-call`
- `tool-result`
- `finish-step`

## 这课暂时不用深挖

- 每个 provider 的 token 成本差异细节
- 所有 telemetry 埋点字段

## 在真实开发中有什么用

- 帮你定位一次执行为什么停住、重试、失败或继续
- 帮你理解 tool 状态和 UI 展示的来源
- 帮你在调试 agent 问题时知道从哪里下手

## 常见误区

- 把 `SessionProcessor` 看成简单函数
- 只关注文本输出而忽略 tool 与 patch 事件
- 把 retry / compaction 当成边缘逻辑

## 本课结论

`SessionProcessor` 更像一个流式事件驱动执行器，而不是简单函数调用。

## 下一课为什么学它

执行循环明白后，下一步就该理解谁在驱动它：Agent 模式与权限系统。
