/**
 * service/api.ts — 统一 API 服务层
 *
 * 职责划分：
 * 1. 底层 HTTP 客户端（axios 实例 + 拦截器）
 * 2. OpenAI GPT 直连（SSE 流式聊天 / 语音转文字 / 文字转语音 / 自动评分分析）
 * 3. 业务后端接口（面试管理 / 用户认证 / 文件上传）
 * 4. Mock 数据生成器（MOCK_MODE=true 时自动启用，无需后端即可完整运行）
 *
 * ── 使用方式 ──────────────────────────────────────────────────
 *
 *  // 1. SSE 流式聊天（推荐）
 *  const onChunk  = (text: string) => { ... } // 逐段追加到消息
 *  const onDone   = (fullText: string) => { ... } // 流式结束
 *  const onError  = (err: Error) => { ... } // 错误处理
 *  await api.gpt.streamChatSSE(messages, { onChunk, onDone, onError })
 *
 *  // 2. WebSocket 聊天
 *  const ws = api.gpt.connectWebSocket(messages, {
 *    onMessage: (text) => { },
 *    onDone:    (fullText) => { },
 *    onError:   (err) => { },
 *  })
 *  ws.close() // 主动断开
 *
 *  // 3. 语音转文字（Whisper）
 *  const result = await api.gpt.speechToText(audioBlob)
 *  console.log(result.text) // "转写后的文字"
 *
 *  // 4. 面试评分分析
 *  const analysis = await api.gpt.getInterviewAnalysis(interviewId)
 *  console.log(analysis.data) // { technicalScore, communicationScore, ... }
 *
 * ── 环境变量 ──────────────────────────────────────────────────
 *  VITE_API_BASE_URL   - 业务后端地址（默认 http://localhost:3000/api）
 *  VITE_MOCK_MODE      - 是否启用 Mock 模式（默认 true）
 *  VITE_OPENAI_API_KEY - OpenAI API Key（真实调用时必填）
 *  VITE_OPENAI_BASE_URL- OpenAI 兼容 API 地址（默认 https://api.openai.com/v1）
 */

import axios from "axios";
import type { InterviewAnalysis, InterviewMessage, UserInfo } from "@/store";
import { AudioService } from "@/service/audio";

// ==================== 1. 类型定义 ====================

/** 通用 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

/** GPT 聊天消息（OpenAI Chat Completion 格式） */
export interface GptChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** SSE 流式回调配置 */
export interface StreamCallbacks {
  /** 每收到一段文本时调用（对应 SSE 的 data chunk） */
  onChunk: (text: string) => void;
  /** 流式传输完成时调用，参数为完整文本 */
  onDone: (fullText: string) => void;
  /** 出错时调用 */
  onError: (error: Error) => void;
}

/** WebSocket 回调配置 */
export interface WebSocketCallbacks {
  /** 收到消息片段 */
  onMessage: (text: string) => void;
  /** 连接关闭（含完整文本） */
  onDone: (fullText: string) => void;
  /** 连接出错 */
  onError: (error: Event | Error) => void;
}

/** 语音转文字结果 */
export interface SpeechToTextResult {
  text: string;
  language?: string;
  duration?: number;
}

/** 文字转语音结果 */
export interface TextToSpeechResult {
  url: string; // 音频 Blob URL，可直接赋值给 <audio src>
  blob?: Blob; // 原始音频 Blob
}

/** 面试启动参数 */
export interface InterviewStartConfig {
  position: string;
  difficulty: "easy" | "medium" | "hard";
  duration: number;
}

/** 面试历史列表响应 */
export interface InterviewHistoryResult {
  list: Array<{
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    duration: number;
    status: string;
    score: number;
  }>;
  total: number;
  page: number;
  limit: number;
}

/** 面试详情响应 */
export interface InterviewDetailResult {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
  score: number;
  messages: InterviewMessage[];
  analysis?: InterviewAnalysis;
}

/** 用户登录响应 */
export interface LoginResult {
  token: string;
  userInfo: {
    id: number;
    username: string;
    email: string;
    avatar: string;
    role: "admin" | "user";
  };
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: "admin" | "user";
  createdAt: number;
  lastLoginAt?: number;
  bio?: string;
  status?: "active" | "inactive" | "banned";
  skills?: string[];
  notifications?: Array<"email" | "push" | "sms">;
}

