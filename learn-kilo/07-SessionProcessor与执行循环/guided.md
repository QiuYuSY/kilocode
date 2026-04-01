# 带读讲义

## 这份带读适合什么时候用

- 你第一次进 `processor.ts`
- 你看到长长的 switch 分支很容易乱

## 阅读前准备

这份文件不要从第一行开始逐字读。

你要按事件流顺序去读。

## 第 1 步：先找到 `create(...)`

搞清楚输入是什么：

- assistantMessage
- sessionID
- model
- abort

### 停下来回答

- 为什么执行器一开始就需要这些东西？

## 第 2 步：只看 `process(...)` 的外层 while 和 try

这一步不要立刻陷进每个 case。

你要先理解：

- 它是循环
- 它支持 retry
- 它支持中断

### 停下来回答

- 为什么这里不是“一次执行到底”的线性函数？

## 第 3 步：只看文本相关分支

顺序看：

- `text-start`
- `text-delta`
- `text-end`

### 停下来回答

- 文本为什么要流式写入，而不是结束后一次性落库？

## 第 4 步：只看工具相关分支

顺序看：

- `tool-input-start`
- `tool-call`
- `tool-result`
- `tool-error`

### 停下来回答

- tool 的状态为什么要分 pending / running / completed / error？

## 第 5 步：看 `finish-step`

这里很关键，因为很多状态在这里合流：

- usage
- cost
- patch
- summary
- compaction

### 停下来回答

- 为什么这些事情都挂在 `finish-step`？

## 第一次阅读先停在哪

能说清：

- 文本流
- 工具流
- step 完成流

就先停。

## 读完后的最小输出

写一个最小时间线：

`start-step -> text/tool events -> finish-step -> session update`
