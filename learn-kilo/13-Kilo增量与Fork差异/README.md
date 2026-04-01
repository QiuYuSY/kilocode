# 13 课：Kilo 增量与 Fork 差异

## 适合谁

- 已经理解系统主干，想区分 upstream 与 Kilo 增量的人

## 前置要求

- 完成 12 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 次完成

## 你已经学会了什么

- 你已经打通了运行时、客户端、共享层三大主线
- 你已经知道哪些包更偏通用核心、哪些更偏客户端

## 这节课新增什么

- upstream 与 Kilo 的差异视角
- `kilocode_change` 的意义
- fork 项目的工程边界

## 完成线

- 最低完成线：知道 Kilo 是基于 OpenCode 演进来的 fork
- 标准完成线：能识别 Kilo-specific 代码落点
- 深入完成线：能解释为什么 fork 差异要保持可识别

## 难度梯度

1. 观察：认 Kilo-specific 目录
2. 追链：认 gateway、telemetry、kilocode 目录
3. 解释：认 `kilocode_change`
4. 思考：认 fork 项目控制差异的意义

## 源码阅读顺序卡

1. 根目录 `AGENTS.md`
2. `packages/opencode/src/kilocode/`
3. `packages/kilo-gateway/src/index.ts`
4. `packages/kilo-telemetry/src/index.ts`
5. 在核心文件里搜索 `kilocode_change`

## 必须关注的结构

- `packages/opencode/src/kilocode`
- `packages/kilo-gateway`
- `packages/kilo-telemetry`
- `kilocode_change`

## 这课暂时不用深挖

- 每个 Kilo-specific 模块的完整实现细节
- 所有云端 API 行为细节

## 在真实开发中有什么用

- 帮你判断一个改动应该放在共享层还是 Kilo-specific 层
- 帮你理解为什么某些改动要尽量小心控制 diff
- 帮你减少未来同步 upstream 时的冲突风险

## 常见误区

- 把 Kilo 与 upstream 完全混为一谈
- 只把 `kilocode_change` 当注释，不理解其工程意义
- 以为 fork 差异只影响业务，不影响架构

## 本课结论

真正理解这个仓库，必须同时分清“upstream 核心”与“Kilo 增量能力”。

## 下一课为什么学它

所有主线都看完后，最后一课就该把理解转化为毕业级输出。
