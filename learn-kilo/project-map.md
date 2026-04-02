# 项目地图

这份地图不是目录导览，而是给二次开发者用的。

你读它的目标不是“知道仓库里有什么”，而是先建立一个判断:

以后我想改一个能力时，应该先去哪个层级下手。

## 一句话理解整个仓库

KiloCode 不是“一个 VS Code 扩展项目”，而是:

一个以 `packages/opencode/` 为核心运行时和服务端的 monorepo。

其它产品大多只是这个核心的不同接入形态。

## 四层结构

### 1. 核心运行时层

核心包:

- `packages/opencode/`

这一层负责:

- CLI 入口
- headless server
- Project / Instance 上下文
- Session / Message / Part 建模
- Agent / Permission / Tool 编排
- Provider、Storage、Snapshot、Bus 等基础运行时

如果你的改动涉及:

- 对话执行逻辑
- 工具执行方式
- 会话状态
- 权限规则
- 服务端 route

那大概率先落在这里。

### 2. 客户端接入层

核心包:

- `packages/kilo-vscode/`
- `packages/app/`
- `packages/desktop/`

这一层负责:

- 把核心运行时接入具体宿主环境
- 启动或连接 `kilo serve`
- 把 HTTP/SSE 结果变成具体 UI 交互

如果你的改动涉及:

- VS Code 命令、webview、Agent Manager
- web / desktop 页面行为
- 编辑器侧体验编排

那先看客户端接入层。

### 3. 契约与共享层

核心包:

- `packages/sdk/js/`
- `packages/kilo-ui/`
- `packages/plugin/`
- `packages/util/`

这一层负责:

- 客户端和服务端的 API 契约
- UI 共享能力
- 插件/工具接口定义
- 跨包通用能力

如果你的改动涉及:

- 新 route 对客户端的调用方式
- 多个客户端共用同一 API
- 通用 UI / 通用类型

就要先考虑这一层。

### 4. Kilo 平台增量层

核心包和目录:

- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`
- `packages/kilo-i18n/`
- `packages/opencode/src/kilocode/`

这一层负责:

- Kilo 平台鉴权与 provider 路由
- 遥测
- legacy Kilocode 迁移
- 组织模式、Kilo routes、Kilo 差异能力

如果一个改动明显只属于 Kilo，而不是 upstream OpenCode 的共通能力，优先看这层。

## 先建立 3 个最重要的误区修正

### 误区 1

“VS Code 扩展就是系统主体。”

不是。

扩展只是宿主接入层。真正的执行引擎、会话、工具和服务端都在 `packages/opencode/`。

### 误区 2

“SDK 只是为了方便调接口。”

不是。

`packages/sdk/js/` 是多客户端共享同一后端契约的桥梁层。只要 route 变了，就要考虑 SDK 是否要同步生成。

### 误区 3

“Kilo 差异只是品牌替换。”

不是。

Kilo 在鉴权、路由、遥测、legacy 配置迁移、组织模式、扩展编排上都有真实平台增量。

## 最重要的源码主链

如果你第一次真正读这仓库，请只抓这条线:

1. `packages/opencode/src/index.ts`
2. `packages/opencode/src/cli/cmd/serve.ts`
3. `packages/opencode/src/server/server.ts`
4. `packages/opencode/src/project/project.ts`
5. `packages/opencode/src/project/instance.ts`
6. `packages/opencode/src/session/index.ts`
7. `packages/opencode/src/session/message-v2.ts`
8. `packages/opencode/src/session/processor.ts`
9. `packages/opencode/src/agent/agent.ts`
10. `packages/opencode/src/tool/registry.ts`

这条线对应的是:

入口 -> 服务化 -> 上下文 -> 会话建模 -> 执行循环 -> Agent/Tool 编排

## VS Code 端主链

如果你要理解扩展如何接入核心，请抓这条线:

1. `packages/kilo-vscode/src/extension.ts`
2. `packages/kilo-vscode/src/services/cli-backend/server-manager.ts`
3. `packages/kilo-vscode/src/services/cli-backend/connection-service.ts`
4. `packages/kilo-vscode/src/KiloProvider.ts`
5. `packages/kilo-vscode/webview-ui/`

这条线对应的是:

扩展装配 -> 启动 CLI backend -> 建立 SDK/SSE 连接 -> 分发到 webview UI

## Kilo 差异主链

如果你要看 Kilo 和 upstream 的真正差异，请先抓:

1. `packages/opencode/src/index.ts`
2. `packages/opencode/src/server/server.ts`
3. `packages/opencode/src/config/config.ts`
4. `packages/opencode/src/kilocode/`
5. `packages/kilo-gateway/src/`
6. `packages/kilo-telemetry/src/`

要特别留意:

- `kilocode_change` 注释
- legacy Kilocode 配置迁移
- `createKiloRoutes(...)`
- `Telemetry.init(...)`
- `fetchOrganizationModes(...)`

## 二次开发时最常见的 6 类需求和落点

### 新增一个工具或改工具行为

先看:

- `packages/opencode/src/tool/`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/permission/next.ts`

### 新增一个服务端接口

先看:

- `packages/opencode/src/server/routes/`
- `packages/opencode/src/server/server.ts`
- `packages/sdk/js/`

如果改了 server endpoint，记得看 AGENTS 里的 SDK regen 约束。

### 调整 Agent 行为边界

先看:

- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/permission/next.ts`
- 相关 prompt 文件

### 扩展端新增一个交互能力

先看:

- `packages/kilo-vscode/src/extension.ts`
- `packages/kilo-vscode/src/services/cli-backend/`
- `packages/kilo-vscode/webview-ui/`

### Kilo 平台能力改动

先看:

- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`
- `packages/opencode/src/kilocode/`

### 文档或 source links 相关

先看:

- `packages/kilo-docs/`
- 仓库根 `AGENTS.md` 里关于 source links 的命令

## 学这份地图时的最低输出要求

你至少要能自己画出:

- 仓库四层结构图
- 请求主链图
- VS Code 扩展接入图
- Kilo 差异层图

如果这 4 张图你画不出来，后面的二开基本还会继续凭感觉。
