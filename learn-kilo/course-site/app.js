const materials = [
  {
    title: "KiloCode 架构总册",
    type: "主教材",
    path: "learn-kilo/KiloCode架构总册.md",
    summary: "不看源码也能先完整掌握 KiloCode 的系统结构、主链与关键抽象。",
    points: ["系统四层结构", "运行时主链", "客户端接入与 Kilo 差异层"],
  },
  {
    title: "KiloCode 二开手册",
    type: "主教材",
    path: "learn-kilo/KiloCode二开手册.md",
    summary: "把真实需求拆成落点、风险、验证和实施路径的二开作战手册。",
    points: ["需求归层", "标准改动路径", "最小验证与交付意识"],
  },
  {
    title: "实施任务列表",
    type: "改造计划",
    path: "learn-kilo/实施任务列表.md",
    summary: "记录当前课程重构的任务边界、顺序和完成标准。",
    points: ["讲义结构升级", "练习与复盘两段式", "源码降级为验证附录"],
  },
]

const tasks = [
  "固化本轮改造范围，明确课程本体优先于源码页。",
  "升级 01-08 课讲义结构，统一主讲、抽象卡、二开场景、源码映射附录。",
  "给核心抽象补解剖卡，让学习者不依赖源码也能回答它是什么和为什么存在。",
  "给每节课补常见二开场景，让需求先映射到落点和风险。",
  "把源码降级为验证附录，明确代码页主要承担证据链和实现落点。",
  "同步总纲、导读、练习、作业和复盘模板，统一先课程本体后源码验证。",
  "自检课程结构和页面入口，确保没有残留旧逻辑。",
]

const modules = [
  {
    title: "模块 A",
    name: "建立系统地图",
    summary: "先把 KiloCode 看成立体工程，而不是一堆目录和文件。",
    lessons: ["00 训练营导读", "01 仓库地图与开发环境", "02 核心运行时总链路"],
  },
  {
    title: "模块 B",
    name: "拆开核心设计",
    summary: "拆会话系统、扩展接入和 Kilo 平台差异背后的设计判断。",
    lessons: ["03 会话代理工具系统", "04 VSCode扩展与客户端接入", "05 Kilo差异层与平台能力"],
  },
  {
    title: "模块 C",
    name: "进入二开工作流",
    summary: "把理解转成落点判断、实施方案、验证和交付能力。",
    lessons: ["06 二次开发工作流", "07 测试调试与交付"],
  },
  {
    title: "模块 D",
    name: "毕业项目",
    summary: "用一个真实、小而完整的题目证明自己具备 KiloCode 二开能力。",
    lessons: ["08 毕业项目"],
  },
]

const summaryCards = [
  { label: "主教材", value: "2+1", detail: "2 份核心教材 + 1 份实施任务列表" },
  { label: "课程数量", value: "9", detail: "1 节导读 + 8 节核心训练课" },
  { label: "训练闭环", value: "5", detail: "说明、讲义、练习、作业、复盘模板" },
  { label: "最终目标", value: "二开", detail: "先讲透工程，再回源码验证和落地" },
]

const learningFlow = [
  "先读架构总册",
  "再读二开手册",
  "看实施任务列表",
  "完成导读校准方法",
  "按模块学 01-07",
  "最后做毕业项目",
]

const structure = [
  { title: "01 课程说明", detail: "先明确本课解决什么问题，学完后必须达到什么能力。" },
  { title: "02 课程讲义", detail: "先用课程本体讲透工程，再补抽象卡、二开场景和源码映射附录。" },
  { title: "03 实验与练习", detail: "先不看源码完成主任务，再回源码做证据链验证。" },
  { title: "04 复盘与作业", detail: "先按课程本体输出第一稿，再用源码补证据和修正判断。" },
  { title: "05 课后总复盘模板", detail: "记录不看源码时能讲到哪一步，以及源码验证修正了什么。" },
]

function lesson(id, title, module, kicker, duration, outcome, files, overview, design, practice, deliver, checks) {
  return {
    id,
    title,
    module,
    kicker,
    duration,
    outcome,
    files,
    structure,
    tabs: { overview, design, practice, deliver },
    checks,
  }
}

function tab(title, body, points, callout) {
  return { title, body, points, callout }
}

