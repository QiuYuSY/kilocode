# 练习

## 入门练习

解释扩展端的三层：

- extension host
- webview
- CLI backend

## 追链练习

画出从扩展启动到连接上 `kilo serve` 的链路图。

## 真实工程实验题

执行一次：

```bash
bun run extension
```

然后记录：

- 你从课程里预期扩展会先做什么
- 实际看到的扩展行为是否和你的预期一致
- 如果你要排查“连不上后端”，你会先看哪个文件

## 口头复述任务

脱稿解释：

“为什么 Agent Manager 可以多会话，但不需要多后端？”

## 输出练习

写一段解释：

为什么 Agent Manager 能有多个会话，但不需要多个后端。

## 参考结构

- extension host 做什么
- webview 做什么
- backend 做什么
- Agent Manager 如何复用连接
