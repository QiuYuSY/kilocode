# 练习

## 入门练习

列出你看到的主要事件类型：

- `text-*`
- `tool-*`
- `start-step`
- `finish-step`

## 追链练习

追踪一次 tool call 从 pending 到 running 再到 completed。

## 真实工程实验题

做一次“加日志前的阅读实验”：

- 在 `packages/opencode/src/session/processor.ts` 中，只追 `tool-call`、`tool-result`、`finish-step`
- 写出这些分支分别在什么时候触发
- 再假设你要临时加日志，你会加在哪 3 个点

## 口头复述任务

脱稿解释：

“如果一次 tool 执行失败，`SessionProcessor` 大概会经过哪些状态更新？”

## 输出练习

脱稿解释：

为什么 `SessionProcessor` 不适合设计成一个一次性同步函数。

## 参考结构

- 输入从哪里来
- 事件如何分支
- 状态如何回写
- 为什么是流式
