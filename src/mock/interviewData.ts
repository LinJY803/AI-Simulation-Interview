/**
 * mock/interviewData.ts — 面试模拟数据集
 *
 * 用于前端开发和调试，无需后端即可完整运行所有页面功能。
 * 所有数据与 store/interview.ts 中的类型定义完全对齐。
 *
 * ── 使用方式 ──────────────────────────────────────────
 * ```
 * import { mockInterviewDetail, mockAnalysisList, mockHistoryList } from '@/mock/interviewData'
 *
 * // 获取某次面试的完整对话 + 评分
 * const detail = mockInterviewDetail
 * detail.messages  // InterviewMessage[]
 * detail.analysis  // InterviewAnalysis
 *
 * // 获取多份不同风格的评分报告
 * const report = mockAnalysisList[0]  // 优秀报告
 * ```
 *
 * 数据覆盖场景：
 * - 3 种难度 × 3 种岗位 = 多样化对话内容
 * - 4 种评分等级：优秀(4.5+) / 良好(3.5-4.4) / 一般(2.5-3.4) / 较差(<2.5)
 * - 技术面试 / 行为面试 / 综合面试不同追问风格
 */

import type {
  InterviewRecord,
  InterviewMessage,
  InterviewAnalysis,
  InterviewConfig,
  AnswerQuality,
  RealtimeScores,
} from "@/store/interview";

// ==================== 1. 多轮对话示例 ====================

/**
 * 完整的前端面试对话记录（8 轮，中等难度）
 * 涵盖：自我介绍 → 项目经验 → 技术深度 → 系统设计 → 行为问题 → 收尾
 */
