# 带读讲义

## 这份带读适合什么时候用

- 你第一次打开 `packages/opencode/src/server/server.ts`
- 你看到长长的链式调用不知道从哪里下手

## 阅读前准备

先不要看成“很多接口”。

这份文件更适合按 4 层看：

1. 中间件
2. 上下文注入
3. 路由族
4. SSE 事件流

## 第 1 步：只看最上面的中间件链

重点找：

- `onError`
- auth
- request logging
- CORS

### 停下来回答

- 这些中间件是在保护什么？
- 哪些属于安全边界，哪些属于观测能力？

## 第 2 步：找到 `directory` / `workspace` 注入

这一步非常关键。

只盯这一段：

- 从请求中取 `workspace`
- 从请求中取 `directory`
- 通过 `Instance.provide(...)` 建上下文

### 停下来回答

- 为什么后续路由必须依赖这里的注入？

## 第 3 步：只看 `.route(...)`

这一轮不要展开每个路由文件。

先把路由分组：

- project
- session
- provider
- permission
- question
- telemetry
- kilocode

### 停下来回答

- 这些 route 是按什么边界切的？

## 第 4 步：只看 `/event`

这是这一课最关键的点。

只盯：

- `streamSSE`
- `Bus.subscribeAll`
- heartbeat
- abort cleanup

### 停下来回答

- 事件流是怎么和 Bus 连上的？
- 为什么这里需要 heartbeat？

## 第 5 步：最后再随便点开 2 到 3 个 route 文件

建议顺序：

1. `routes/session.ts`
2. `routes/project.ts`
3. `routes/provider.ts`

你这一轮只需要感受：

- route 文件是能力边界的延伸
- 不是所有逻辑都写在 `server.ts`

## 第一次阅读先停在哪

看到：

- 中间件职责
- 上下文注入
- 路由族分组
- `/event` 机制

就可以先停。

## 读完后的最小输出

你至少要能回答：

1. Server 为什么不是普通 CRUD 后端
2. 为什么 `/event` 是核心能力
3. 为什么 `directory` 注入必须在中间件层完成
