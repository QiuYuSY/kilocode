# 带读讲义

## 这份带读适合什么时候用

- 你第一次真正读扩展端代码
- 你容易把 extension host、webview、backend 搞混

## 阅读前准备

第一次阅读只抓 3 层：

1. 扩展入口
2. 后端连接
3. webview 承接

## 第 1 步：先看 `packages/kilo-vscode/src/extension.ts`

只看：

- `activate`
- 注册了哪些 provider
- 注册了哪些共享服务

### 停下来回答

- 为什么扩展激活后并不等于立刻执行所有业务？

## 第 2 步：跳到 `server-manager.ts`

只盯：

- CLI binary 路径
- 启动 `kilo serve --port 0`
- 端口捕获
- 销毁逻辑

### 停下来回答

- 为什么这里要自己拉起一个 CLI 后端进程？

## 第 3 步：跳到 `connection-service.ts`

这一步最关键。

只看：

- `connect`
- `doConnect`
- `onEvent`
- `onStateChange`

### 停下来回答

- 为什么要有一个共享连接服务，而不是每个 webview 自己连？

## 第 4 步：最后看 `webview-ui/src/App.tsx`

这一轮不看 UI 细节。

只感受：

- 它如何接消息
- 它如何切 view
- 它如何依赖上层 context

## 第一次阅读先停在哪

你能说清：

- extension host 做什么
- ServerManager 做什么
- ConnectionService 做什么
- webview 做什么

就可以先停。

## 读完后的最小输出

画一张图：

`VS Code extension -> CLI backend -> SDK/SSE -> webview`