export const mockFrontendConversation: InterviewMessage[] = [
  {
    id: "f_msg_001",
    content:
      "你好！我是今天的 AI 面试官。我们这次面试大约 30 分钟，主要考察你的前端技术能力、项目经验和解决问题的思路。请先做一个简单的自我介绍吧。",
    role: "assistant",
    timestamp: 1700000000000,
  },
  {
    id: "f_msg_002",
    content:
      "你好面试官，我有 3 年的前端开发经验。过去在一家互联网公司负责电商平台的前端架构和性能优化工作。技术栈方面，我熟练掌握 Vue3 全家桶和 React，对 TypeScript 有较深的使用经验。同时也了解 Node.js 和一些后端技术，能独立完成全栈功能开发。",
    role: "user",
    timestamp: 1700000060000,
  },
  {
    id: "f_msg_003",
    content:
      "介绍得很清晰。你提到负责过电商平台的前端架构，能具体说一个你在项目中解决过的最有挑战性的技术问题吗？",
    role: "assistant",
    timestamp: 1700000120000,
  },
  {
    id: "f_msg_004",
    content:
      "最有挑战的是商品详情页的性能优化。当时页面首屏加载时间超过 4 秒，用户跳出率很高。我做了几个方面的优化：\n\n1. **路由懒加载 + 代码分割**：将非首屏组件拆分为独立 chunk，减少初始 bundle 体积 40%\n2. **图片优化**：接入 WebP 格式 + 懒加载 + CDN，图片资源体积减少 60%\n3. **接口预加载**：在用户浏览列表页时就 prefetch 详情页关键接口\n4. **SSR 渲染**：对 SEO 要求高的页面引入 Nuxt 做服务端渲染\n\n最终首屏加载时间从 4.2s 降到了 1.5s，用户跳出率降低了 25%。",
    role: "user",
    timestamp: 1700000300000,
  },
  {
    id: "f_msg_005",
    content:
      "这个优化方案很系统。我想深入问一下：你提到了代码分割，在 Vite 或 Webpack 中，你是如何决定哪些模块需要拆分的？有没有遇到过 chunk 拆分后反而导致性能下降的情况？",
    role: "assistant",
    timestamp: 1700000480000,
  },
  {
    id: "f_msg_006",
    content:
      "我的拆分策略主要是基于路由和组件的使用频率。核心原则是：\n\n- 首屏必需的代码放 main chunk\n- 路由级组件用动态 import() 按需加载\n- 大型第三方库（如 ECharts、lodash）用 vendor chunk 单独打包\n- 低频使用的功能模块（如打印、导出）用异步 chunk\n\n确实遇到过拆分后性能下降的情况。有一次我把 lodash 拆得太细，导致产生了 200+ 个小 chunk，反而增加了 HTTP 请求数和解析开销。后来调整为按功能模块聚合，控制在 20 个左右的 chunk，效果最好。",
    role: "user",
    timestamp: 1700000720000,
  },
  {
    id: "f_msg_007",
    content:
      "处理得很到位。换个话题，如果让你设计一个支持百万级用户的实时协作白板系统，你会从哪些方面考虑技术选型和架构设计？",
    role: "assistant",
    timestamp: 1700000960000,
  },
  {
    id: "f_msg_008",
    content:
      "我会从以下几个层面考虑：\n\n**前端渲染层**：使用 Canvas 2D（简单图形）或 WebGL（复杂渲染）进行绘制，结合虚拟化处理大量图形对象。用 requestAnimationFrame 做渲染循环，控制帧率在 60fps。\n\n**数据同步层**：核心挑战是多用户实时协作的冲突处理。我会采用 OT（Operational Transformation）或 CRDT 算法来解决并发编辑冲突。WebSocket 做双向通信，保证低延迟。\n\n**架构层面**：\n- WebSocket 网关用 Node.js + Socket.IO\n- 消息队列用 Redis Pub/Sub 做房间广播\n- 操作日志持久化到 MongoDB\n- 如果用户量很大，用 Redis 做操作合并和批量推送\n\n**降级方案**：网络不稳定时本地缓存操作队列，恢复连接后批量同步。",
    role: "user",
    timestamp: 1700001200000,
  },
  {
    id: "f_msg_009",
    content:
      "思路很有条理，尤其是提到了降级方案。最后一个问题：你在团队协作中是如何保证代码质量的？有没有推行过什么技术规范或流程改进？",
    role: "assistant",
    timestamp: 1700001440000,
  },
  {
    id: "f_msg_010",
    content:
      "我在团队中推行了几个机制：\n\n1. **代码规范**：制定 ESLint + Prettier 统一配置，配合 husky + lint-staged 做 commit 前自动检查\n2. **Code Review**：所有 MR 至少需要 1 人 review，重点检查：逻辑正确性、边界处理、性能隐患\n3. **单元测试**：核心工具函数和 hooks 要求 80% 以上覆盖率，使用 Vitest 运行\n4. **技术分享**：每两周一次 team sharing，轮流分享学到的新技术或踩过的坑\n\n推行后，线上 bug 数量减少了约 40%，代码的可维护性也明显提升。",
    role: "user",
    timestamp: 1700001680000,
  },
  {
    id: "f_msg_011",
    content:
      "非常棒，今天聊得很好。你对前端技术有扎实的理解和丰富的实践经验。面试结束后你会收到一份详细的分析报告。还有什么问题想问我的吗？",
    role: "assistant",
    timestamp: 1700001920000,
  },
  {
    id: "f_msg_012",
    content:
      "谢谢面试官！我想了解一下，这个岗位的团队目前主要在做什么方向？以及对于新人有什么期望？",
    role: "user",
    timestamp: 1700002060000,
  },
  {
    id: "f_msg_013",
    content:
      "我们团队目前在做 AI + 前端的融合产品，包括你看到的这个面试系统。对新人期望是：基础扎实、学习能力强、有主动性。你的背景很符合，期待后续的好消息！",
    role: "assistant",
    timestamp: 1700002200000,
  },
];

/**
 * 后端开发面试对话（7 轮，高难度）
 * 涵盖：微服务、数据库优化、分布式系统、消息队列
 */