export interface UserStats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalDuration: number;
  dailyAverage: number;
  improvementRate: number;
}

export interface ErrorReportPayload {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: number;
  extra?: Record<string, unknown>;
}

// ==================== 2. 环境配置 ====================

/** 是否启用 Mock 模式 */
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

/** 硅基流动 / OpenAI 兼容 API Key（仅在前端直连时使用） */
const OPENAI_API_KEY =
  import.meta.env.VITE_SILICONFLOW_API_KEY ||
  import.meta.env.VITE_OPENAI_API_KEY ||
  "sk-grodljaynvxqturimroetwufoznkqzahrwkhqjgfcnfubngx";

/** 硅基流动 / OpenAI 兼容 API 基础地址 */
const OPENAI_BASE_URL =
  import.meta.env.VITE_SILICONFLOW_BASE_URL ||
  import.meta.env.VITE_OPENAI_BASE_URL ||
  "https://api.siliconflow.cn/v1";

/** 默认模型（硅基流动建议使用普通 deepseek 模型） */
const DEFAULT_CHAT_MODEL =
  import.meta.env.VITE_SILICONFLOW_MODEL ||
  import.meta.env.VITE_OPENAI_MODEL ||
  "deepseek-chat";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// ==================== 3. HTTP 客户端 ====================

/** 业务后端 axios 实例 */
const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/** 请求拦截器：自动附加 JWT Token */
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** 响应拦截器：自动解包 data 字段 */
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("[API Error]", error?.response?.status, error?.message);
    return Promise.reject(error);
  },
);

// ==================== 4. Mock 数据生成器 ====================

/**
 * 生成模拟 API 响应
 * @param data  - 响应 data 字段
 * @param delay - 模拟延迟毫秒数
 */
const mockApiResponse = <T>(
  data: T,
  delay: number = 500,
): Promise<ApiResponse<T>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ code: 200, success: true, message: "请求成功", data });
    }, delay);
  });
};

/** Mock AI 回复池（模拟面试官追问） */
const mockAIResponses: string[] = [
  "这是一个很好的回答。你能详细说明一下你在实际项目中是如何应用这个技术的吗？",
  "你对这个概念的理解很到位。那你能比较一下它和其他类似技术的优缺点吗？",
  "不错的思路！如果遇到性能瓶颈，你会如何优化这个方案？",
  "很好的经验分享。请问在团队协作中，你是如何保证代码质量的？",
  "回答得很清楚。你能描述一个你遇到过的最复杂的技术挑战，以及你是如何解决的吗？",
  "这部分讲得很好。你对系统设计有什么看法？如果让你设计一个高并发系统，你会从哪些方面考虑？",
  "非常有见地。请问你平时是如何保持技术学习的？有什么推荐的学习资源吗？",
  "理解得很透彻。让我换个角度问你：你在代码审查中最关注哪些方面？",
  "回答得很有条理。如果让你从头开始设计一个前端项目架构，你会怎么规划？",
  "不错的见解。关于微前端架构，你有什么看法？在什么场景下会选择使用它？",
];

/** 根据用户输入获取一条 Mock AI 回复 */
function generateMockAIResponse(userContent?: string): string {
  if (!userContent) {
    return "你好！我是 AI 面试官，很高兴能和你交流。请先做一个简单的自我介绍吧。";
  }
  return mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
}

/** 生成 Mock 面试分析报告 */
function generateMockAnalysis(): InterviewAnalysis {
  const tech = +(3 + Math.random() * 2).toFixed(1);
  const comm = +(3 + Math.random() * 2).toFixed(1);
  const prob = +(3 + Math.random() * 2).toFixed(1);
  return {
    technicalScore: tech,
    communicationScore: comm,
    problemSolvingScore: prob,
    overallScore: +((tech + comm + prob) / 3).toFixed(1),
    strengths: [
      "对核心技术概念有扎实的理解",
      "能够清晰地表达技术方案和思路",
      "具备良好的问题分析和解决能力",
    ],
    weaknesses: ["部分高级概念需要进一步深入学习", "系统设计经验有待积累"],
    suggestions: [
      "建议多参与大型项目实践，提升架构设计能力",
      "加强分布式系统和性能优化相关知识",
      "练习在白板上进行系统设计和算法推导",
    ],
  };
}

