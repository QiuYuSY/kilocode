# KiloCode 二开手册

这份手册的目标是:

当你拿到一个真实需求时，不需要先翻代码找感觉，而是先根据这份手册判断:

- 需求属于哪一层
- 应该先改哪里
- 风险是什么
- 应该怎么验证

你可以把它理解成:

一份给 KiloCode 二次开发者的作战手册。

## 1. 二开的正确起点

二开的第一步不是写代码。

而是先回答 3 个问题:

1. 这到底是什么类型的需求
2. 它属于哪一层
3. 哪条主链会被影响

如果这 3 个问题回答不清，越早动手，越容易把边界改乱。

## 2. 先用四层模型判断需求落点

### 核心运行时层

典型需求:

- 新增工具
- 调整 Agent 行为
- 修改 Session / Part
- 新增后端 route
- 修改权限规则

优先看:

- `packages/opencode/`

### 客户端接入层

典型需求:

- 扩展端增加一个入口
- webview 展示新事件
- Agent Manager 增加一个新交互

优先看:

- `packages/kilo-vscode/`
- `packages/app/`

### 契约与共享层

典型需求:

- route 改了，客户端也要跟
- 需要 SDK 暴露新能力
- 多客户端共用新类型

优先看:

- `packages/sdk/js/`
- `packages/kilo-ui/`
- `packages/plugin/`

### Kilo 平台差异层

典型需求:

- Kilo 鉴权头
- organization modes
- Kilo telemetry
- legacy Kilocode 迁移

优先看:

- `packages/opencode/src/kilocode/`
- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`

## 3. 常见需求的标准改动路径

## 场景 A: 新增一个工具

### 通常要改哪里

- `packages/opencode/src/tool/`
- `packages/opencode/src/tool/registry.ts`
- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/permission/next.ts`

### 你要想清什么

- 工具输入输出是什么
- 哪些 Agent 可以用
- 默认是 allow、ask 还是 deny
- 输出是否会形成新的 Session Part

### 常见风险

- 工具能跑，但 Agent 用不到
- Agent 能用，但 Permission 卡死
- 工具输出太大，没有考虑截断或展示

### 最小验证

- 跑 typecheck
- 跑相关 tool test 或最小手动调用
- 验证 Agent 能拿到工具定义
- 验证权限流是否符合预期

## 场景 B: 新增一个 route

### 通常要改哪里

- `packages/opencode/src/server/routes/`
- `packages/opencode/src/server/server.ts`

### 可能还要改哪里

- `packages/sdk/js/`
- 客户端调用方

### 你要想清什么

- 这个 route 属于 project、session、config、provider，还是 Kilo 专属 route
- 它是否需要进入 SDK
- 哪些客户端会调用它

### 常见风险

- 服务端能跑，但客户端没法调用
- route 变了，但 SDK 没 regen
- 放错 route 分类，后面维护混乱

### 最小验证

- 跑 typecheck
- 手动验证 route
- 如果 endpoint 改了，执行 SDK regen
- 验证至少一个客户端调用路径

## 场景 C: 调整 Agent 模式

### 通常要改哪里

- `packages/opencode/src/agent/agent.ts`
- 对应 prompt 文件
- `packages/opencode/src/permission/next.ts`

### 你要想清什么

- 这是 prompt 调整，还是行为边界调整
- 是不是要改变 tool availability
- 会不会影响已有 Agent 的使用习惯

### 常见风险

- prompt 改了，但权限没改
- 权限改了，但工具还是暴露不对
- “看起来像新 Agent”，实际只是文案换皮

### 最小验证

- 对比改动前后 Agent 定义
- 确认 Permission 规则变化
- 手动跑一次典型任务验证行为差异

## 场景 D: 扩展端新增一个交互入口

### 通常要改哪里

- `packages/kilo-vscode/src/extension.ts`
- 对应 provider / command / panel
- `packages/kilo-vscode/src/services/cli-backend/`
- webview UI

### 你要想清什么

- 这是纯 UI 入口，还是背后需要新 backend 能力
- 是否依赖现有共享连接
- 会不会影响多 panel / Agent Manager 同步

### 常见风险

- 只改 UI，不改 backend 能力
- 忽略共享连接机制
- 把全局状态偷偷塞进单个 webview

### 最小验证