export const mockBackendConversation: InterviewMessage[] = [
  {
    id: "b_msg_001",
    content:
      "你好，欢迎参加后端开发工程师的技术面试。这次面试偏重分布式系统和架构设计，难度较高，请做好准备。先介绍一下你的技术背景吧。",
    role: "assistant",
    timestamp: 1700010000000,
  },
  {
    id: "b_msg_002",
    content:
      "你好，我有 4 年后端开发经验，主要使用 Java 和 Go。在上一家公司负责订单系统的架构设计和高并发改造，QPS 从 500 提升到了 5000。熟悉 Spring Cloud 微服务体系、MySQL 调优、Redis 和 Kafka。",
    role: "user",
    timestamp: 1700010060000,
  },
  {
    id: "b_msg_003",
    content:
      "你说把 QPS 从 500 提到了 5000，这是 10 倍的提升。能具体说说你做了哪些改造？瓶颈分析是怎么做的？",
    role: "assistant",
    timestamp: 1700010180000,
  },
  {
    id: "b_msg_004",
    content:
      "首先用 Arthas 和 Prometheus 做了链路追踪和性能分析，定位到三个瓶颈：\n\n1. **数据库层**：订单查询 SQL 缺少组合索引，慢查询占比 30%。我优化了索引设计，将 P99 响应时间从 200ms 降到 20ms\n2. **连接池**：Druid 连接池配置不合理，maxActive 只有 20。根据压测调整到 100，并引入 HikariCP\n3. **缓存**：热点商品库存数据每次都查 DB，引入 Redis 缓存 + Canal 监听 Binlog 实现缓存更新\n\n另外还做了服务拆分，把单体订单服务拆为订单创建、查询、履约三个独立服务。",
    role: "user",
    timestamp: 1700010420000,
  },
  {
    id: "b_msg_005",
    content:
      "改造方案很全面。关于分布式事务，在订单创建和库存扣减这两个服务之间，你是如何保证数据一致性的？",
    role: "assistant",
    timestamp: 1700010600000,
  },
  {
    id: "b_msg_006",
    content:
      "我们最终选择了 RocketMQ 事务消息方案：\n\n1. 订单服务先发送半消息到 MQ\n2. 执行本地事务（创建订单）\n3. 提交/回滚消息\n4. 库存服务消费消息，执行库存扣减\n5. 如果消费失败，MQ 会重试，超过阈值进入死信队列人工处理\n\n对比过 TCC 和 Saga 方案：TCC 需要每个服务写 compensate 逻辑，侵入性太强；Saga 在长链路中补偿复杂度高。事务消息在保证最终一致性的同时，侵入性最低。",
    role: "user",
    timestamp: 1700010840000,
  },
  {
    id: "b_msg_007",
    content:
      "选型分析很到位。再问一个场景题：如果在双十一大促期间，你的订单系统突然出现了大量请求超时，你会怎么排查和处理？",
    role: "assistant",
    timestamp: 1700011020000,
  },
  {
    id: "b_msg_008",
    content:
      '我会按照"止血 → 排查 → 修复"的步骤处理：\n\n**止血**：\n1. 立即检查监控大盘，确认是哪个服务/接口超时\n2. 如果是下游依赖（如支付服务）挂了，快速开启降级/熔断（Sentinel 配置）\n3. 如果是本服务过载，动态扩容 + 限流，保护核心下单链路\n\n**排查**：\n1. 查看日志是否有异常堆栈\n2. 检查 GC 日志，是否频繁 Full GC\n3. 检查数据库连接池、线程池是否耗尽\n4. 查看 APM 链路追踪定位慢节点\n\n**修复**：\n1. 针对根因修复并发布\n2. 补充对应的监控告警规则\n3. 事后做故障复盘（Postmortem）\n\n预防措施：平时会做全链路压测，提前发现瓶颈。',
    role: "user",
    timestamp: 1700011260000,
  },
  {
    id: "b_msg_009",
    content:
      "应急处理思路很清晰，有实战经验。今天的面试就到这里，感谢你的分享。整体表现不错，等通知结果吧。",
    role: "assistant",
    timestamp: 1700011440000,
  },
];

/**
 * 综合面试对话（6 轮，简单难度）
 * 涵盖：自我介绍 + 基础技术 + 团队协作 + 学习习惯
 */