const lessons = [
  lesson(
    "lesson-0",
    "00 训练营导读",
    "模块 A",
    "校准目标",
    "30-45 分钟",
    "把学习目标从“看源码”切换成“能做 KiloCode 二次开发”。",
    [
      { label: "导读说明", path: "learn-kilo/00-训练营导读/01-课程说明.md" },
      { label: "导读练习", path: "learn-kilo/00-训练营导读/03-实验与练习.md" },
      { label: "架构总册", path: "learn-kilo/KiloCode架构总册.md" },
      { label: "二开手册", path: "learn-kilo/KiloCode二开手册.md" },
      { label: "实施任务", path: "learn-kilo/实施任务列表.md" },
    ],
    tab(
      "课程定位",
      [
        "导读课负责校准学习方式。这里最重要的不是新知识，而是把你从“跟着看源码”切到“先把课程本体学会，再拿源码做验证”。",
        "学完这一课后，你应该已经知道主教材、实施任务和分课训练之间的关系。",
      ],
      ["课程主体是主教材和分课讲义。", "源码主要承担证据链和实现落点角色。", "导读课决定后面是在浏览还是在训练。"],
      "如果导读课没有把学习姿势改过来，后面再好的课程也会被用成“源码观光”。",
    ),
    tab(
      "设计解剖",
      [
        "导读课真正拆的是学习方法本身。为什么不能把代码页当主教材，为什么要先形成工程判断，再拿代码做验证。",
        "这套方法会贯穿主教材、讲义、练习、作业和复盘。",
      ],
      ["先讲工程，再看实现。", "先给判断，再找证据。", "先形成解释能力，再进入实现定位。"],
      "你以后面对真实需求时，也应该是先判断，再动手。",
    ),
    tab(
      "训练任务",
      [
        "你会先写旧预期、画空白地图、设定毕业目标和建立统一证据链笔记，然后再用主教材修正第一版理解。",
        "这一步像给后面所有课程做一次方法初始化。",
      ],
      ["写旧预期。", "画第一版仓库地图。", "用主教材修正第一版理解。"],
      "导读课的结果不是学到很多，而是开始知道后面该怎么学。",
    ),
    tab(
      "交付结果",
      [
        "通过这节课后，你应该能清楚说出这套课为什么不再把代码页放在教学中心。",
        "同时你也应该有一份后续可持续复用的学习记录模板。",
      ],
      ["当前理解版仓库地图。", "学习目标说明。", "统一证据链笔记模板。"],
      "导读课的交付物，是后面全部课程的起跑姿势。",
    ),
    ["我知道课程的终点是“能做二开”，不是“看过源码”。", "我已经建立主教材 -> 分课 -> 源码验证的学习顺序。", "我已经准备好统一的证据链笔记页。"],
  ),
  lesson(
    "lesson-1",
    "01 仓库地图与开发环境",
    "模块 A",
    "建立系统地图",
    "1.5-2.5 小时",
    "建立四层结构视角，并掌握仓库最关键的开发与验证命令。",
    [
      { label: "课程讲义", path: "learn-kilo/01-仓库地图与开发环境/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/01-仓库地图与开发环境/03-实验与练习.md" },
      { label: "项目地图", path: "learn-kilo/project-map.md" },
      { label: "根 AGENTS", path: "AGENTS.md" },
    ],
    tab(
      "课程定位",
      [
        "这节课的目标不是记目录，而是先把整个仓库看成四层结构。",
        "只有先建立这张系统地图，后面主链和抽象才会有位置感。",
      ],
      ["确认系统主体在核心运行时。", "区分客户端接入层和契约层。", "认识 Kilo 平台差异不是品牌层。"],
      "地图感不对，后面看什么都会歪。",
    ),
    tab(
      "设计解剖",
      [
        "这一课重点是工程边界。你要先知道每一层解决什么问题，为什么不能混在一起。",
        "同时还会一起把关键命令、测试入口和 fork 约束纳入认知。",
      ],
      ["四层结构决定二开落点。", "开发命令和结构认知一起建立。", "fork 约束从第一课就要进入视野。"],
      "真正好的仓库地图，应该能直接指导你“我下一步该从哪一层下手”。",
    ),
    tab(
      "训练任务",
      [
        "你会先不看源码画四层图、做需求归层判断，再回到仓库文档和项目地图修正第一版理解。",
        "这会直接训练你先按课程本体做判断的能力。",
      ],
      ["四层结构图。", "需求归层判断。", "关键开发与验证命令解释。"],
      "这一课的练习，本质上在训练“先归层，再读代码”。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该能稳定说出 `packages/opencode` 为什么是第一优先级，也能解释主要包的边界。",
        "这会决定你后面读主链时不再被扩展端和 UI 吸走注意力。",
      ],
      ["四层结构图。", "需求归层判断表。", "仓库介绍讲解稿。"],
      "这一课交付的是系统地图，不是目录笔记。",
    ),
    ["我能用自己的话解释 KiloCode 的四层结构。", "我能解释为什么核心主体是 `packages/opencode`。", "我已经掌握关键开发、测试和交付命令。"],
  ),
  lesson(
    "lesson-2",
    "02 核心运行时总链路",
    "模块 A",
    "抓住主链",
    "2.5-3.5 小时",
    "看懂核心运行时如何变成服务端，以及请求上下文如何被建立。",
    [
      { label: "课程讲义", path: "learn-kilo/02-核心运行时总链路/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/02-核心运行时总链路/03-实验与练习.md" },
      { label: "CLI 入口", path: "packages/opencode/src/index.ts" },
      { label: "Serve 命令", path: "packages/opencode/src/cli/cmd/serve.ts" },
      { label: "Server", path: "packages/opencode/src/server/server.ts" },
    ],
    tab(
      "课程定位",
      [
        "这节课只抓一条最重要的主链，把它当成整个系统的骨架。",
        "你学会的不是文件顺序，而是系统如何从入口变成统一后端。",
      ],
      ["入口装配。", "服务化入口。", "服务端边界与上下文注入。"],
      "主链课的目标不是“看完很多”，而是“讲透最关键的一条线”。",
    ),
    tab(
      "设计解剖",
      [
        "`index.ts` 负责装配，`serve` 负责统一服务化，`server.ts` 负责建立系统边界，而 `Instance` 负责把状态放回正确上下文。",
        "这套设计解释了为什么 KiloCode 可以同时被 CLI、VS Code、Web、Desktop 共享。",
      ],
      ["入口不是清单，是装配点。", "`serve` 是统一后端入口。", "`directory` 是运行时上下文的锚点。"],
      "把 `serve` 看小了，整个系统都会被看小。",
    ),
    tab(
      "训练任务",
      [
        "你会先不看源码默画启动主链和服务端边界，再回到真实代码和实际服务启动结果验证自己的理解。",
        "这种训练方式会强迫你先建立系统解释能力，再去拿代码找证据。",
      ],
      ["默画主链。", "拆服务端 4 个边界。", "观察服务启动结果。"],
      "先讲系统，再看实现，是这节课最核心的训练方式。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该已经能清楚地解释为什么 `serve` 是系统中枢，也知道 SSE 为什么属于执行系统的基础设施。",
        "这些能力会直接影响你后面理解 Session、Permission 和客户端连接方式。",
      ],
      ["启动主链图。", "服务端边界拆解图。", "关于 `serve` 的说明文。"],
      "这一课交付物应该能支撑你口头讲清整个运行时主链。",
    ),
    ["我能讲清 `index -> serve -> server -> Instance` 的主链。", "我能解释 `serve` 为什么是系统中枢。", "我能解释为什么 SSE 属于执行系统的基础设施。"],
  ),
  lesson(
    "lesson-3",
    "03 会话代理工具系统",
    "模块 B",
    "拆开业务心脏",
    "3.5-4.5 小时",
    "理解 Session、Part、Processor、Agent、Permission、ToolRegistry 的协作关系。",
    [
      { label: "课程讲义", path: "learn-kilo/03-会话代理工具系统/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/03-会话代理工具系统/03-实验与练习.md" },
      { label: "Session", path: "packages/opencode/src/session/index.ts" },
      { label: "MessageV2", path: "packages/opencode/src/session/message-v2.ts" },
      { label: "Processor", path: "packages/opencode/src/session/processor.ts" },
    ],
    tab(
      "课程定位",
      [
        "这节课是整个工程的业务心脏。你要彻底理解 KiloCode 为什么是执行系统，而不是聊天系统。",
        "这里的学习结果会直接决定你以后会不会做工具、Agent、会话相关二开。",
      ],
      ["Session 是执行容器。", "Part 是过程表达层。", "Agent、Permission、Tool 一起定义行为边界。"],
      "把会话系统理解对了，后面大半个系统就开始清楚了。",
    ),
    tab(
      "设计解剖",
      [
        "Session 承载执行世界，Part 把过程拆成可观察片段，Processor 持续写回流式事件，Agent / Permission / ToolRegistry 决定系统允许做什么。",
        "这些抽象一起让 KiloCode 具备了“过程可见性”而不是只有结果可见性。",
      ],
      ["Session 不等于聊天记录。", "Part 让过程真正可存储、可展示、可复盘。", "ToolRegistry 是动态编排层。"],
      "这一课最重要的是理解“执行世界”这个整体模型。",
    ),
    tab(
      "训练任务",
      [
        "你会先按课程本体画工具调用生命周期、对比 4 个 Agent，再回到源码追 Permission ask / reply 执行流。",
        "最后再通过一段说明，证明自己已经不再把 Session 理解成聊天记录。",
      ],
      ["工具调用生命周期。", "4 个 Agent 对比。", "Permission 执行流说明。"],
      "这是从“看懂会话”走向“能改运行时行为”的桥梁课。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该已经能明确说出一个工具、一个 Agent 或一条 Permission 规则可能会改到哪些地方。",
        "同时也能分清哪些问题属于底层建模，哪些只是展示层。",
      ],
      ["生命周期图。", "Agent 对比表。", "“为什么 Session 不是聊天记录”的说明文。"],
      "这一课交付的是执行系统视角。",
    ),
    ["我能解释 Session 为什么是执行容器而不是聊天记录。", "我能画出工具调用在 Part / Message / Session 里的生命周期。", "我能解释 Agent / Permission / Tool 如何一起定义行为边界。"],
  ),
  lesson(
    "lesson-4",
    "04 VSCode扩展与客户端接入",
    "模块 B",
    "理解接入链",
    "3-4 小时",
    "搞清扩展端不是主体，而是通过共享连接接入核心运行时。",
    [
      { label: "课程讲义", path: "learn-kilo/04-VSCode扩展与客户端接入/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/04-VSCode扩展与客户端接入/03-实验与练习.md" },
      { label: "extension.ts", path: "packages/kilo-vscode/src/extension.ts" },
      { label: "ServerManager", path: "packages/kilo-vscode/src/services/cli-backend/server-manager.ts" },
      { label: "ConnectionService", path: "packages/kilo-vscode/src/services/cli-backend/connection-service.ts" },
    ],
    tab(
      "课程定位",
      [
        "这节课负责把扩展端彻底摆回正确位置。你要知道扩展不是系统主体，而是宿主接入层。",
        "同时你也要理解为什么共享连接是多视图体验成立的前提。",
      ],
      ["三层职责。", "ServerManager 管进程生命周期。", "ConnectionService 管共享连接与广播。"],
      "扩展课学对了，后面做客户端二开会稳定很多。",
    ),
    tab(
      "设计解剖",
      [
        "`extension.ts` 装配所有能力，`ServerManager` 拉起本地 CLI backend，`KiloConnectionService` 把 SDK / SSE / 多视图状态广播组织起来。",
        "Agent Manager 的复杂度主要来自客户端编排，而不是后端重做。",
      ],
      ["扩展端的价值是稳定接入核心运行时。", "共享连接防止状态世界分裂。", "多会话编排不等于另一套后端。"],
      "不要把所有扩展问题都先归到 UI。",
    ),
    tab(
      "训练任务",
      [
        "你会先不看源码画扩展接入链，再回到 `ServerManager` 和 `KiloConnectionService` 里验证共享连接与进程生命周期。",
        "练习会直接训练你以后做扩展侧二开时的切层能力。",
      ],
      ["扩展接入链图。", "ServerManager 生命周期分析。", "共享连接必要性解释。"],
      "这节课的练习重点是“接入和同步”，不是“页面样子”。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该知道一个扩展侧需求到底是 extension host 问题、连接层问题，还是 webview UI 问题。",
        "这会直接提高你后面定位扩展问题的速度。",
      ],
      ["扩展接入链图。", "ServerManager / ConnectionService 对比表。", "关于 Agent Manager 的说明。"],
      "这一课交付的是客户端接入视角。",
    ),
    ["我能解释扩展端三层职责。", "我能解释为什么多个视图要共享同一个连接世界。", "我能解释 Agent Manager 的工程定位。"],
  ),
  lesson(
    "lesson-5",
    "05 Kilo差异层与平台能力",
    "模块 B",
    "识别 fork 边界",
    "2.5-3.5 小时",
    "识别 Kilo 的真实平台增量，并理解为何要集中管理 fork 差异。",
    [
      { label: "课程讲义", path: "learn-kilo/05-Kilo差异层与平台能力/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/05-Kilo差异层与平台能力/03-实验与练习.md" },
      { label: "Config", path: "packages/opencode/src/config/config.ts" },
      { label: "kilo-gateway", path: "packages/kilo-gateway/src/index.ts" },
      { label: "kilo-telemetry", path: "packages/kilo-telemetry/src/index.ts" },
    ],
    tab(
      "课程定位",
      [
        "这节课专门讲 Kilo 的平台差异层，让你不再把 Kilo 理解成 OpenCode 的品牌变体。",
        "你会开始真正意识到 fork 项目的长期成本和边界控制。",
      ],
      ["Kilo 差异是平台能力层。", "Config 迁移承载历史演化成本。", "Gateway 和 Telemetry 是平台能力入口。"],
      "fork 项目里，差异管理本身就是核心能力。",
    ),
    tab(
      "设计解剖",
      [
        "Kilo 的差异主要集中在 auth、gateway、telemetry、organization modes 和 legacy config migration。",
        "这些能力如果散落在 shared 文件里，会直接提高后续和 upstream 合并的成本。",
      ],
      ["平台差异不是 UI 差异。", "差异要尽量放进 Kilo 专属路径。", "必要时才在 shared 主链里加 `kilocode_change`。"],
      "这节课会决定你以后做 Kilo 专属改动时是否稳定。",
    ),
    tab(
      "训练任务",
      [
        "你会先不看源码列出 Kilo 平台差异，再回到共享文件和 Kilo 专属包里验证差异落点。",
        "这种练习会直接训练你以后做 fork 项目改动时的边界意识。",
      ],
      ["平台差异清单。", "平台能力关系图。", "差异落点判断。"],
      "边界意识和功能实现一样重要。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该知道哪些需求应优先落在 Kilo 专属路径，也知道什么时候必须标记 `kilocode_change`。",
        "这会直接影响你未来改动的 merge 风险。",
      ],
      ["差异落点清单。", "平台能力图。", "关于差异集中管理的说明文。"],
      "这一课交付的是 fork 项目的平台边界视角。",
    ),
    ["我能指出 Kilo 的真实平台增量主要分布在哪里。", "我能解释 `kilocode_change` 为什么重要。", "我能判断一个需求是否应该优先改在 Kilo 专属路径。"],
  ),
  lesson(
    "lesson-6",
    "06 二次开发工作流",
    "模块 C",
    "把理解变成改动",
    "2.5-3.5 小时",
    "学会把真实需求拆成正确的改动路径、风险判断和最小实施方案。",
    [
      { label: "课程讲义", path: "learn-kilo/06-二次开发工作流/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/06-二次开发工作流/03-实验与练习.md" },
      { label: "二开手册", path: "learn-kilo/KiloCode二开手册.md" },
      { label: "ToolRegistry", path: "packages/opencode/src/tool/registry.ts" },
    ],
    tab(
      "课程定位",
      [
        "这是整套课程从“理解”走向“会改”的关键一课。你会开始用真实需求来反推改动路径、风险和验证。",
        "这里最重要的不是多写方案，而是把判层和边界控制变成稳定习惯。",
      ],
      ["先判层，再定位主链。", "先控制边界，再做实现。", "先写最小方案，再回源码验证。"],
      "这节课之后，你开始真正具备“能负责一小段改动”的能力。",
    ),
    tab(
      "设计解剖",
      [
        "二开工作流并不是编码速度竞赛，而是落点判断和风险控制能力。你要知道什么时候会波及 SDK，什么时候会进入 Kilo 差异层，什么时候只是客户端接入。",
        "课程会把这些判断拆成可重复的动作链。",
      ],
      ["需求 -> 层级 -> 主链 -> 风险 -> 验证。", "route 改动天然要想到 SDK。", "fork 仓库的边界控制比单仓库更关键。"],
      "真正成熟的二开能力，体现在动手前的判断质量。",
    ),
    tab(
      "训练任务",
      [
        "你会先不看源码为 3 个真实需求写最小改动路径和风险点，再拿其中一条回到仓库验证落点。",
        "这会直接把前面学到的结构和主链变成实际方案能力。",
      ],
      ["需求拆路径。", "SDK / Kilo 差异层判断。", "一页实施方案。"],
      "这节课最核心的练习是把“理解”压成“改造计划”。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该已经能把一个需求拆成“改哪、为什么、风险是什么、怎么验”。",
        "这意味着你已经开始具备真实二开方案能力。",
      ],
      ["最小改动路径。", "实施方案。", "SDK / Kilo 差异层判断表。"],
      "方案意识，是二开能力最明显的标志。",
    ),
    ["我能把一个需求拆成清晰的改动路径。", "我能判断 route / tool / agent / client 改动各自的波及面。", "我能写出一份小而完整的实施方案。"],
  ),
  lesson(
    "lesson-7",
    "07 测试调试与交付",
    "模块 C",
    "会改也要会交付",
    "2-3 小时",
    "建立针对不同改动类型的验证、调试和交付清单。",
    [
      { label: "课程讲义", path: "learn-kilo/07-测试调试与交付/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/07-测试调试与交付/03-实验与练习.md" },
      { label: "根 AGENTS", path: "AGENTS.md" },
      { label: "CLI AGENTS", path: "packages/opencode/AGENTS.md" },
    ],
    tab(
      "课程定位",
      [
        "这节课把“能改”进一步收束成“能交付”。你要学会根据改动类型选择最小验证链，而不是机械地全跑一遍。",
        "同时也要把 fork 项目的额外交付约束纳入稳定习惯。",
      ],
      ["验证跟着改动类型走。", "调试先抓主链。", "交付要把 SDK、source links、`kilocode_change` 一起考虑。"],
      "会改，不等于能稳定交付。",
    ),
    tab(
      "设计解剖",
      [
        "不同改动会影响不同链。核心运行时优先看 typecheck 和 CLI 测试，route 改动要想到 SDK，扩展改动要重视连接主链，Kilo 差异改动要重视 fork 约束。",
        "这一课会把这些判断沉淀成可复用的检查表。",
      ],
      ["最小验证链。", "主链排查顺序。", "fork 项目交付约束。"],
      "真正稳的交付，不靠蛮力，而靠判断。",
    ),
    tab(
      "训练任务",
      [
        "你会先写 4 类改动的验证清单和扩展连接排查顺序，再对照真实仓库命令和主链修正它们。",
        "这样以后再做小改动时，就已经有一套自己的交付检查表。",
      ],
      ["验证清单。", "扩展排查顺序。", "交付检查表。"],
      "交付检查表不是形式主义，而是减少遗漏的最有效手段。",
    ),
    tab(
      "交付结果",
      [
        "完成这节课后，你应该能为不同类型改动写出最小验证方案，也知道扩展端连接问题该按什么顺序排查。",
        "这会让你的毕业项目和后续真实改动都稳很多。",
      ],
      ["4 类改动验证清单。", "扩展连接排查顺序。", "个人交付检查表。"],
      "这一课交付的是稳定交付能力。",
    ),
    ["我能为核心、route、扩展、Kilo 平台改动分别写验证清单。", "我知道扩展端连接问题该按什么顺序排查。", "我已经建立自己的交付检查表。"],
  ),
  lesson(
    "lesson-8",
    "08 毕业项目",
    "模块 D",
    "证明你真的会了",
    "4-8 小时",
    "完成一个真实、小而完整的分析或改动项目，证明自己具备 KiloCode 二开能力。",
    [
      { label: "课程说明", path: "learn-kilo/08-毕业项目/01-课程说明.md" },
      { label: "课程讲义", path: "learn-kilo/08-毕业项目/02-课程讲义.md" },
      { label: "实验练习", path: "learn-kilo/08-毕业项目/03-实验与练习.md" },
      { label: "复盘与作业", path: "learn-kilo/08-毕业项目/04-复盘与作业.md" },
    ],
    tab(
      "课程定位",
      [
        "毕业项目是整套课程最后一次能力验证。你要证明自己已经能定位、解释、改动和交付，而不只是“继续看更多代码”。",
        "题目必须小而完整，不能大而空。",
      ],
      ["先缩题。", "先写无源码版项目说明。", "再建立证据链与成果。"],
      "毕业项目不是扩写总结，而是能力证明。",
    ),
    tab(
      "设计解剖",
      [
        "好的毕业项目会把一条主链、一组抽象或一个小型改动讲透，而不是试图覆盖整个仓库。",
        "评分最看重的是边界、证据链、设计判断和验证，而不是篇幅。",
      ],
      ["边界清楚。", "证据链真实。", "验证方式靠谱。"],
      "真正能体现成长的，是你已经会把理解组织成别人也能用的成果。",
    ),
    tab(
      "训练任务",
      [
        "你会先写无源码版项目说明，再建立 5 到 10 个关键文件组成的证据链，然后完成方案、成果、验证和复盘。",
        "如果是改动型题目，还要把风险和验证说明清楚。",
      ],
      ["缩题。", "无源码版项目说明。", "源码证据链和成果。"],
      "毕业项目是在演练你以后真实接手一个需求时的完整动作链。",
    ),
    tab(
      "交付结果",
      [
        "毕业项目通过后，你应该已经能让别人看出: 你不是只看过 KiloCode，而是真的知道它怎么跑、为什么这样设计，以及你会从哪里开始改。",
        "这也是整个课程前端页面最终想表达的终点。",
      ],
      ["明确题目边界。", "完整源码证据链。", "可检验的成果、验证和复盘。"],
      "毕业的标志，不是学完，而是已经能输出。",
    ),
    ["我的题目范围足够小而完整。", "我的成果建立在真实源码证据链之上。", "我的结果可以被别人检验。"],
  ),
]

