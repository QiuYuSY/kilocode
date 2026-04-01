# 01 课：仓库全景与产品关系

## 适合谁

- 刚接触这个仓库的人
- 还不能分清核心包和外围包的人

## 前置要求

- 完成 00 课

## 预计时长

- 总时长：2 到 3 小时
- 推荐分 2 到 3 次完成

## 你已经学会了什么

- 知道这套课程怎么使用
- 知道每课要靠输出验证理解

## 这节课新增什么

- 仓库全景地图
- 产品关系
- 核心包与外围包的分层

## 完成线

- 最低完成线：知道主要包分别做什么
- 标准完成线：能画出产品关系图
- 深入完成线：能解释为什么这个仓库必须是多包结构

## 难度梯度

1. 观察：认目录和包
2. 追链：认产品关系
3. 解释：认核心与共享层
4. 思考：理解 monorepo 的必要性

## 源码阅读顺序卡

1. 根目录 `README.md`
2. 根目录 `AGENTS.md`
3. `package.json`
4. `turbo.json`
5. `packages/opencode/AGENTS.md`
6. `packages/kilo-vscode/AGENTS.md`
7. [project-map.md](/d:/Code/kilocode/learn-kilo/project-map.md)

## 必须关注的结构

- `packages/opencode`
- `packages/kilo-vscode`
- `packages/sdk/js`
- `packages/app`
- `packages/kilo-ui`
- `packages/kilo-gateway`
- `packages/kilo-telemetry`

## 这课暂时不用深挖

- `packages/ui`
- `packages/kilo-docs`
- 大量测试目录

## 在真实开发中有什么用

- 帮你快速定位一个问题更可能属于哪个包
- 帮你减少“在错误目录里找半天”的时间成本
- 帮你知道改动时应该优先影响哪一层

## 常见误区

- 把整个仓库看成单一 VS Code 扩展项目
- 看到包多就以为每个都要同时啃
- 把共享层与产品层混在一起理解

## 本课结论

这个仓库是以 `packages/opencode` 为核心引擎、多个客户端围绕它构建的产品矩阵。

## 下一课为什么学它

地图建立之后，下一步就该从真正的入口进入：CLI 命令系统。