/** 生成 Mock 面试历史列表 */
function generateMockHistory(
  page: number,
  limit: number,
): InterviewHistoryResult {
  const positions = ["前端开发工程师", "后端开发工程师", "全栈工程师"];
  const difficulties = ["easy", "medium", "hard"];
  const diffLabels: Record<string, string> = {
    easy: "简单",
    medium: "中等",
    hard: "困难",
  };
  const items = Array.from({ length: Math.min(limit, 8) }, (_, i) => {
    const startTime =
      Date.now() - (page - 1) * limit * 86400000 - i * 3 * 86400000;
    const duration = (15 + Math.floor(Math.random() * 45)) * 60 * 1000;
    return {
      id: `interview_mock_${page}_${i}`,
      title: `${positions[i % 3]} - ${diffLabels[difficulties[i % 3]]}难度`,
      startTime,
      endTime: startTime + duration,
      duration,
      status: "completed",
      score: +(3 + Math.random() * 2).toFixed(1),
    };
  });
  return { list: items, total: 8, page, limit };
}

/** 生成 Mock 面试详情 */
function generateMockInterviewDetail(
  interviewId: string,
): InterviewDetailResult {
  const startTime = Date.now() - 86400000;
  const duration = 30 * 60 * 1000;
  return {
    id: interviewId,
    title: "前端开发工程师 - 中等难度",
    startTime,
    endTime: startTime + duration,
    duration,
    status: "completed",
    score: 4.2,
    messages: [
      {
        id: "m1",
        content: "你好！请先做一个自我介绍。",
        role: "assistant" as const,
        timestamp: startTime,
      },
      {
        id: "m2",
        content: "你好，我有3年前端开发经验，熟悉Vue和React。",
        role: "user" as const,
        timestamp: startTime + 60000,
      },
      {
        id: "m3",
        content: "能详细说说你在项目中遇到的最大的技术挑战吗？",
        role: "assistant" as const,
        timestamp: startTime + 120000,
      },
      {
        id: "m4",
        content: "在一次大型项目中，我们需要优化首屏加载性能...",
        role: "user" as const,
        timestamp: startTime + 180000,
      },
    ],
    analysis: generateMockAnalysis(),
  };
}

// ==================== 5. API 接口对象 ====================