const tabNames = {
  overview: "课程定位",
  design: "设计解剖",
  practice: "训练任务",
  deliver: "交付结果",
}

const stateKey = "learn-kilo-course-site-progress-v4"
const tabKey = "learn-kilo-course-site-tab-v4"
const lessonKey = "learn-kilo-course-site-lesson-v1"
const viewKey = "learn-kilo-course-site-view-v1"
const moduleKey = "learn-kilo-course-site-module-v1"
const progressState = JSON.parse(localStorage.getItem(stateKey) || "{}")
const lessonIds = lessons.map((item) => item.id)
const moduleIds = ["all", ...modules.map((item) => item.title)]
const viewIds = ["all", "materials", "lessons", "graduation"]
let currentLesson = pick(localStorage.getItem(lessonKey) || "", lessonIds, lessons[0].id)
let currentTab = pick(localStorage.getItem(tabKey) || "", Object.keys(tabNames), "overview")
let currentView = pick(localStorage.getItem(viewKey) || "", viewIds, "all")
let currentModule = pick(localStorage.getItem(moduleKey) || "", moduleIds, "all")

if (currentView === "graduation") {
  currentModule = "模块 D"
  currentLesson = "lesson-8"
}

const materialNav = document.getElementById("material-nav")
const nav = document.getElementById("lesson-nav")
const materialsGrid = document.getElementById("materials-grid")
const taskList = document.getElementById("task-list")
const moduleGrid = document.getElementById("module-grid")
const summaryGrid = document.getElementById("summary-grid")
const flowStrip = document.getElementById("flow-strip")
const lessonTitle = document.getElementById("lesson-title")
const lessonMeta = document.getElementById("lesson-meta")
const viewSwitch = document.getElementById("view-switch")
const moduleFilter = document.getElementById("module-filter")
const tabBar = document.getElementById("tab-bar")
const tabPanel = document.getElementById("tab-panel")
const structureList = document.getElementById("structure-list")
const fileList = document.getElementById("file-list")
const checks = document.getElementById("checks")
const progressPercent = document.getElementById("progress-percent")
const progressText = document.getElementById("progress-text")
const ringValue = document.querySelector(".ring-value")

