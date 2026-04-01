# 04 课：Project 与 Instance 系统

## 适合谁

- 已经看过 Server，想理解“目录上下文”如何落地的人

## 前置要求

- 完成 03 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 到 3 次完成

## 你已经学会了什么

- 你已经知道服务端如何接住请求与事件流
- 你已经看到 `directory` 和 `workspace` 会在很早阶段被注入

## 这节课新增什么

- Project 身份识别
- worktree 语义
- Instance 上下文与按目录状态隔离

## 完成线

- 最低完成线：知道 Project 与 Instance 的职责区别
- 标准完成线：能解释按目录隔离状态的必要性
- 深入完成线：能比较 `Instance.state` 与全局单例的差异

## 难度梯度

1. 观察：认 Project 与 worktree
2. 追链：认 Instance 的 provide / state
3. 解释：理解为什么要按目录隔离
4. 思考：比较替代设计

## 源码阅读顺序卡

1. `packages/opencode/src/project/project.ts`
2. 只看 `fromDirectory`
3. `packages/opencode/src/project/instance.ts`
4. 只看 `provide`、`state`、`disposeAll`

## 必须关注的函数/结构

- `Project.fromDirectory`
- `Instance.provide`
- `Instance.state`
- `Instance.disposeAll`

## 这课暂时不用深挖

- icon 发现逻辑
- project 更新的所有边缘方法

## 在真实开发中有什么用

- 帮你理解多项目、多目录、多 worktree 为什么不会互相污染
- 帮你定位“状态串了”或“目录不对”这类问题
- 帮你知道什么时候应该清理实例缓存

## 常见误区

- 把 Project 当成普通目录对象
- 把 Instance 当成全局单例包装壳
- 把 worktree 当成 Git 细节而忽略它的运行时意义

## 本课结论

`Instance` 是这个项目实现“按目录隔离运行时状态”的关键设计。

## 下一课为什么学它

目录上下文立住后，下一步就要理解在这个上下文里最复杂的一层：配置与存储。
