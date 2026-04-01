# 练习

## 入门练习

整理 `server.ts` 中的主要路由族。

## 追链练习

画出 `/event` 从 Bus 到 SSE 输出的大致流程。

## 真实工程实验题

执行一次本地服务端：

```bash
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --port 4096
```

然后记录：

- 终端输出了什么
- 服务启动后你最先能确认哪些接口存在
- 你在 `server.ts` 里找到了哪些与启动行为对应的代码

## 口头复述任务

脱稿解释：

“为什么这个项目不能只靠普通请求响应，而需要实时事件流？”

## 输出练习

脱稿解释：

为什么这个项目不能只靠普通 HTTP 请求而没有 SSE。

## 参考结构

- Server 做什么
- 中间件做什么
- 路由做什么
- `/event` 做什么
- 客户端为什么需要它
