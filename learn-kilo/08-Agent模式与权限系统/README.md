# 08 课：Agent 模式与权限系统

## 适合谁

- 已理解执行循环，想知道行为边界如何确定的人

## 前置要求

- 完成 07 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 到 3 次完成

## 你已经学会了什么

- 你已经知道一次执行如何在 SessionProcessor 中流动
- 你知道系统为什么需要流式事件与状态更新

## 这节课新增什么

- Agent 模式的本质
- permission 规则
- 行为边界

## 完成线

- 最低完成线：能区分几个主要 agent
- 标准完成线：能解释模式差异不只是 prompt
- 深入完成线：能说明 permission 是运行时安全边界

## 难度梯度

1. 观察：认 `code`、`plan`、`ask`、`debug`
2. 追链：看 permission 如何合成
3. 解释：理解模式 = prompt + 权限 + 行为边界
4. 思考：比较完全放开权限的代价

## 源码阅读顺序卡

1. `packages/opencode/src/agent/agent.ts`
2. 先看 `Info`
3. 再看 `state`
4. 重点看 `code`、`plan`、`ask`、`debug`
5. `packages/opencode/src/permission/next.ts`

## 必须关注的函数/结构

- `Agent.Info`
- `state`
- `PermissionNext.fromConfig`
- `PermissionNext.merge`

## 这课暂时不用深挖

- 每个提示词全文
- 所有自定义 agent 的边缘配置字段

## 在真实开发中有什么用

- 帮你理解为什么不同模式表现不同
- 帮你知道一个新模式应该从哪里定义边界
- 帮你定位 permission 相关问题的真实落点

## 常见误区

- 以为 agent 模式只是 prompt 切换
- 把 permission 当成 UI 提示逻辑
- 以为 ask / code 的差异只是“能不能写文件”

## 本课结论

Agent 模式的本质不是“换了个 prompt”，而是“换了一组能力边界和控制规则”。

## 下一课为什么学它

知道模式边界后，下一步自然要看这些模式最终能拿到哪些工具，以及工具如何被编排。