function pick(value, items, fallback) {
  if (items.includes(value)) return value
  return fallback
}

function href(path) {
  if (path.startsWith("learn-kilo/")) return `../${path.slice("learn-kilo/".length)}`
  return `../../${path}`
}

function getLesson(id) {
  return lessons.find((item) => item.id === id) || lessons[0]
}

function filteredLessons() {
  if (currentModule === "all") return lessons
  return lessons.filter((item) => item.module === currentModule)
}

function save() {
  localStorage.setItem(stateKey, JSON.stringify(progressState))
  localStorage.setItem(tabKey, currentTab)
  localStorage.setItem(lessonKey, currentLesson)
  localStorage.setItem(viewKey, currentView)
  localStorage.setItem(moduleKey, currentModule)
}

function renderMaterialNav() {
  materialNav.innerHTML = ""
  materials.forEach((item) => {
    const link = document.createElement("a")
    link.className = "quick-link"
    link.href = href(item.path)
    link.textContent = item.title
    materialNav.appendChild(link)
  })
}

function renderNav() {
  nav.innerHTML = ""
  filteredLessons().forEach((lesson, index) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `lesson-link ${lesson.id === currentLesson ? "active" : ""}`
    const done = (progressState[lesson.id] || []).filter(Boolean).length
    btn.innerHTML = `<strong>${String(index).padStart(2, "0")} · ${lesson.title}</strong><span>${lesson.module} · ${lesson.kicker} · ${done}/${lesson.checks.length}</span>`
    btn.addEventListener("click", () => {
      currentLesson = lesson.id
      renderAll()
    })
    nav.appendChild(btn)
  })
}

