# 项目地图

这份地图的作用，是先帮你建立全局视角。

当前仓库不是一个单体应用，而是一个以 `packages/opencode/` 为核心的 monorepo。很多产品其实都只是这个核心的不同客户端。

## 一句话理解整个仓库

`packages/opencode/` 是核心运行时与服务端。

其他产品大多只是不同形态的客户端：

- CLI 终端界面直接跑在 `packages/opencode/`
- VS Code 扩展在 `packages/kilo-vscode/`，但背后仍然启动 `kilo serve`
- Web 与 Desktop 复用 `packages/app/` 这套前端，再去连接 `kilo serve`
- `packages/sdk/js/` 是所有客户端调用服务端 API 的桥梁

## 顶层目录怎么理解

- `packages/`
  绝大多数业务代码都在这里
- `script/`
  仓库级脚本
- `patches/`
  对第三方依赖的补丁
- `specs/`
  一些规格和说明
- `sdks/`
  部分外部 SDK 或相关资源
- `.github/`
  CI、工作流、仓库自动化

## 你最该先认识的包

### 第一优先级

- `packages/opencode/`
  核心 CLI、Agent 运行时、Session、Tool、Server、Provider、Storage 都在这里
- `packages/kilo-vscode/`
  VS Code 扩展，最适合理解“客户端如何连接核心服务”
- `packages/sdk/js/`
  自动生成的 SDK，连接客户端和服务端 API

### 第二优先级

- `packages/kilo-gateway/`
  Kilo 的鉴权、Kilo API、Provider 路由、组织模式等能力
- `packages/kilo-telemetry/`
  遥测与 OpenTelemetry
- `packages/kilo-ui/`
  Kilo 的 Solid UI 组件库
- `packages/app/`
  Web / Desktop 共享前端

### 第三优先级

- `packages/desktop/`
  Tauri 桌面壳
- `packages/ui/`
  upstream 的共享 UI 库，体量大，先不要深挖
- `packages/util/`
  通用工具
- `packages/plugin/`
  插件与工具接口定义
- `packages/kilo-docs/`
  文档站

## 真实产品关系

### 1. CLI / TUI

入口：

- `packages/opencode/src/index.ts`

主链路：

- `index.ts`
- `cli/cmd/*.ts`
- `server/server.ts`
- `session/`
- `agent/`
- `tool/`
- `provider/`
- `storage/`

### 2. VS Code 扩展

入口：

- `packages/kilo-vscode/src/extension.ts`

主链路：

- 扩展激活
- `KiloConnectionService`
- `ServerManager`
- 拉起 `bin/kilo serve --port 0`
- 通过 `@kilocode/sdk` 调用 HTTP API
- 通过 SSE 接收实时事件
- webview 用 Solid 渲染 UI

### 3. Web / Desktop

入口：

- `packages/app/src/entry.tsx`
- `packages/desktop/`

主链路：

- 前端应用启动
- 通过 `@kilocode/sdk` 连接服务端
- 共享 UI 与状态管理

## 当前仓库里最重要的源码入口

如果你只能挑一条主线来读，就按下面顺序：

1. `packages/opencode/src/index.ts`
2. `packages/opencode/src/cli/cmd/serve.ts`
3. `packages/opencode/src/server/server.ts`
4. `packages/opencode/src/project/instance.ts`
5. `packages/opencode/src/project/project.ts`
6. `packages/opencode/src/session/index.ts`
7. `packages/opencode/src/session/processor.ts`
8. `packages/opencode/src/agent/agent.ts`
9. `packages/opencode/src/tool/registry.ts`
10. `packages/opencode/src/config/config.ts`

这条链路基本就是“从启动到执行”的主干。

## 你需要先理解的 8 个核心概念

### 1. Command

CLI 的各种命令由 `packages/opencode/src/cli/cmd/` 定义，比如：

- `run.ts`
- `serve.ts`
- `session.ts`
- `mcp.ts`
- `models.ts`

### 2. Server

`packages/opencode/src/server/server.ts` 使用 Hono 搭建 HTTP API 和 SSE 事件流，是所有客户端共享的服务端。

关键路由目录：

- `packages/opencode/src/server/routes/`

其中包括：

- `session.ts`
- `project.ts`
- `provider.ts`
- `permission.ts`
- `question.ts`
- `pty.ts`
- `mcp.ts`
- `kilocode.ts`
- `telemetry.ts`

### 3. Instance

`packages/opencode/src/project/instance.ts`

这个模块非常关键。你可以把它理解成“按项目目录隔离的一层运行时上下文”。

很多模块都不是全局单例，而是“每个项目目录一个实例状态”。

### 4. Project

`packages/opencode/src/project/project.ts`

负责识别当前目录属于哪个项目、是否在 Git 仓库里、工作树在哪里、项目 ID 怎么算。

### 5. Session

