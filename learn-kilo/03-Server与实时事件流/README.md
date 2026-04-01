# 03 课：Server 与实时事件流

## 适合谁

- 已经知道 CLI 入口，想理解真正后端中枢的人

## 前置要求

- 完成 02 课

## 预计时长

- 总时长：2.5 到 3.5 小时
- 推荐分 3 次完成

## 你已经学会了什么

- 你已经从 CLI 入口进入到了真实命令系统
- 你知道 `serve` 命令在体系里很特殊

## 这节课新增什么

- 统一后端中枢
- 实时事件流
- 中间件级别的上下文注入

## 完成线

- 最低完成线：知道 Server 负责什么
- 标准完成线：能说清主要路由族和 `/event`
- 深入完成线：能解释为什么 SSE 是核心通信机制

## 难度梯度

1. 观察：认 server.ts 的结构
2. 追链：看主要路由与事件流
3. 解释：认清认证、CORS、directory 注入
4. 思考：比较 SSE 与 polling 的差别

## 源码阅读顺序卡

1. `packages/opencode/src/server/server.ts`
2. 只看中间件链
3. 看 `.route(...)` 注册的路由族
4. 看 `/event`
5. 再去看 `routes/session.ts`、`routes/project.ts`、`routes/provider.ts`

## 必须关注的函数/结构

- `Server.App`
- `basicAuth`
- `cors`
- `Instance.provide(...)` 注入段
- `/event`

## 这课暂时不用深挖

- 每个路由的全部 DTO 细节
- 所有 OpenAPI 描述字段

## 在真实开发中有什么用

- 帮你定位接口问题与事件同步问题
- 帮你理解客户端为什么会收到某些实时更新
- 帮你判断一个功能应该落在 route、中间件还是事件流里

## 常见误区

- 把 Server 看成普通 CRUD API
- 把 SSE 当作锦上添花的通知功能
- 忽略 `directory` 注入对后续所有模块的影响

## 本课结论

Server 不是普通接口集合，而是统一后端能力与实时事件流的中枢。

## 下一课为什么学它

Server 注入了 directory 与 workspace，下一步就该理解这些上下文到底如何变成 Project 与 Instance。
