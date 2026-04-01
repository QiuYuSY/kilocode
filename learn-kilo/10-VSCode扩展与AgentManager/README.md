# 10 课：VS Code 扩展与 Agent Manager

## 适合谁

- 已理解核心运行时，想看重要客户端的人

## 前置要求

- 完成 09 课

## 预计时长

- 总时长：3 到 4 小时
- 推荐分 3 次完成

## 你已经学会了什么

- 你已经打通了核心运行时主链路
- 你知道 Agent 和 Tool 如何落到执行系统中

## 这节课新增什么

- VS Code 作为客户端的架构
- extension host / webview / backend 分工
- Agent Manager 的真实定位

## 完成线

- 最低完成线：知道扩展不是后端
- 标准完成线：能解释 `ServerManager` 与 `KiloConnectionService`
- 深入完成线：能解释 Agent Manager 为什么多会话但单后端

## 难度梯度

1. 观察：认 extension 入口
2. 追链：认后端连接
3. 解释：认 extension host / webview 边界
4. 思考：认单后端共享设计的价值

## 源码阅读顺序卡

1. `packages/kilo-vscode/src/extension.ts`
2. `packages/kilo-vscode/src/services/cli-backend/server-manager.ts`
3. `packages/kilo-vscode/src/services/cli-backend/connection-service.ts`
4. `packages/kilo-vscode/src/KiloProvider.ts`
5. `packages/kilo-vscode/webview-ui/src/App.tsx`

## 必须关注的函数/结构

- `activate`
- `ServerManager.getServer`
- `KiloConnectionService.connect`
- `onEvent`
- `onStateChange`

## 这课暂时不用深挖

- 全部 VS Code command 细节
- 全部视觉组件实现

## 在真实开发中有什么用

- 帮你定位扩展连接不上后端的原因
- 帮你判断一个问题属于 extension host 还是 webview
- 帮你理解 Agent Manager 的实现边界

## 常见误区

- 把扩展看成后端主体
- 把 webview 看成完整应用环境
- 以为 Agent Manager 是另一套独立系统

## 本课结论

VS Code 扩展的核心不是 UI，而是它如何稳定地作为客户端连接统一后端。

## 下一课为什么学它

扩展看懂后，下一步该看多个客户端之间共享的桥梁：SDK。
