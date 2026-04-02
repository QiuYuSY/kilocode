# KiloCode 架构总册

这份总册的目标很直接:

即使你暂时不打开代码页，也能完整掌握 KiloCode 的工程结构、核心抽象、运行链路和设计判断。

你可以把它理解成:

一份写给二次开发者的工程说明书。

## 你学完这份总册后应该做到什么

- 能完整讲清 KiloCode 是什么系统
- 能解释各个核心模块为什么必须存在
- 能说清一次请求从哪里进、怎么跑、怎么回到客户端
- 能区分核心运行时、客户端接入层、契约层和 Kilo 平台差异层
- 能在不看源码的情况下先判断一个需求应改哪一层

## 1. KiloCode 到底是什么

KiloCode 不是“一个 VS Code 插件”。

更准确地说，它是:

一个以 `packages/opencode` 为核心运行时和服务端的 AI 编程系统。

这个核心系统可以被不同客户端接入:

- CLI
- VS Code 扩展
- Web
- Desktop

而 Kilo 又在 upstream OpenCode 的基础上，加上了自己的平台能力:

- Kilo 鉴权
- Kilo provider 路由
- 遥测
- 组织模式
- legacy Kilocode 配置迁移

所以整个工程更像:

核心引擎 + 多客户端接入 + 契约桥梁 + Kilo 平台增量

## 2. 整个工程的四层结构

### 第一层: 核心运行时层

核心位置:

- `packages/opencode/`

这是系统主体，负责:

- CLI 入口
- `kilo serve`
- Project / Instance
- Session / Message / Part
- Agent / Permission / Tool
- Provider / Storage / Snapshot / Bus

如果没有这一层，客户端只是空壳。

### 第二层: 客户端接入层

核心位置:

- `packages/kilo-vscode/`
- `packages/app/`
- `packages/desktop/`

这一层负责:

- 把核心运行时接进具体宿主
- 拉起或连接 `kilo serve`
- 把后端事件流变成可见的交互

这一层不是系统主体，而是系统入口。

### 第三层: 契约与共享层

核心位置:

- `packages/sdk/js/`
- `packages/kilo-ui/`
- `packages/plugin/`
- `packages/util/`

这一层负责:

- 客户端和服务端之间的 API 契约
- 多客户端共享的 UI 或接口能力
- 插件工具定义

它解决的是“一致性”和“复用”，不是主业务执行。

### 第四层: Kilo 平台差异层

核心位置:

- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`
- `packages/opencode/src/kilocode/`

这一层负责:

- Kilo 鉴权和头部
- 平台路由和模型能力
- 遥测
- 组织模式
- legacy 配置迁移

这一层让 Kilo 不再只是 OpenCode 的换皮，而是一个真实的平台化 fork。

## 3. 一次请求是怎么跑完整条链的

如果你只能记住一条主链，请记住这条:

1. 用户从 CLI 或客户端发起请求
2. 请求最终进入 `kilo serve`
3. 服务端根据 `directory` 建立运行时上下文
4. Session 记录这次任务执行容器
5. Agent 决定行为边界
6. ToolRegistry 决定当前有哪些工具可用
7. LLM 和工具开始流式执行
8. SessionProcessor 把执行过程持续写回 Session
9. SSE 把事件实时推送给客户端
10. 客户端把过程渲染成 UI

这条链决定了整个系统的骨架。

## 4. 为什么 `packages/opencode` 是系统核心

因为真正的执行系统都在这里:

- 服务端
- 会话
- Agent
- Tool
- Permission
- Provider

VS Code 扩展很好理解，但它不是系统的来源，只是系统的宿主接入口。

如果你先从扩展读起，很容易误以为:

- UI 就是主体
- 对话就是系统
- 后端只是辅助

这些都会让你后面二开判断失真。

## 5. 核心抽象一: Project

### 它是什么

Project 负责把一个目录识别成“哪个项目”。

### 为什么必须存在

因为 KiloCode 不是在一个全局工作空间里无差别运行。

系统需要知道:

- 当前目录是不是 git 仓库
- 当前 worktree 在哪里
- 这个目录属于哪个稳定项目身份

### 没有它会怎样

如果没有 Project，系统只能按当前路径临时运行，很多状态无法稳定归属:

- session
- sandbox
- 配置
- 工作树同步

## 6. 核心抽象二: Instance

### 它是什么

Instance 是“按目录组织的运行时上下文”。

### 为什么必须存在

KiloCode 需要支持:

- 不同目录
- 不同 worktree
- 不同项目状态隔离

系统不能把所有状态塞进全局单例。

### 没有它会怎样

没有 Instance，配置、权限、状态、会话上下文都容易串。

所以你应该把 Instance 理解成:

运行时隔离边界，而不是普通缓存。

## 7. 核心抽象三: Session

### 它是什么

Session 是一次任务执行的容器。

### 为什么它不是聊天记录

因为它记录的不是“说了什么”，而是“这次执行发生了什么”。

它关联:

- projectID
- directory
- title
- summary
- permission
- revert
- diff
- 消息与 part

### 没有它会怎样

没有 Session，系统就很难稳定保存执行过程，也无法把一次 AI 任务看作可恢复、可观察、可复盘的对象。

## 8. 核心抽象四: Message / Part

### 它们是什么

Message 是一次交互单元，Part 是消息内部的结构化片段。

### 为什么必须拆成 Part

因为 AI 编程过程不是一整块文本，而是多种状态混合:

- 文本
- reasoning
- tool-call
- tool-result
- patch
- step-start / finish

如果不拆 Part，系统很难:

- 流式展示过程
- 存储完整执行轨迹
- 做调试和重放

### 没有它会怎样

UI 最终只能展示一大段文本，过程可见性基本丢失。

## 9. 核心抽象五: SessionProcessor

### 它是什么

SessionProcessor 是流式执行事件的收束器。

### 为什么必须存在

LLM 输出不是一次返回，而是持续流出:

- reasoning-start
- reasoning-delta
- tool-call
- tool-result
- finish-step

这些事件必须持续写回 Session，才能形成稳定的执行世界。

### 没有它会怎样

每个调用方都要自己拼装执行流，系统会变得极其分散且难以维护。

## 10. 核心抽象六: Agent

### 它是什么

Agent 是行为模式定义，不只是 prompt。

### 它真正定义了什么

- 角色目标
- 权限边界
- 模型偏好
- 模式类型
- 运行约束

### 为什么不能把 Agent 看成 prompt

因为 prompt 只能定义“想做什么”，而不能定义“被允许做什么”。

真正的 Agent 边界来自:

- prompt
- permission
- tool availability

## 11. 核心抽象七: Permission

### 它是什么

Permission 是运行时执行安全系统。

### 为什么它不是弹窗

UI 里的弹窗只是表象。

真正的 permission 系统负责:

- 规则表达
- allow / ask / deny 判定
- pending request 管理
- reply 后恢复执行

### 没有它会怎样

系统要么过度保守，要么失去边界，二者都无法支撑真实工程使用。

## 12. 核心抽象八: ToolRegistry

### 它是什么

ToolRegistry 是“当前上下文下哪些工具可用”的动态编排层。

### 为什么它不是静态数组

因为工具可用性取决于:

- 当前 model
- 当前 config
- 当前 agent
- 当前 experimental flag
- 当前 plugin/custom tool

### 没有它会怎样

所有工具都会一股脑暴露，系统既不安全，也不够精确。

## 13. 为什么 `serve` 是系统中枢

`serve` 之所以重要，是因为它把整个运行时统一暴露成服务端形态。

这意味着:

- VS Code 不需要重做后端
- Web 不需要重做后端
- Desktop 不需要重做后端

所有客户端只要会连接 `kilo serve`，就能接入同一个核心系统。

所以 `serve` 不是一个小命令，而是统一后端入口。

## 14. 为什么 `server.ts` 是中枢文件

`server.ts` 并不只是注册路由。

它真正建立了 4 个边界:

- 安全边界
- 请求上下文边界
- 能力边界
- 实时同步边界

这里最关键的是:

它会把请求里的 `directory` 绑定到 `Instance.provide(...)`，从而把后面的所有状态放进正确的项目上下文。

## 15. 为什么 SSE 是必须的

KiloCode 的过程天然是流式的。

客户端想完整展示:

- 文本生成
- reasoning
- 工具执行
- 权限请求
- step 完成

就不能等“最后一次性返回结果”。

所以 SSE 不是增强功能，而是系统运行过程对外可见的必要机制。

## 16. VS Code 扩展在整个系统里的位置

VS Code 扩展不负责重新实现系统主体。

它负责:

- 在 VS Code 中激活入口
- 拉起本地 CLI backend
- 建立共享 SDK / SSE 连接
- 把状态广播给多个 webview 和 panel

所以扩展的复杂度主要来自:

- 宿主环境装配
- 共享连接
- 多视图同步

而不是重做执行系统。

## 17. 为什么扩展必须共享连接

因为 KiloCode 扩展里可能同时存在:

- sidebar
- tab panel
- Agent Manager
- diff viewer

如果每个视图各自起一个 server，各自起一个连接，系统状态就会混乱。

共享连接能保证:

- 单一后端世界
- 单一事件流
- 会话和权限状态一致

## 18. Agent Manager 的工程意义

Agent Manager 不是第二套后端。

它是在共享后端之上，增加:

- 多 session
- 多 tab
- 多 worktree

的客户端编排能力。

所以它的关键问题是编排，而不是执行。

## 19. Kilo 和 upstream 的真正差异

Kilo 的差异主要不在 UI 表面，而在平台能力:

- Kilo auth
- Kilo routes
- Telemetry
- organization modes
- legacy Kilocode config migration

这就是为什么你会在:

- `index.ts`
- `server.ts`
- `config.ts`

这些共享主链里看到大量 `kilocode_change`。

## 20. 为什么 Kilo 差异要尽量集中

因为这是 fork 仓库。

fork 最重要的长期成本不是“写功能”，而是“后续持续 merge upstream”。

所以 Kilo 专属能力要尽量:

- 放在 `packages/opencode/src/kilocode/`
- 放在 `packages/kilo-gateway/`
- 放在 `packages/kilo-telemetry/`

如果必须改共享文件，再用 `kilocode_change` 标识边界。

## 21. 配置系统为什么这么复杂

配置系统复杂不是因为写乱了，而是因为它承接了现实工程里的多层来源:

- legacy Kilocode 配置
- organization modes
- global config
- project config
- config dir
- managed config
- env override

你应该把这看成:

平台演化成本，而不是单纯“设计不优雅”。

## 22. 用一句话概括整个系统

KiloCode 是一个把 AI 编程过程建模成可执行、可观察、可隔离、可多客户端接入的运行时系统。

## 23. 学完这份总册后你应该能回答的问题

- 为什么主体在 `packages/opencode`
- 为什么 `serve` 是统一后端入口
- 为什么 Session 不是聊天记录
- 为什么 Message 要拆 Part
- 为什么需要 SessionProcessor
- 为什么 Agent 不只是 prompt
- 为什么 ToolRegistry 是动态编排层
- 为什么扩展端只是接入层
- 为什么 Kilo 差异要集中管理

如果这些问题你都能脱离代码页讲清楚，你就已经真正掌握了 KiloCode 的工程骨架。
