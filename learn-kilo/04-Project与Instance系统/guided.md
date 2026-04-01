# 带读讲义

## 这份带读适合什么时候用

- 你第一次读 `Project` 和 `Instance`
- 你已经感受到“directory 很重要”，但还不明白为什么

## 阅读前准备

这一课不要一上来就想搞清所有方法。

第一次阅读只盯：

- `Project.fromDirectory`
- `Instance.provide`
- `Instance.state`

## 第 1 步：先看 `packages/opencode/src/project/project.ts`

只看 `fromDirectory`。

重点问题：

- 如何找到 `.git`
- 如何确定 sandbox / worktree
- 如何生成 project id

### 停下来回答

- 为什么 project identity 不能只等于当前目录路径？

## 第 2 步：仍在 `project.ts`，只感受返回值

你不用读完所有 update / list / sandbox 逻辑。

只看：

- `project`
- `sandbox`
- `worktree`

### 停下来回答

- 这里为什么同时保留了多个路径概念？

## 第 3 步：跳到 `packages/opencode/src/project/instance.ts`

先看 `provide`。

理解：

- 它如何以 directory 为键
- 它如何建立上下文
- 它如何复用已有实例

### 停下来回答

- `provide` 为什么比普通函数调用多了一层上下文意义？

## 第 4 步：继续看 `state`

这一步是设计核心。

你要理解：

- 为什么状态是按 `Instance.directory` 分桶
- 为什么这和“模块缓存一个变量”不是一回事

### 停下来回答

- 如果这里改成全局单例，最先坏掉的会是什么？

## 第 5 步：看 `dispose` 与 `disposeAll`

理解：

- 为什么需要主动清理
- 为什么多目录系统要有“全部实例清理”能力

## 第一次阅读先停在哪

看到这里，你就已经够资格解释：

- Project 是什么
- Instance 是什么
- 为什么要按目录隔离

## 读完后的最小输出

写出一段 5 到 8 句话的说明：

- Project 负责识别身份
- Instance 负责承载上下文
- 为什么这两层不能合并成一个普通对象
