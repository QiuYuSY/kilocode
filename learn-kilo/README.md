# Learn Kilo

这里是一套真正按“课程”组织的工程学习体系。

每一节课都是 `learn-kilo/` 下的一个独立文件夹，不再是散乱的几篇文档。

每个课包统一包含 4 个文件：

- `README.md`
  讲义。包含课程目标、前置要求、时长、完成线、阅读顺序卡、关键源码、非重点边界。
- `practice.md`
  练习。至少包含入门练习、追链练习、输出练习。
- `thinking.md`
  思考题。不是只问“是什么”，而是逼你去思考设计权衡。
- `deliverables.md`
  产出要求。告诉你这节课应该留下什么成果、推荐用什么结构表达。

核心课额外会提供：

- `guided.md`
  带读讲义。适合你第一次硬啃真实源码时使用，会告诉你先看哪里、先忽略哪里、读到哪一步先停下来总结。

## 推荐学习顺序

1. [项目地图](/d:/Code/kilocode/learn-kilo/project-map.md)
2. [课程总表](/d:/Code/kilocode/learn-kilo/课程总表.md)
3. [学习路径](/d:/Code/kilocode/learn-kilo/学习路径.md)
4. [00-开课与学习方法](/d:/Code/kilocode/learn-kilo/00-开课与学习方法)
5. [01-仓库全景与产品关系](/d:/Code/kilocode/learn-kilo/01-仓库全景与产品关系)
6. [02-CLI入口与命令系统](/d:/Code/kilocode/learn-kilo/02-CLI入口与命令系统)
7. [03-Server与实时事件流](/d:/Code/kilocode/learn-kilo/03-Server与实时事件流)
8. [04-Project与Instance系统](/d:/Code/kilocode/learn-kilo/04-Project与Instance系统)
9. [05-Config与Storage系统](/d:/Code/kilocode/learn-kilo/05-Config与Storage系统)
10. [06-Session数据模型](/d:/Code/kilocode/learn-kilo/06-Session数据模型)
11. [07-SessionProcessor与执行循环](/d:/Code/kilocode/learn-kilo/07-SessionProcessor与执行循环)
12. [08-Agent模式与权限系统](/d:/Code/kilocode/learn-kilo/08-Agent模式与权限系统)
13. [09-Tool注册与动态编排](/d:/Code/kilocode/learn-kilo/09-Tool注册与动态编排)
14. [10-VSCode扩展与AgentManager](/d:/Code/kilocode/learn-kilo/10-VSCode扩展与AgentManager)
15. [11-SDK与契约层](/d:/Code/kilocode/learn-kilo/11-SDK与契约层)
16. [12-共享前端与UI组件层](/d:/Code/kilocode/learn-kilo/12-共享前端与UI组件层)
17. [13-Kilo增量与Fork差异](/d:/Code/kilocode/learn-kilo/13-Kilo增量与Fork差异)
18. [14-毕业实战与深度复盘](/d:/Code/kilocode/learn-kilo/14-毕业实战与深度复盘)

## 这轮升级后的核心特点

- 课程颗粒度更细，不再把多个大主题硬塞进一课
- 每课都有“最低完成线 / 标准完成线 / 深入完成线”
- 每课都有“源码阅读顺序卡”，减少小白迷路概率
- 核心课开始补“guided.md”带读讲义，进一步降低第一次进源码的难度
- 每课都明确告诉你“先看什么、暂时不要深挖什么”
- 每课都要求输出，不允许停在“看过了”

## 你学完后应该达到的水平

如果完整学完并完成产出，你应该能：

- 讲清楚仓库的产品关系和分层
- 讲清楚 `packages/opencode` 的核心主链路
- 讲清楚 `Project`、`Instance`、`Config`、`Session`、`Agent`、`Tool` 的设计角色
- 讲清楚 VS Code 扩展如何连接 CLI backend
- 讲清楚 Kilo 相比 upstream OpenCode 增加了哪些关键能力
- 完成一次真实的源码讲解或小型改动