export const mockMixedConversation: InterviewMessage[] = [
  {
    id: "m_msg_001",
    content:
      "你好！欢迎参加这次综合面试。我们会聊一些技术问题和团队协作相关的话题，不用紧张。先介绍一下你自己吧。",
    role: "assistant",
    timestamp: 1700020000000,
  },
  {
    id: "m_msg_002",
    content:
      "面试官好，我是一名有 2 年经验的全栈开发工程师。主要使用 Vue3 + Node.js 技术栈，对 Docker 和 CI/CD 也有一定了解。之前参与过企业内部管理系统和一个小型 SaaS 产品的开发。",
    role: "user",
    timestamp: 1700020060000,
  },
  {
    id: "m_msg_003",
    content:
      "不错。你提到了 Vue3，能说说 Composition API 相比 Options API 的主要优势是什么？你在实际项目中是如何使用的？",
    role: "assistant",
    timestamp: 1700020180000,
  },
  {
    id: "m_msg_004",
    content:
      "我觉得 Composition API 最大的优势是逻辑复用。Options API 中相关的逻辑被分散在 data、methods、computed 等选项中，代码一多就很难维护。而 Composition API 可以用 composable 函数把相关逻辑组织在一起。\n\n比如我在项目中写了一个 `useTable` 的 composable，封装了分页、排序、筛选的逻辑，多个页面都能复用。另外 setup 语法糖写起来也更简洁。",
    role: "user",
    timestamp: 1700020360000,
  },
  {
    id: "m_msg_005",
    content:
      "理解得不错。在团队协作中，如果你和同事对某个技术方案有分歧，你会怎么处理？",
    role: "assistant",
    timestamp: 1700020480000,
  },
  {
    id: "m_msg_006",
    content:
      "我觉得技术分歧是很正常的。我的做法是：\n\n1. 先认真听对方的观点和理由\n2. 如果能达成共识最好\n3. 如果不能，我会做一个小规模的对比实验或 POC，用数据说话\n4. 最终尊重团队决策，即使不是我倾向的方案\n\n之前在选状态管理方案时，我倾向 Pinia 但同事想用 Vuex。我各写了一个 demo 对比后，团队投票选了 Pinia。",
    role: "user",
    timestamp: 1700020660000,
  },
  {
    id: "m_msg_007",
    content:
      "处理方式很成熟。最后一个问题，你平时是怎么学习新技术的？有没有什么好的方法或资源推荐？",
    role: "assistant",
    timestamp: 1700020780000,
  },
  {
    id: "m_msg_008",
    content:
      "我的学习方式主要有几个：\n\n1. **官方文档**：学新框架先看官方文档，这是最权威的\n2. **实际项目**：学完基础后一定要在项目中实践，光看不做很容易忘\n3. **技术社区**：经常看掘金、GitHub Trending、Hacker News\n4. **源码阅读**：对于常用的库（如 Vue、Axios）会抽时间看源码，理解设计思想\n\n最近在学习 Rust 和 WebAssembly，觉得性能优化方向很有前景。",
    role: "user",
    timestamp: 1700020960000,
  },
  {
    id: "m_msg_009",
    content:
      "学习习惯很好，保持好奇心很重要。今天的面试就到这里，感谢你的时间，后续会有结果通知。",
    role: "assistant",
    timestamp: 1700021100000,
  },
];

// ==================== 2. AI 评分数据 ====================

/**
 * 优秀评分（综合 4.5+）
 * 适用于表现突出的候选人
 */
export const mockAnalysisExcellent: InterviewAnalysis = {
  technicalScore: 4.6,
  communicationScore: 4.5,
  problemSolvingScore: 4.7,
  overallScore: 4.6,
  strengths: [
    "对核心技术栈有深入理解，能结合实际项目经验阐述技术选型依据",
    "面对系统设计问题思路清晰，能从多个层面（前端渲染、数据同步、架构、降级）给出完整方案",
    "具备良好的性能优化意识，有量化的优化成果（首屏 4.2s → 1.5s）",
    "团队协作能力强，有实际推行技术规范和流程改进的经验",
    "善于总结复盘，能从失败中提取经验教训",
  ],
  weaknesses: [
    "对于 WebAssembly 等前沿技术的实际应用经验可以进一步积累",
    "在超大规模系统的设计经验上可以更多涉猎（千万级以上用户）",
  ],
  suggestions: [
    "建议深入学习编译原理和底层运行时，为探索 Wasm 等前沿方向打好基础",
    "可以参与开源项目贡献，提升在大型分布式系统方面的实战经验",
    "推荐阅读《DDIA（数据密集型应用系统设计）》，加深对分布式系统的理解",
    "可以尝试写技术博客分享你的优化实践，建立个人技术品牌",
  ],
};

/**
 * 良好评分（综合 3.5-4.4）
 * 适用于表现中上等的候选人
 */
