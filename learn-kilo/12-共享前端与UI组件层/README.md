# 12 课：共享前端与 UI 组件层

## 适合谁

- 已理解 SDK，想看客户端复用层的人

## 前置要求

- 完成 11 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 到 3 次完成

## 你已经学会了什么

- 你已经知道客户端如何通过 SDK 共享后端契约
- 你知道多个客户端不是各自乱接后端

## 这节课新增什么

- 共享前端层
- 组件层
- 平台复用与平台差异

## 完成线

- 最低完成线：知道 `packages/app` 与 `packages/kilo-ui` 的角色
- 标准完成线：能解释 app、webview、组件库之间的关系
- 深入完成线：能解释为什么“共享前端”不等于“所有客户端完全一套 UI”

## 难度梯度

1. 观察：认 app 入口
2. 追链：认 server context
3. 解释：认共享 UI 层
4. 思考：比较复用与平台差异

## 源码阅读顺序卡

1. `packages/app/src/entry.tsx`
2. `packages/app/src/context/server.tsx`
3. `packages/app/src/context/`
4. `packages/kilo-ui/src/components/`
5. 对照 `packages/kilo-vscode/webview-ui`

## 必须关注的函数/结构

- app 入口
- server context
- `kilo-ui` component exports
- provider / theme / context

## 这课暂时不用深挖

- 所有具体 UI 组件实现细节
- 每个 CSS 文件

## 在真实开发中有什么用

- 帮你知道一个 UI 问题更可能属于 app、webview 还是组件层
- 帮你判断一个新交互应放在组件库还是客户端自身
- 帮你理解复用层的边界和收益

## 常见误区

- 把共享前端理解成“所有页面完全一样”
- 把组件库理解成样式仓库
- 忽略平台环境差异对 UI 架构的影响

## 本课结论

共享前端层解决的是“复用能力”，不是“抹平所有平台差异”。

## 下一课为什么学它

前端共享层看懂后，最后还要补上一层：Kilo 相比 upstream 到底加了什么。