`packages/opencode/src/session/index.ts`

Session 是对话和执行过程的核心数据对象。它会关联：

- 项目
- 目录
- 消息
- part
- 成本
- diff
- 权限

### 6. Agent

`packages/opencode/src/agent/agent.ts`

这里定义了系统里的 agent 模式，比如：

- `code`
- `plan`
- `debug`
- `ask`
- `general`
- `explore`

agent 的重点不只是 prompt，还有权限规则。

### 7. Tool

`packages/opencode/src/tool/registry.ts`

这里决定一个 agent 可以用哪些工具，以及哪些工具会按模型、按配置、按客户端能力启用。

核心工具目录：

- `packages/opencode/src/tool/`

你会看到：

- `bash.ts`
- `read.ts`
- `glob.ts`
- `grep.ts`
- `edit.ts`
- `write.ts`
- `apply_patch.ts`
- `webfetch.ts`
- `websearch.ts`
- `task.ts`
- `todo.ts`

### 8. Config

`packages/opencode/src/config/config.ts`

这是项目最复杂的模块之一。因为它不只是“读一个配置文件”，而是在做多层来源合并：

- legacy Kilocode 配置
- organization 模式
- global config
- project config
- `.opencode` / `.kilo` 目录配置
- managed config
- 环境变量覆盖

## Kilo 在 upstream OpenCode 基础上新增了什么

Kilo-specific 的内容主要集中在：

- `packages/opencode/src/kilocode/`
- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`
- `packages/kilo-vscode/`
- `packages/kilo-ui/`

在共享 upstream 文件里，你还会看到 `kilocode_change` 注释，这表示这是 Kilo fork 后加的差异点。

## VS Code 扩展主线怎么读

如果你开始学扩展端，建议按这个顺序：

1. `packages/kilo-vscode/src/extension.ts`
2. `packages/kilo-vscode/src/services/cli-backend/server-manager.ts`
3. `packages/kilo-vscode/src/services/cli-backend/connection-service.ts`
4. `packages/kilo-vscode/src/KiloProvider.ts`
5. `packages/kilo-vscode/webview-ui/src/App.tsx`

这条链路能帮你理解：

- 扩展是怎么启动后端的
- SDK 是怎么建立连接的
- SSE 事件是怎么分发给 webview 的
- 前端状态是怎么组织的

## Web / UI 主线怎么读

### `packages/app/`

共享前端，适合理解浏览器端如何连接服务端：

- `packages/app/src/entry.tsx`
- `packages/app/src/context/server.tsx`
- `packages/app/src/context/`
- `packages/app/src/components/`

### `packages/kilo-ui/`

这是 Kilo UI 组件库，适合理解视觉和交互层复用：

- `packages/kilo-ui/src/components/`
- `packages/kilo-ui/src/context/`
- `packages/kilo-ui/src/theme/`

## 初学者不要一开始就钻进去的地方

- `packages/ui/`
  体量很大，而且不是你理解主链路的第一站
- `packages/kilo-docs/`
  先不影响你读运行时
- `packages/desktop/`
  等你理解 `app + sdk + server` 再看
- 大量测试目录
  先围绕主链路阅读，第二轮再借测试补理解

## 推荐的源码阅读顺序

### 第一轮

- `packages/opencode/src/index.ts`
- `packages/opencode/src/cli/cmd/serve.ts`
- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/project/instance.ts`
- `packages/opencode/src/session/index.ts`
- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/tool/registry.ts`

目标：

你能说清楚“一个客户端请求是怎么一路走到 Agent 和 Tool 的”。

### 第二轮

- `packages/opencode/src/config/config.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/storage/db.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/provider/provider.ts`

目标：

你能说清楚“配置、项目识别、数据库、会话处理、模型调用”是怎么拼起来的。

### 第三轮

- `packages/kilo-vscode/src/extension.ts`
- `packages/kilo-vscode/src/services/cli-backend/`
- `packages/kilo-vscode/webview-ui/src/App.tsx`
- `packages/sdk/js/src/client.ts`
- `packages/kilo-gateway/src/index.ts`

目标：

你能说清楚“VS Code 扩展为什么只是客户端，它怎么和核心运行时通信”。

## 开发命令地图

根目录常用命令：

```bash
bun run dev
bun run extension
bun turbo typecheck
```

CLI 包常用命令：

```bash
cd packages/opencode
bun run dev
bun test
```

扩展包常用命令：

```bash
cd packages/kilo-vscode
bun run extension
bun run typecheck
```

## 读源码时最该问自己的问题

- 这个模块是入口、编排层、能力层，还是存储层
- 它依赖谁
- 谁会调用它
- 它的数据从哪里来，到哪里去
- 它是 Kilo 特有能力，还是 upstream 原有能力

如果你始终围绕这 5 个问题读，大仓库也会慢慢变清楚。
