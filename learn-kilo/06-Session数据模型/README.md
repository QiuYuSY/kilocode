# 06 课：Session 数据模型

## 适合谁

- 已经理解配置与上下文，想进入业务核心的人

## 前置要求

- 完成 05 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 到 3 次完成

## 你已经学会了什么

- 你知道上下文如何被识别与隔离
- 你知道配置与存储为什么复杂

## 这节课新增什么

- Session 作为业务核心对象
- Message / Part 拆分
- 会话层数据模型

## 完成线

- 最低完成线：知道 Session、Message、Part 的区别
- 标准完成线：能画出 Session 数据模型图
- 深入完成线：能解释为什么这里不能只用“聊天记录”模型

## 难度梯度

1. 观察：认对象
2. 追链：认相互关系
3. 解释：理解 Part 拆分价值
4. 思考：比较更简单模型的代价

## 源码阅读顺序卡

1. `packages/opencode/src/session/index.ts`
2. 先看 `Info`
3. 看 `create`、`createNext`、`messages`
4. `packages/opencode/src/session/message-v2.ts`

## 必须关注的函数/结构

- `Session.Info`
- `Session.create`
- `Session.createNext`
- `Session.updateMessage`
- `Session.updatePart`

## 这课暂时不用深挖

- 费用计算的所有 provider 特殊分支
- 分享与导出相关边缘能力

## 在真实开发中有什么用

- 帮你定位会话数据相关问题
- 帮你理解 UI 为什么能展示细粒度执行过程
- 帮你知道新字段应该挂在 Session、Message 还是 Part

## 常见误区

- 把 Session 看成普通聊天记录
- 把 Message 和 Part 混为一谈
- 只从 UI 角度看数据模型，不从执行角度看

## 本课结论

Session 在这里不是聊天记录，而是一个任务执行容器的数据模型。

## 下一课为什么学它

数据模型有了，下一课就能顺着它进入真正的执行循环。