function renderMaterials() {
  materialsGrid.innerHTML = ""
  materials.forEach((item) => {
    const card = document.createElement("article")
    card.className = "resource-card"
    card.innerHTML = `
      <div class="eyebrow">${item.type}</div>
      <h4>${item.title}</h4>
      <p>${item.summary}</p>
      <ul>${item.points.map((point) => `<li>${point}</li>`).join("")}</ul>
      <a class="resource-link" href="${href(item.path)}">打开文档</a>
    `
    materialsGrid.appendChild(card)
  })
}

function renderSummary() {
  summaryGrid.innerHTML = ""
  summaryCards.forEach((item) => {
    const card = document.createElement("article")
    card.className = "summary-card"
    card.innerHTML = `
      <div class="eyebrow">${item.label}</div>
      <strong>${item.value}</strong>
      <span>${item.detail}</span>
    `
    summaryGrid.appendChild(card)
  })
}

function renderFlow() {
  flowStrip.innerHTML = ""
  learningFlow.forEach((item, index) => {
    const row = document.createElement("div")
    row.className = "flow-step"
    row.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><p>${item}</p>`
    flowStrip.appendChild(row)
  })
}

function renderTasks() {
  taskList.innerHTML = ""
  tasks.forEach((item, index) => {
    const row = document.createElement("div")
    row.className = "task-row"
    row.innerHTML = `<span class="task-index">${String(index + 1).padStart(2, "0")}</span><p>${item}</p>`
    taskList.appendChild(row)
  })
}

function renderModules() {
  moduleGrid.innerHTML = ""
  modules.forEach((item) => {
    const card = document.createElement("article")
    card.className = `module-card ${currentModule === item.title ? "selected" : ""}`
    card.innerHTML = `
      <div class="eyebrow">${item.title}</div>
      <h4>${item.name}</h4>
      <p>${item.summary}</p>
      <ul>${item.lessons.map((lesson) => `<li>${lesson}</li>`).join("")}</ul>
    `
    card.addEventListener("click", () => {
      currentView = "lessons"
      currentModule = item.title
      const list = filteredLessons()
      currentLesson = list[0]?.id ?? currentLesson
      renderAll()
      document.getElementById("lessons-section").scrollIntoView({ behavior: "smooth", block: "start" })
    })
    moduleGrid.appendChild(card)
  })
}

function renderViewSwitch() {
  viewSwitch.innerHTML = ""
  const items = [
    { id: "all", label: "全部" },
    { id: "materials", label: "主教材" },
    { id: "lessons", label: "课程" },
    { id: "graduation", label: "毕业项目" },
  ]
  items.forEach((item) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `chip ${currentView === item.id ? "active" : ""}`
    btn.textContent = item.label
    btn.addEventListener("click", () => {
      currentView = item.id
      if (item.id === "graduation") {
        currentModule = "模块 D"
        currentLesson = "lesson-8"
      }
      if (item.id === "all") {
        currentModule = "all"
      }
      renderAll()
    })
    viewSwitch.appendChild(btn)
  })
}

function renderModuleFilter() {
  moduleFilter.innerHTML = ""
  const items = ["all", ...modules.map((item) => item.title)]
  items.forEach((item) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `chip ${currentModule === item ? "active" : ""}`
    btn.textContent = item === "all" ? "全部模块" : item
    btn.addEventListener("click", () => {
      currentModule = item
      const list = filteredLessons()
      if (!list.find((lesson) => lesson.id === currentLesson)) {
        currentLesson = list[0]?.id ?? lessons[0].id
      }
      renderAll()
    })
    moduleFilter.appendChild(btn)
  })
}

function renderMeta(lesson) {
  lessonMeta.innerHTML = ""
  ;[lesson.module, lesson.kicker, `建议时长: ${lesson.duration}`, `目标: ${lesson.outcome}`].forEach((text) => {
    const pill = document.createElement("span")
    pill.className = "meta-pill"
    pill.textContent = text
    lessonMeta.appendChild(pill)
  })
}

function renderTabs(lesson) {
  tabBar.innerHTML = ""
  Object.entries(tabNames).forEach(([key, label]) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `tab-btn ${currentTab === key ? "active" : ""}`
    btn.textContent = label
    btn.addEventListener("click", () => {
      currentTab = key
      save()
      renderTabs(lesson)
      renderPanel(lesson)
    })
    tabBar.appendChild(btn)
  })
}

function renderPanel(lesson) {
  const data = lesson.tabs[currentTab]
  tabPanel.innerHTML = `
    <h4>${data.title}</h4>
    ${data.body.map((item) => `<p>${item}</p>`).join("")}
    <ul>${data.points.map((item) => `<li>${item}</li>`).join("")}</ul>
    <div class="callout">${data.callout}</div>
  `
}

function renderStructure(lesson) {
  structureList.innerHTML = ""
  lesson.structure.forEach((item) => {
    const card = document.createElement("div")
    card.className = "stack-item"
    card.innerHTML = `<strong>${item.title}</strong><span>${item.detail}</span>`
    structureList.appendChild(card)
  })
}

function renderFiles(lesson) {
  fileList.innerHTML = ""
  lesson.files.forEach((file) => {
    const li = document.createElement("li")
    li.innerHTML = `<a href="${href(file.path)}">${file.label}</a>`
    fileList.appendChild(li)
  })
}

function renderChecks(lesson) {
  checks.innerHTML = ""
  lesson.checks.forEach((item, index) => {
    const row = document.createElement("div")
    row.className = "check-row"
    const checked = progressState[lesson.id]?.[index] ?? false
    row.innerHTML = `<input id="${lesson.id}-${index}" type="checkbox" ${checked ? "checked" : ""}><label for="${lesson.id}-${index}">${item}</label>`
    row.querySelector("input").addEventListener("change", (event) => {
      progressState[lesson.id] ||= []
      progressState[lesson.id][index] = event.target.checked
      save()
      renderNav()
      renderProgress()
    })
    checks.appendChild(row)
  })
}

function renderProgress() {
  const total = lessons.reduce((sum, lesson) => sum + lesson.checks.length, 0)
  const done = lessons.reduce((sum, lesson) => sum + (progressState[lesson.id] || []).filter(Boolean).length, 0)
  const percent = total ? Math.round((done / total) * 100) : 0
  progressPercent.textContent = `${percent}%`
  progressText.textContent =
    percent === 0
      ? "先从主教材和实施任务开始，再进入导读和分课训练。"
      : percent < 35
        ? "你正在建立 KiloCode 的系统地图和运行时主链。"
        : percent < 70
          ? "你已经进入设计解剖阶段，继续拆会话系统、客户端接入和 Kilo 差异层。"
          : percent < 100
            ? "你已经进入二开方案、验证和交付阶段，准备把理解收束成成果。"
            : "所有检查项已完成，去完成毕业项目并产出你的 KiloCode 二开成果。"

  const circumference = 289
  const offset = circumference - (circumference * percent) / 100
  ringValue.style.strokeDashoffset = String(offset)
}

function renderLesson() {
  const lesson = getLesson(currentLesson)
  lessonTitle.textContent = lesson.title
  renderMeta(lesson)
  renderTabs(lesson)
  renderPanel(lesson)
  renderStructure(lesson)
  renderFiles(lesson)
  renderChecks(lesson)
}

function applyView() {
  const materials = document.getElementById("materials-section")
  const lessons = document.getElementById("lessons-section")
  if (currentView === "all") {
    materials.style.display = ""
    lessons.style.display = ""
    return
  }
  if (currentView === "materials") {
    materials.style.display = ""
    lessons.style.display = "none"
    return
  }
  if (currentView === "lessons") {
    materials.style.display = "none"
    lessons.style.display = ""
    return
  }
  materials.style.display = "none"
  lessons.style.display = ""
}

function renderAll() {
  renderMaterialNav()
  renderSummary()
  renderFlow()
  renderViewSwitch()
  renderModuleFilter()
  applyView()
  renderNav()
  renderMaterials()
  renderTasks()
  renderModules()
  renderLesson()
  renderProgress()
  save()
}

document.getElementById("go-materials").addEventListener("click", () => {
  document.getElementById("materials-section").scrollIntoView({ behavior: "smooth", block: "start" })
})

document.getElementById("go-lessons").addEventListener("click", () => {
  document.getElementById("lessons-section").scrollIntoView({ behavior: "smooth", block: "start" })
})

renderAll()