export const mockAnalysisGood: InterviewAnalysis = {
  technicalScore: 3.8,
  communicationScore: 3.6,
  problemSolvingScore: 3.9,
  overallScore: 3.8,
  strengths: [
    "技术基础扎实，对常用框架有较好的使用经验",
    "能较清晰地表达技术思路和方案",
    "有一定的性能优化意识，了解常见的优化手段",
  ],
  weaknesses: [
    "系统设计能力有待提升，方案缺乏全局视角",
    "对底层原理的掌握不够深入，回答偏重应用层面",
    "技术选型的对比分析能力需要加强",
  ],
  suggestions: [
    "建议深入学习浏览器渲染原理、网络协议等底层知识",
    "多阅读优秀的开源项目源码，理解设计模式和架构思想",
    "练习在白板上进行系统设计，培养从 0 到 1 的设计能力",
    "建议参加技术社区的活动，拓宽技术视野",
  ],
};

/**
 * 一般评分（综合 2.5-3.4）
 * 适用于表现一般的候选人
 */
export const mockAnalysisAverage: InterviewAnalysis = {
  technicalScore: 2.8,
  communicationScore: 3.0,
  problemSolvingScore: 2.6,
  overallScore: 2.8,
  strengths: ["对基础技术概念有基本了解", "回答态度认真，愿意主动思考"],
  weaknesses: [
    "技术深度不足，对常见问题的原理理解不够透彻",
    "项目经验描述偏表面，缺乏对技术难点的深入剖析",
    "系统设计能力薄弱，无法给出完整的架构方案",
    "代码质量意识有待加强",
  ],
  suggestions: [
    "建议制定系统的学习计划，按照基础 → 进阶 → 专题的路径逐步提升",
    "重点补充 JavaScript 核心、CSS 布局、HTTP 协议等基础知识",
    "在实际项目中刻意练习性能优化和问题排查",
    "多参与 Code Review 学习优秀代码的写法",
    "推荐刷 LeetCode 中等难度题目，提升算法思维",
  ],
};

/**
 * 较差评分（综合 < 2.5）
 * 适用于表现不达标的候选人
 */
export const mockAnalysisPoor: InterviewAnalysis = {
  technicalScore: 1.8,
  communicationScore: 2.2,
  problemSolvingScore: 1.5,
  overallScore: 1.8,
  strengths: ["对部分基础概念有初步了解"],
  weaknesses: [
    "技术基础薄弱，多个基础问题回答错误或不完整",
    "缺乏实际项目经验，无法将知识应用到具体场景",
    "沟通表达不够清晰，回答缺乏条理",
    "面对追问时容易慌乱，无法冷静分析",
    "解决问题的方法论缺失",
  ],
  suggestions: [
    "建议先夯实基础，推荐系统地学习一门核心技术栈",
    "通过小型个人项目积累实践经验",
    "练习结构化表达，回答时先列框架再填充细节",
    "每天坚持刷算法题，培养逻辑思维习惯",
    "建议找一位有经验的导师指导学习方向",
  ],
};

/** 评分报告列表（方便按等级快速取用） */
export const mockAnalysisList: InterviewAnalysis[] = [
  mockAnalysisExcellent,
  mockAnalysisGood,
  mockAnalysisAverage,
  mockAnalysisPoor,
];

// ==================== 3. 完整面试记录 ====================

/**
 * 完整的前端面试记录（含对话 + 分析报告）
 * 可直接赋值给 store.currentInterview 或用于历史记录展示
 */
export const mockInterviewDetail: InterviewRecord = {
  id: "interview_mock_frontend_001",
  title: "前端开发工程师 - 中等难度",
  startTime: 1700000000000,
  endTime: 1700002200000,
  duration: 2200000, // 约 36 分钟
  status: "completed",
  score: 4.6,
  messages: mockFrontendConversation,
  analysis: mockAnalysisExcellent,
};

/**
 * 完整的后端面试记录
 */
export const mockBackendInterview: InterviewRecord = {
  id: "interview_mock_backend_001",
  title: "后端开发工程师 - 困难难度",
  startTime: 1700010000000,
  endTime: 1700011440000,
  duration: 1440000, // 约 24 分钟
  status: "completed",
  score: 4.2,
  messages: mockBackendConversation,
  analysis: mockAnalysisGood,
};