- 跑 typecheck
- 运行 `bun run extension`
- 验证入口、事件、同步链

## 场景 E: Kilo 专属平台能力

### 通常要改哪里

- `packages/opencode/src/kilocode/`
- `packages/kilo-gateway/`
- `packages/kilo-telemetry/`

### 你要想清什么

- 这是共享能力还是 Kilo 专属能力
- 能不能放进 Kilo 专属路径
- 是否必须改 shared file

### 常见风险

- 把 Kilo 差异散进 shared code
- 忘记标记 `kilocode_change`
- 平台逻辑写进客户端接入层

### 最小验证

- 跑 typecheck
- 验证平台行为
- 检查 shared file 的差异边界

## 4. 判断要不要改 SDK

下面这个判断规则要牢牢记住:

### 不需要改 SDK 的情况

- 只改 route 内部实现
- 只改 UI
- 只改工具内部逻辑

### 大概率需要改 SDK 的情况

- 新增 endpoint
- 修改 endpoint 参数
- 修改 endpoint 返回结构

如果你改的是 server 对外契约，就要想到 SDK。

## 5. 判断要不要加 `kilocode_change`

### 通常不需要的情况

- 新文件在 Kilo 专属目录下
- 文件路径本身就带 `kilocode`

### 通常需要的情况

- 修改 upstream 共享文件
- 差异逻辑写进共享主链

原则很简单:

让未来合并 upstream 的人，一眼能识别这部分是 Kilo 特有改动。

## 6. 做一个小改动前的最小方案模板

开始动手前，先写 6 行:

1. 目标是什么
2. 不做什么
3. 主要改动落点
4. 可能波及哪些层
5. 主要风险
6. 最小验证方式

如果这 6 行写不出来，先别急着改。

## 7. 扩展端问题的标准排查顺序

扩展端出问题时，按下面顺序排查:

1. `ServerManager` 有没有成功拉起 CLI
2. 端口有没有被正确解析
3. `KiloConnectionService` 有没有建立共享 client
4. SSE 是否正常收到事件
5. provider / panel 是否正确接到广播
6. 最后再看 webview UI

这是因为:

很多表面上的 UI 问题，其实都是连接主链断了。

## 8. 做 route / server 改动时的标准排查顺序

1. route 有没有注册到 `server.ts`
2. 请求上下文是否正确进入 `Instance`
3. route 内部是否拿到正确的 Session / Project / Config
4. 客户端是否按新契约调用
5. SDK 是否同步更新

## 9. 做工具改动时的标准排查顺序

1. 工具是否注册进 ToolRegistry
2. 当前 model 是否会暴露这类工具
3. 当前 Agent 是否允许使用
4. Permission 是否允许执行
5. Session 中是否能看到正确的工具事件

## 10. 做 Kilo 平台改动时的标准排查顺序

1. 这是共享能力还是 Kilo 专属能力
2. 是否优先放进 Kilo 专属路径
3. 是否会改 shared 主链
4. 是否需要 `kilocode_change`
5. 是否影响 Gateway / Telemetry / Config migration

## 11. 最小验证清单模板

每次二开至少问自己:

- 我改动的是哪一层
- 我跑了哪种最小验证
- 这次是否需要 SDK regen
- 这次是否需要 source links 更新
- 这次是否需要检查 `kilocode_change`

## 12. 最容易犯的 8 个错误

1. 还没判层就先写 UI
2. 把扩展端当主体
3. 把 Agent 当 prompt
4. 把 ToolRegistry 当静态工具表
5. 改 route 却忘了 SDK
6. 把 Kilo 差异散在 shared 文件
7. 只看结果，不看执行过程
8. 不做最小验证就认为改动完成

## 13. 一份最实用的二开思维

拿到需求后，先在脑子里过这 5 句:

- 这是什么类型的需求
- 它属于哪一层
- 主链会影响到哪几个节点
- 我最小需要改哪些文件
- 我如何证明它真的工作了

只要你能稳定走完这 5 句，KiloCode 的大多数小型二开都能进入可控状态。

## 14. 二开的最终目标

真正成熟的二开能力，不是“知道仓库很复杂”。

而是:

面对一个具体需求时，你已经知道:

- 从哪里下手
- 为什么从这里下手
- 这样改有什么风险
- 改完如何验证

如果你能做到这一点，这份手册就完成了它的使命。