export const api = {
  // ─────────────────────────────────────────────
  // 用户认证
  // ─────────────────────────────────────────────
  auth: {
    /**
     * 用户登录
     * @param username - 用户名
     * @param password - 密码
     * @returns ApiResponse<LoginResult>
     *
     * 使用示例：
     * const res = await api.auth.login('admin', '123456')
     * userStore.setToken(res.data.token)
     * userStore.setUserInfo(res.data.userInfo)
     */
    login: async (
      username: string,
      password: string,
    ): Promise<ApiResponse<LoginResult>> => {
      if (MOCK_MODE) {
        return mockApiResponse<LoginResult>({
          token: `mock_jwt_token_${Date.now()}`,
          userInfo: {
            id: Date.now(),
            username,
            email: `${username}@example.com`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            role: username === "admin" ? "admin" : "user",
          },
        });
      }
      return request.post("/auth/login", { username, password }) as Promise<
        ApiResponse<LoginResult>
      >;
    },

    /**
     * 用户注册
     * @param data - { username, email, password }
     */
    register: async (data: {
      username: string;
      email: string;
      password: string;
    }): Promise<
      ApiResponse<{ id: number; username: string; email: string }>
    > => {
      if (MOCK_MODE) {
        return mockApiResponse({
          id: Date.now(),
          username: data.username,
          email: data.email,
        });
      }
      return request.post("/auth/register", data) as Promise<
        ApiResponse<{ id: number; username: string; email: string }>
      >;
    },

    /** 退出登录 */
    logout: (): Promise<ApiResponse<null>> =>
      MOCK_MODE
        ? mockApiResponse(null)
        : (request.post("/auth/logout") as Promise<ApiResponse<null>>),

    /** 退出所有设备 */
    logoutAll: (): Promise<ApiResponse<null>> =>
      MOCK_MODE
        ? mockApiResponse(null)
        : (request.post("/auth/logout-all") as Promise<ApiResponse<null>>),

    /**
     * 获取当前用户信息
     * @returns ApiResponse<UserInfo>
     */
    getUserInfo: (): Promise<ApiResponse<UserInfo>> => {
      if (MOCK_MODE) {
        return mockApiResponse<UserInfo>({
          id: 1,
          username: "admin",
          email: "admin@example.com",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
          role: "admin",
        });
      }
      return request.get("/auth/userinfo") as Promise<ApiResponse<UserInfo>>;
    },
  },

  user: {
    getProfile: async (): Promise<ApiResponse<UserProfile>> => {
      if (MOCK_MODE) {
        return mockApiResponse<UserProfile>({
          id: 1,
          username: "admin",
          email: "admin@example.com",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
          role: "admin",
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          lastLoginAt: Date.now(),
          bio: "前端工程师，热爱学习和分享技术。",
          status: "active",
          skills: ["vue", "typescript", "nodejs"],
          notifications: ["email", "push"],
        });
      }
      return request.get("/user/profile");
    },

    updateProfile: async (
      data: Partial<UserProfile>,
    ): Promise<ApiResponse<UserProfile>> => {
      if (MOCK_MODE) {
        return mockApiResponse<UserProfile>({
          id: 1,
          username: data.username || "admin",
          email: data.email || "admin@example.com",
          avatar:
            data.avatar ||
            "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
          role: (data.role as any) || "admin",
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          lastLoginAt: Date.now(),
          bio: data.bio,
          status: data.status,
          skills: data.skills,
          notifications: data.notifications,
        });
      }
      return request.put("/user/profile", data);
    },

    changePassword: async (data: {
      currentPassword: string;
      newPassword: string;
    }): Promise<ApiResponse<null>> => {
      if (MOCK_MODE) {
        return mockApiResponse(null);
      }
      return request.post("/user/change-password", data);
    },

    getStats: async (): Promise<ApiResponse<UserStats>> => {
      if (MOCK_MODE) {
        return mockApiResponse<UserStats>({
          totalInterviews: 15,
          completedInterviews: 12,
          averageScore: 4.2,
          bestScore: 4.8,
          worstScore: 3.5,
          totalDuration: 12 * 60 * 60 * 1000,
          dailyAverage: 25,
          improvementRate: 15,
        });
      }
      return request.get("/user/stats");
    },
  },

  // ─────────────────────────────────────────────
  // 面试管理
  // ─────────────────────────────────────────────
  interview: {
    /**
     * 开始一场新面试
     * @param config - { position, difficulty, duration }
     * @returns ApiResponse<{ interviewId, status }>
     *
     * 使用示例：
     * const res = await api.interview.startInterview({
     *   position: 'frontend',
     *   difficulty: 'medium',
     *   duration: 30,
     * })
     * console.log(res.data.interviewId) // "interview_1712..."
     */
    startInterview: async (
      config: InterviewStartConfig,
    ): Promise<ApiResponse<{ interviewId: string; status: string }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({
          interviewId: `interview_${Date.now()}`,
          status: "started",
        });
      }
      return request.post("/interview/start", config);
    },

    /**
     * 发送面试消息（获取 AI 回复）
     * @param interviewId - 面试 ID
     * @param content     - 用户消息文本
     * @param audioData   - 可选，语音 Base64 数据
     * @returns ApiResponse<InterviewMessage>
     */
    sendMessage: async (
      interviewId: string,
      content: string,
      audioData?: string,
    ): Promise<ApiResponse<InterviewMessage>> => {
      if (MOCK_MODE) {
        return mockApiResponse<InterviewMessage>(
          {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: generateMockAIResponse(content),
            timestamp: Date.now(),
          },
          1000,
        );
      }
      return request.post(`/interview/${interviewId}/message`, {
        content,
        audioData,
      });
    },

    /**
     * 结束面试并获取分析报告
     * @param interviewId - 面试 ID
     * @returns ApiResponse<InterviewAnalysis>
     */
    endInterview: async (
      interviewId: string,
    ): Promise<ApiResponse<InterviewAnalysis>> => {
      if (MOCK_MODE) {
        return mockApiResponse(generateMockAnalysis(), 1500);
      }
      return request.post(`/interview/${interviewId}/end`);
    },

    /**
     * 获取面试历史列表（分页）
     * @param page  - 页码
     * @param limit - 每页数量
     */
    getInterviewHistory: async (
      page: number = 1,
      limit: number = 10,
    ): Promise<ApiResponse<InterviewHistoryResult>> => {
      if (MOCK_MODE) {
        return mockApiResponse(generateMockHistory(page, limit));
      }
      return request.get("/interview/history", { params: { page, limit } });
    },

    /**
     * 获取面试详情（含完整对话和分析报告）
     * @param interviewId - 面试 ID
     */
    getInterviewDetail: async (
      interviewId: string,
    ): Promise<ApiResponse<InterviewDetailResult>> => {
      if (MOCK_MODE) {
        return mockApiResponse(generateMockInterviewDetail(interviewId));
      }
      return request.get(`/interview/${interviewId}`);
    },

    /** 删除面试记录 */
    deleteInterview: async (
      interviewId: string,
    ): Promise<ApiResponse<{ deleted: boolean }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({ deleted: true });
      }
      return request.delete(`/interview/${interviewId}`);
    },

    exportInterviewReport: async (
      interviewId: string,
      format: "txt" | "html" | "json" = "txt",
    ): Promise<Blob> => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/interview/${interviewId}/export?format=${format}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!response.ok) {
        throw new Error(`导出失败: ${response.status} ${response.statusText}`);
      }
      return await response.blob();
    },
  },

  // ─────────────────────────────────────────────
  // GPT / OpenAI 相关
  // ─────────────────────────────────────────────
  gpt: {
    /**
     * 【方案 A】SSE 流式聊天 — 前端直连 OpenAI API
     *
     * 原理：使用 fetch + ReadableStream 读取 SSE（Server-Sent Events）流。
     * 每个 data: {...} 事件包含一个文本片段（delta.content），
     * 拼接所有片段即可获得完整回复。
     *
     * 使用示例：
     * ```
     * let fullText = ''
     * await api.gpt.streamChatSSE(
     *   [
     *     { role: 'system', content: '你是一个面试官' },
     *     { role: 'user',   content: '请介绍一下你自己' },
     *   ],
     *   {
     *     onChunk: (chunk) => {
     *       fullText += chunk            // 逐段拼接
     *       messageEl.textContent = fullText // 更新 DOM
     *     },
     *     onDone: (text) => console.log('完成:', text),
     *     onError: (err) => console.error(err),
     *   }
     * )
     * ```
     *
     * 生产环境建议：将 OPENAI_API_KEY 放在后端，由后端代理请求，
     * 前端只调用自己的业务接口，避免密钥泄露。
     *
     * @param messages  - OpenAI 格式的对话消息数组
     * @param callbacks - { onChunk, onDone, onError }
     * @param options   - 可选：model, temperature 等
     */
    streamChatSSE: async (
      messages: GptChatMessage[],
      callbacks: StreamCallbacks,
      options?: { model?: string; temperature?: number },
    ): Promise<void> => {
      // ── 仅在显式开启 VITE_GPT_MOCK=true 时使用模拟流 ──
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        const fullText = generateMockAIResponse(
          messages[messages.length - 1]?.content,
        );
        // 逐字符模拟流式输出，每个字符间隔 30~50ms
        for (let i = 0; i < fullText.length; i++) {
          callbacks.onChunk(fullText[i]);
          await new Promise((r) => setTimeout(r, 30 + Math.random() * 20));
        }
        callbacks.onDone(fullText);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const useDirect =
          !token &&
          !!OPENAI_API_KEY &&
          import.meta.env.VITE_GPT_DIRECT === "true";

        const response = useDirect
          ? await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: options?.model || DEFAULT_CHAT_MODEL,
                messages,
                stream: true,
                temperature: options?.temperature ?? 0.7,
              }),
            })
          : await fetch(`${API_BASE_URL}/gpt/stream`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                messages,
                model: options?.model,
                temperature: options?.temperature,
              }),
            });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
          }
          let detail = `${response.status} ${response.statusText}`;
          try {
            const text = await response.text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                detail =
                  parsed?.message ||
                  parsed?.error?.message ||
                  parsed?.error ||
                  detail;
              } catch {
                detail = text;
              }
            }
          } catch {}
          if (response.status === 401) {
            throw new Error("登录状态已过期，请重新登录");
          }
          throw new Error(`AI 接口错误: ${detail}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = ""; // 用于处理跨 chunk 的不完整行

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 将 Uint8Array 解码为文本，按行解析 SSE 事件
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 最后一行可能不完整，保留到下次

          for (const line of lines) {
            const trimmed = line.trim();
            // SSE 格式：data: {...} 或 data: [DONE]
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);

            if (data === "[DONE]") {
              // 流式传输结束
              callbacks.onDone(fullText);
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(
                  `AI 接口流式响应错误: ${
                    typeof parsed.error === "string"
                      ? parsed.error
                      : parsed.error.message || "未知错误"
                  }`,
                );
              }

              // 兼容 OpenAI 标准格式和后端简化格式
              const delta =
                parsed.choices?.[0]?.delta?.content ?? parsed.content;

              if (delta !== undefined && delta !== null) {
                fullText += delta;
                callbacks.onChunk(delta);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        // 循环正常结束，触发 onDone
        callbacks.onDone(fullText);
      } catch (error) {
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },

    /**
     * 【方案 B】WebSocket 聊天 — 连接业务后端的 WebSocket 接口
     *
     * 适用场景：后端维护对话上下文，WebSocket 用于实时推送 AI 回复片段。
     * 与 SSE 的区别：WebSocket 是双向通信，适合需要服务端主动推送的场景。
     *
     * 使用示例：
     * ```
     * const ws = api.gpt.connectWebSocket(messages, {
     *   onMessage: (text) => { console.log('收到片段:', text) },
     *   onDone:    (full)  => { console.log('完成:', full) },
     *   onError:   (err)   => { console.error(err) },
     * })
     *
     * // 需要主动断开时
     * ws.close()
     * ```
     *
     * 后端 WebSocket 消息格式约定：
     * - 客户端发送：{ type: 'chat', messages: [...] }
     * - 服务端推送：{ type: 'chunk', content: '文本片段' }
     * - 服务端结束：{ type: 'done',  content: '完整文本' }
     * - 错误推送：  { type: 'error', message: '错误描述' }
     *
     * @param messages   - 对话消息数组
     * @param callbacks  - WebSocket 事件回调
     * @returns WebSocket 实例（可调用 .close() 主动断开）
     */
    connectWebSocket: (
      messages: GptChatMessage[],
      callbacks: WebSocketCallbacks,
    ): WebSocket => {
      // ── 仅在显式开启 VITE_GPT_MOCK=true 时使用模拟推送 ──
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        const fullText = generateMockAIResponse(
          messages[messages.length - 1]?.content,
        );
        let index = 0;

        // 模拟逐字推送
        const timer = setInterval(() => {
          if (index < fullText.length) {
            callbacks.onMessage(fullText[index]);
            index++;
          } else {
            clearInterval(timer);
            callbacks.onDone(fullText);
          }
        }, 40);

        // 返回一个假的 WebSocket 对象，close 时清除定时器
        return {
          close: () => clearInterval(timer),
          readyState: 1, // OPEN
        } as unknown as WebSocket;
      }

      // ── 真实模式：创建 WebSocket 连接 ──
      // 使用业务后端的 WebSocket 地址（通过 Vite proxy 转发）
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws";
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // 连接建立后，发送对话消息
        ws.send(JSON.stringify({ type: "chat", messages }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "chunk":
              // 收到文本片段
              callbacks.onMessage(msg.content);
              break;
            case "done":
              // 流式结束
              callbacks.onDone(msg.content);
              ws.close();
              break;
            case "error":
              callbacks.onError(new Error(msg.message));
              ws.close();
              break;
          }
        } catch {
          callbacks.onError(new Error("无法解析 WebSocket 消息"));
        }
      };

      ws.onerror = (event) => {
        callbacks.onError(event);
      };

      ws.onclose = () => {
        // WebSocket 关闭时，如果有未完成的文本，触发 onDone
        // （正常流程中 onDone 已在 type=done 时触发，这里是兜底）
      };

      return ws;
    },

    /**
     * 【兼容接口】非流式聊天（用于不需要流式输出的场景）
     * @param messages - 对话消息数组
     * @returns 完整回复文本
     */
    chat: async (messages: GptChatMessage[]): Promise<string> => {
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        // 模拟 800~2000ms 延迟
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
        return generateMockAIResponse(messages[messages.length - 1]?.content);
      }

      const response = await axios.post(
        `${OPENAI_BASE_URL}/chat/completions`,
        {
          model: DEFAULT_CHAT_MODEL,
          messages,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        },
      );

      return response.data.choices?.[0]?.message?.content || "";
    },

    /**
     * 语音转文字（Whisper API）
     *
     * 将录制的音频 Blob 发送到 Whisper API，返回转写后的文本。
     * 支持的语言：中文、英文、日文等 50+ 种语言，自动检测。
     *
     * 使用示例：
     * ```
     * // 录音完成后
     * const audioBlob = await audioService.startRecording() // 返回 Promise<Blob>
     * // 需先 stopRecording，然后等 Blob ready
     * const result = await api.gpt.speechToText(audioBlob)
     * console.log(result.text) // "你好，我是应聘者..."
     * ```
     *
     * @param audioBlob - 录音产生的 Blob（audio/webm 或 audio/wav）
     * @returns SpeechToTextResult { text, language?, duration? }
     */
    speechToText: async (
      audioBlob: Blob,
    ): Promise<ApiResponse<SpeechToTextResult>> => {
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        return mockApiResponse<SpeechToTextResult>(
          {
            text: "这是一段语音转文字的模拟结果。在实际使用中，这里会显示你说的内容。",
            language: "zh",
            duration: 3.5,
          },
          1500,
        );
      }

      const audioData = await AudioService.audioToBase64(audioBlob);
      return request.post("/gpt/speech-to-text", { audioData });
    },

    /**
     * 文字转语音（TTS API）
     *
     * 将 AI 的文本回复转换为语音，用于辅助有障碍用户或语音播报场景。
     *
     * 使用示例：
     * ```
     * const result = await api.gpt.textToSpeech('你好，欢迎参加面试！')
     * const audio = new Audio(result.data.url)
     * audio.play()
     * ```
     *
     * @param text  - 要转换的文本
     * @param voice - 语音音色（alloy/echo/fable/onyx/nova/shimmer）
     * @returns TextToSpeechResult { url, blob? }
     */
    textToSpeech: async (
      text: string,
      voice: string = "alloy",
    ): Promise<ApiResponse<TextToSpeechResult>> => {
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        // Mock 模式下返回一个占位 URL
        return mockApiResponse<TextToSpeechResult>({
          url: "mock_audio_url",
        });
      }

      // 真实模式：调用 TTS API（返回 mp3 音频流）
      const response = await axios.post(
        `${OPENAI_BASE_URL}/audio/speech`,
        { model: "tts-1", input: text, voice },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          responseType: "blob", // 接收二进制音频数据
        },
      );

      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      return mockApiResponse<TextToSpeechResult>({ url, blob });
    },

    /**
     * 获取面试分析报告（AI 自动评分）
     *
     * 将面试过程中的所有对话记录发送给 GPT，
     * 让 AI 从技术能力、沟通表达、解决问题三个维度进行评分，
     * 并给出优势、劣势和改进建议。
     *
     * 使用示例：
     * ```
     * const res = await api.gpt.getInterviewAnalysis(interviewId)
     * const { technicalScore, communicationScore, problemSolvingScore, overallScore,
     *         strengths, weaknesses, suggestions } = res.data
     * ```
     *
     * @param interviewId - 面试 ID
     * @returns ApiResponse<InterviewAnalysis>
     */
    getInterviewAnalysis: async (
      interviewId: string,
    ): Promise<ApiResponse<InterviewAnalysis>> => {
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        return mockApiResponse(generateMockAnalysis(), 2000);
      }

      // 真实模式：由后端汇总对话记录并调用 GPT 生成分析
      return request.get(`/gpt/analysis/${interviewId}`);
    },

    /**
     * 前端直连 GPT 生成分析报告（不需要后端）
     *
     * 适用场景：后端不提供 /gpt/analysis 接口时，前端直接调 OpenAI。
     * 会构建一个 system prompt 要求 GPT 按 JSON 格式返回评分。
     *
     * @param messages - 面试过程中的所有对话消息
     * @returns InterviewAnalysis 结构化评分数据
     */
    analyzeDirectly: async (
      messages: InterviewMessage[],
    ): Promise<InterviewAnalysis> => {
      if (import.meta.env.VITE_GPT_MOCK === "true") {
        return generateMockAnalysis();
      }

      // 构建评分 prompt
      const systemPrompt = `你是一个专业的面试评估系统。请根据以下面试对话记录，
从三个维度（1-5分）对候选人进行评估：
1. technicalScore（技术能力）
2. communicationScore（沟通表达）
3. problemSolvingScore（解决问题能力）

请严格按以下 JSON 格式回复，不要包含任何其他文字：
{
  "technicalScore": 4.0,
  "communicationScore": 3.5,
  "problemSolvingScore": 4.2,
  "overallScore": 3.9,
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["劣势1", "劣势2"],
  "suggestions": ["建议1", "建议2", "建议3"]
}`;

      // 将 InterviewMessage[] 转为 GptChatMessage[]
      const chatMessages: GptChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: `[${m.role === "assistant" ? "面试官" : "候选人"}]: ${m.content}`,
        })),
      ];

      const response = await axios.post(
        `${OPENAI_BASE_URL}/chat/completions`,
        {
          model: DEFAULT_CHAT_MODEL,
          messages: chatMessages,
          temperature: 0.3, // 评分场景使用低温度，结果更稳定
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
        },
      );

      // 解析 GPT 返回的 JSON
      const content = response.data.choices?.[0]?.message?.content || "{}";
      try {
        // GPT 可能会在 JSON 外面包裹 markdown 代码块，需要提取
        const jsonStr = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        return JSON.parse(jsonStr) as InterviewAnalysis;
      } catch {
        console.error("GPT 返回的评分数据格式错误:", content);
        return generateMockAnalysis(); // 降级为 Mock 数据
      }
    },
  },

  // ─────────────────────────────────────────────
  // 文件上传
  // ─────────────────────────────────────────────
  upload: {
    getAvatarUploadUrl: (): string => `${API_BASE_URL}/upload/avatar`,
    /**
     * 上传简历文件
     * @param file - File 对象（PDF / DOCX）
     * @returns ApiResponse<{ url, filename }>
     */
    uploadResume: async (
      file: File,
    ): Promise<ApiResponse<{ url: string; filename: string }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({ url: "mock_resume_url", filename: file.name });
      }
      const formData = new FormData();
      formData.append("resume", file);
      return request.post("/upload/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },

    /**
     * 上传音频文件
     * @param file - File 对象（webm / wav / mp3）
     * @returns ApiResponse<{ url, filename }>
     */
    uploadAudio: async (
      file: File,
    ): Promise<ApiResponse<{ url: string; filename: string }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({ url: "mock_audio_url", filename: file.name });
      }
      const formData = new FormData();
      formData.append("audio", file);
      return request.post("/upload/audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },

    uploadAvatar: async (
      file: File,
    ): Promise<ApiResponse<{ url: string; filename: string }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({
          url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
          filename: file.name,
        });
      }
      const formData = new FormData();
      formData.append("avatar", file);
      return request.post("/upload/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  },

  monitor: {
    reportError: async (
      payload: ErrorReportPayload,
    ): Promise<ApiResponse<{ received: boolean }>> => {
      if (MOCK_MODE) {
        return mockApiResponse({ received: true });
      }
      return request.post("/errors", payload);
    },
  },
};

export default request;