/**
 * 完整的综合面试记录
 */
export const mockMixedInterview: InterviewRecord = {
  id: "interview_mock_mixed_001",
  title: "全栈工程师 - 简单难度",
  startTime: 1700020000000,
  endTime: 1700021100000,
  duration: 1100000, // 约 18 分钟
  status: "completed",
  score: 3.8,
  messages: mockMixedConversation,
  analysis: mockAnalysisGood,
};

// ==================== 4. 面试历史列表 ====================

/**
 * 模拟面试历史列表（8 条记录，不同岗位/难度/评分）
 * 可直接用于 History.vue 页面的表格展示
 */
export const mockHistoryList: InterviewRecord[] = [
  mockInterviewDetail,
  mockBackendInterview,
  mockMixedInterview,
  {
    id: "interview_mock_004",
    title: "前端开发工程师 - 困难难度",
    startTime: 1700000000000 - 2 * 86400000,
    endTime: 1700000000000 - 2 * 86400000 + 1800000,
    duration: 1800000,
    status: "completed",
    score: 3.2,
    messages: [],
    analysis: mockAnalysisAverage,
  },
  {
    id: "interview_mock_005",
    title: "算法工程师 - 中等难度",
    startTime: 1700000000000 - 4 * 86400000,
    endTime: 1700000000000 - 4 * 86400000 + 2100000,
    duration: 2100000,
    status: "completed",
    score: 2.8,
    messages: [],
    analysis: mockAnalysisPoor,
  },
  {
    id: "interview_mock_006",
    title: "移动端开发工程师 - 简单难度",
    startTime: 1700000000000 - 6 * 86400000,
    endTime: 1700000000000 - 6 * 86400000 + 1200000,
    duration: 1200000,
    status: "completed",
    score: 4.0,
    messages: [],
    analysis: mockAnalysisGood,
  },
  {
    id: "interview_mock_007",
    title: "测试工程师 - 中等难度",
    startTime: 1700000000000 - 8 * 86400000,
    endTime: 0,
    duration: 0,
    status: "canceled",
    score: undefined,
    messages: [],
    analysis: undefined,
  },
  {
    id: "interview_mock_008",
    title: "全栈工程师 - 困难难度",
    startTime: 1700000000000 - 10 * 86400000,
    endTime: 1700000000000 - 10 * 86400000 + 2400000,
    duration: 2400000,
    status: "completed",
    score: 4.3,
    messages: [],
    analysis: mockAnalysisExcellent,
  },
];

// ==================== 5. 面试配置预设 ====================

/** 常用面试配置组合（用于快速选择或展示） */
export const mockInterviewConfigs: InterviewConfig[] = [
  { position: "frontend", difficulty: "easy", duration: 15, type: "technical" },
  { position: "frontend", difficulty: "medium", duration: 30, type: "mixed" },
  { position: "frontend", difficulty: "hard", duration: 45, type: "technical" },
  {
    position: "backend",
    difficulty: "medium",
    duration: 30,
    type: "technical",
  },
  { position: "backend", difficulty: "hard", duration: 60, type: "technical" },
  { position: "fullstack", difficulty: "medium", duration: 30, type: "mixed" },
  {
    position: "algorithm",
    difficulty: "hard",
    duration: 45,
    type: "technical",
  },
  { position: "mobile", difficulty: "easy", duration: 15, type: "behavioral" },
  { position: "qa", difficulty: "medium", duration: 20, type: "behavioral" },
];

// ==================== 6. 实时评分快照 ====================

/** 面试中途的评分快照（可用于 ECharts 初始化数据） */
export const mockRealtimeScoresSnapshots: RealtimeScores[] = [
  { technicalScore: 3.0, communicationScore: 3.0, problemSolvingScore: 3.0 }, // 初始值
  { technicalScore: 3.5, communicationScore: 3.2, problemSolvingScore: 3.3 }, // 第 1 轮后
  { technicalScore: 3.8, communicationScore: 3.5, problemSolvingScore: 3.6 }, // 第 2 轮后
  { technicalScore: 4.0, communicationScore: 3.8, problemSolvingScore: 3.9 }, // 第 3 轮后
  { technicalScore: 4.2, communicationScore: 4.0, problemSolvingScore: 4.1 }, // 第 4 轮后
  { technicalScore: 4.4, communicationScore: 4.2, problemSolvingScore: 4.3 }, // 第 5 轮后
  { technicalScore: 4.5, communicationScore: 4.4, problemSolvingScore: 4.6 }, // 最终
];

