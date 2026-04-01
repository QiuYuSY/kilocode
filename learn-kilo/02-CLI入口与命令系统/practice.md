# 练习

## 入门练习

列出 `index.ts` 注册的主要命令。

## 追链练习

画出 `kilo serve` 从入口到 handler 的调用链。

## 真实工程实验题

执行一次：

```bash
bun run --cwd packages/opencode --conditions=browser src/index.ts --help
```

然后记录：

- CLI 最外层有哪些命令
- 你在入口文件里能对应上哪些命令注册
- 哪些命令一眼看上去更像后端能力入口

## 口头复述任务

脱稿解释：

“如果用户在终端里输入 `kilo serve`，代码最先经过哪些位置？”

## 输出练习

用 300 到 500 字解释：

为什么 `index.ts` 不能只负责“调一下 yargs 然后退出”。

## 参考结构

- 入口对象是谁
- 命令如何注册
- `serve` 如何被接住
- 还有哪些全局初始化在这里发生