/** 回答质量分布快照（用于饼图） */
export const mockAnswerQualitySnapshots: AnswerQuality[] = [
  { excellent: 0, good: 0, average: 0, poor: 0 }, // 初始
  { excellent: 0, good: 1, average: 0, poor: 0 }, // 1 轮
  { excellent: 0, good: 1, average: 1, poor: 0 }, // 2 轮
  { excellent: 1, good: 1, average: 1, poor: 0 }, // 3 轮
  { excellent: 1, good: 2, average: 1, poor: 0 }, // 4 轮
  { excellent: 2, good: 2, average: 1, poor: 0 }, // 5 轮
  { excellent: 3, good: 2, average: 1, poor: 0 }, // 6 轮
];

// ==================== 7. AI 回复池（追问生成） ====================

/**
 * 按面试阶段分类的 AI 追问池
 * 可在 Mock 模式下根据对话轮次选择合适的追问
 */
export const mockFollowUpQuestions = {
  /** 开场阶段 */
  opening: [
    "你好！我是 AI 面试官，很高兴能和你交流。请先做一个简单的自我介绍吧。",
    "欢迎参加面试！先放松一下，简单介绍一下你自己和你最近的工作内容吧。",
  ],
  /** 技术深度追问 */
  technicalDeep: [
    "你提到了这个技术，能详细说明一下它的底层实现原理吗？",
    "如果遇到性能瓶颈，你会从哪些角度入手排查和优化？",
    "你能比较一下它和同类技术的优缺点吗？在什么场景下会选择使用它？",
    "这个方案在高并发场景下可能存在什么问题？你会怎么解决？",
    "如果让你重新设计这个系统，你会做哪些不同的选择？",
    "你对这个技术的最新版本有什么了解？有什么值得关注的更新吗？",
  ],
  /** 项目经验追问 */
  projectExperience: [
    "能详细描述一个你遇到过最有挑战性的技术问题，以及你是如何解决的吗？",
    "在团队协作中，你是如何保证代码质量和项目进度的？",
    "你参与的这个项目，最终的成果和数据表现如何？",
    "如果在项目推进过程中遇到需求变更，你是怎么处理的？",
    "你在这个项目中承担的角色是什么？你是如何和上下游团队协作的？",
  ],
  /** 系统设计追问 */
  systemDesign: [
    "如果让你设计一个高并发系统，你会从哪些方面考虑？",
    "你如何处理分布式系统中的数据一致性问题？",
    "对于服务降级和熔断，你有什么实践经验？",
    "如何设计一个支持百万级用户的实时系统？",
    "在微服务架构中，你是如何做服务拆分和 API 设计的？",
  ],
  /** 行为面试追问 */
  behavioral: [
    "你平时是如何保持技术学习的？有什么推荐的学习资源吗？",
    "你在代码审查中最关注哪些方面？",
    "描述一次你和团队成员有分歧的经历，你是如何处理的？",
    "你对自己未来 3 年的职业发展有什么规划？",
    "你做过最有成就感的一件事是什么？",
  ],
  /** 收尾阶段 */
  closing: [
    "今天的面试就到这里，整体表现不错。你有什么问题想问我的吗？",
    "感谢你的分享，我对你的表现印象深刻。后续会通知结果。",
    "面试结束了，你对今天的发挥满意吗？有没有想补充的内容？",
  ],
};

/**
 * AI 面试官 System Prompt 模板
 * 真实接入 GPT 时使用，指导 AI 扮演面试官角色
 */
export const mockSystemPrompts = {
  /** 技术面试 */
  technical: `你是一位资深的技术面试官，正在进行一场{position}的面试。请遵循以下规则：
1. 根据候选人的回答，提出有针对性的技术追问
2. 考察维度：技术深度、项目经验、系统设计、问题解决能力
3. 每次只问一个问题，等候选人回答后再追问
4. 语气专业但友好，遇到回答不好时给予鼓励
5. 面试共 {duration} 分钟，大约进行 {rounds} 轮对话
6. 难度级别：{difficulty}
7. 不要重复已经问过的问题`,

  /** 行为面试 */
  behavioral: `你是一位资深的行为面试官，正在进行一场{position}的行为面试。请遵循以下规则：
1. 使用 STAR 方法（情境-任务-行动-结果）引导候选人回答
2. 考察维度：沟通能力、团队协作、领导力、抗压能力、学习能力
3. 关注候选人的具体经历和行为细节
4. 语气亲切，营造轻松的面试氛围
5. 面试共 {duration} 分钟，大约进行 {rounds} 轮对话`,

  /** 综合面试 */
  mixed: `你是一位经验丰富的综合面试官，正在对{position}候选人进行全面评估。请遵循以下规则：
1. 交替提出技术问题和行为问题
2. 技术问题占 60%，行为问题占 40%
3. 先从简单的自我介绍和项目经历开始，逐步增加难度
4. 关注候选人的综合素质和发展潜力
5. 面试共 {duration} 分钟，大约进行 {rounds} 轮对话
6. 难度级别：{difficulty}`,
};

// ==================== 8. 工具函数 ====================

/**
 * 从对话池中获取一条随机追问
 * @param category - 追问分类（opening / technicalDeep / projectExperience / ...）
 */
export function getRandomFollowUp(
  category: keyof typeof mockFollowUpQuestions,
): string {
  const pool = mockFollowUpQuestions[category];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 生成指定等级的随机评分
 * @param level - 评分等级：excellent / good / average / poor
 */
export function generateScoreByLevel(
  level: "excellent" | "good" | "average" | "poor",
): InterviewAnalysis {
  const ranges = {
    excellent: { min: 4.0, max: 5.0 },
    good: { min: 3.0, max: 4.0 },
    average: { min: 2.0, max: 3.0 },
    poor: { min: 1.0, max: 2.0 },
  };
  const { min, max } = ranges[level];
  const randomScore = () => +(min + Math.random() * (max - min)).toFixed(1);
  const tech = randomScore();
  const comm = randomScore();
  const prob = randomScore();

  return {
    technicalScore: tech,
    communicationScore: comm,
    problemSolvingScore: prob,
    overallScore: +((tech + comm + prob) / 3).toFixed(1),
    strengths: mockAnalysisList[0].strengths.slice(
      0,
      level === "poor" ? 1 : 3 + Math.floor(Math.random() * 2),
    ),
    weaknesses: mockAnalysisList[0].weaknesses.slice(
      0,
      level === "excellent" ? 1 : 2 + Math.floor(Math.random() * 2),
    ),
    suggestions: mockAnalysisList[0].suggestions.slice(0, 3),
  };
}

/**
 * 从 mock 历史列表中按 ID 查找面试记录
 * @param id - 面试 ID
 */
export function getMockInterviewById(id: string): InterviewRecord | undefined {
  return mockHistoryList.find((item) => item.id === id);
}

/**
 * 生成一份模拟面试记录（随机参数）
 * @param position - 岗位 key
 * @param difficulty - 难度
 */
export function generateMockInterview(
  position: string = "frontend",
  difficulty: "easy" | "medium" | "hard" = "medium",
): InterviewRecord {
  const positionLabels: Record<string, string> = {
    frontend: "前端开发工程师",
    backend: "后端开发工程师",
    fullstack: "全栈工程师",
    mobile: "移动端开发工程师",
    algorithm: "算法工程师",
    qa: "测试工程师",
  };
  const diffLabels: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };

  const startTime = Date.now() - Math.floor(Math.random() * 7) * 86400000;
  const duration = (15 + Math.floor(Math.random() * 45)) * 60 * 1000;
  const level =
    difficulty === "hard"
      ? "average"
      : difficulty === "medium"
        ? "good"
        : "excellent";

  return {
    id: `interview_mock_${Date.now()}`,
    title: `${positionLabels[position] || position} - ${diffLabels[difficulty]}难度`,
    startTime,
    endTime: startTime + duration,
    duration,
    status: "completed",
    score: generateScoreByLevel(
      level as "excellent" | "good" | "average" | "poor",
    ).overallScore,
    messages: [],
    analysis: generateScoreByLevel(
      level as "excellent" | "good" | "average" | "poor",
    ),
  };
}
