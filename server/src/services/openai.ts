/**
 * server/src/services/openai.ts — OpenAI API 服务
 *
 * 封装 OpenAI API 调用，包括：
 * 1. 流式聊天（SSE） — 用于面试官实时回复
 * 2. 面试分析评分 — 结束面试时生成报告
 * 3. 语音转文字（Whisper） — 处理用户语音输入
 * 4. 文字转语音（TTS） — 播报 AI 回复
 *
 * 若未配置硅基流动 API Key，将直接抛错，不再回退到 mock。
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { InterviewMessage, InterviewAnalysis } from "./storage.js";
import { buildRetrievalContext } from "./rag.js";
import { chatWithOllama, streamChatWithOllama } from './ollama.js';
import { extractMemoryRules, applyMemoryRulesToInterview } from './rag.js';

// ==================== 初始化 OpenAI 客户端 ====================

function loadDotEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "server", ".env"),
    path.resolve(here, "..", "..", ".env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;

      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();

      if (!key) continue;
      if (process.env[key] !== undefined) continue;

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
    return;
  }
}

loadDotEnv();

const apiKey =
  process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY || "";
const baseURL =
  process.env.SILICONFLOW_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.siliconflow.cn/v1";
const defaultModel =
  process.env.SILICONFLOW_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";
const allowedModels = new Set(
  (
    process.env.SILICONFLOW_ALLOWED_MODELS ||
    process.env.OPENAI_ALLOWED_MODELS ||
    "deepseek-chat,deepseek-ai/DeepSeek-V3"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
const sttModels = (
  process.env.SILICONFLOW_STT_MODELS ||
  process.env.OPENAI_STT_MODELS ||
  "FunAudioLLM/SenseVoiceSmall,whisper-1"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** 是否配置了有效的 API Key */
export const isOpenAIConfigured =
  !!apiKey &&
  apiKey !== "your_openai_api_key_here" &&
  apiKey !== "your_api_key_here";

let openai: OpenAI | null = null;

if (isOpenAIConfigured) {
  openai = new OpenAI({ apiKey, baseURL });
  console.log("[AI] 已配置（SiliconFlow 兼容模式），模型:", defaultModel);
} else {
  console.log("[AI] 未配置 API Key，AI 功能将不可用");
}

function createAIError(message: string, status = 500, code = 'AI_ERROR') {
  const error = new Error(message) as Error & { status?: number; code?: string }
  error.status = status
  error.code = code
  return error
}

function ensureAIClient() {
  if (!openai) {
    throw createAIError(
      '未配置硅基流动密钥，请在 server/.env 中设置 SILICONFLOW_API_KEY（或 OPENAI_API_KEY）',
      500,
      'AI_API_KEY_MISSING',
    )
  }
  return openai
}

function resolveModel(requested?: string) {
  if (requested) {
    if (!allowedModels.has(requested)) {
      throw createAIError(`模型不可用: ${requested}。请检查 SILICONFLOW_ALLOWED_MODELS / OPENAI_ALLOWED_MODELS 配置`, 400, 'AI_MODEL_NOT_ALLOWED')
    }
    return requested
  }

  if (allowedModels.has(defaultModel)) return defaultModel
  const first = Array.from(allowedModels)[0]
  if (!first) throw createAIError('未配置可用模型，请检查 SILICONFLOW_ALLOWED_MODELS / OPENAI_ALLOWED_MODELS', 500, 'AI_MODEL_NOT_CONFIGURED')
  return first
}

function normalizeErrorMessage(error: any): string {
  const apiErrorMessage =
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message;
  return apiErrorMessage || error?.message || '未知错误';
}

function formatOpenAIError(error: any, fallbackMessage: string) {
  return {
    message: normalizeErrorMessage(error) || fallbackMessage,
    status: error?.status ?? error?.response?.status ?? 500,
    code: error?.code ?? 'AI_STREAM_ERROR',
    provider: process.env.LLM_PROVIDER || 'openai',
    model: error?.model,
  }
}

function canRetryByModel(error: any): boolean {
  const status = error?.status ?? error?.response?.status;
  if (status === 400 || status === 403 || status === 404) return true;
  const msg = String(normalizeErrorMessage(error)).toLowerCase();
  return (
    msg.includes("model") ||
    msg.includes("not found") ||
    msg.includes("permission")
  );
}

function modelCandidates(requested?: string): string[] {
  if (requested) return [resolveModel(requested)];
  const primary = resolveModel();
  const all = Array.from(allowedModels);
  return [primary, ...all.filter((m) => m !== primary)];
}

// ==================== 通用对话 System Prompt ====================

const CHAT_SYSTEM_PROMPT = `你是一个通用对话智能体，负责自然、友好、专业地和用户持续交流。
请遵循以下规则：
1. 根据用户的最新问题给出直接、有帮助的回复
2. 可以追问澄清，但不要把自己描述成面试官、考官或面试系统
3. 如果用户没有明确要求，不要主动切换到面试、测评或考核语气
4. 语气自然、简洁、友好，避免模板化表达
5. 回复尽量聚焦当前话题，不要刻意延伸到面试流程
6. 如果需要总结，请用条目化方式输出，避免冗长
7. 优先利用已提供的长期记忆与检索上下文回答，不要重复提问已经知道的信息`;

const ANALYSIS_SYSTEM_PROMPT = `你是一个对话分析系统。请根据聊天记录，
从三个维度（1-5分）对对话质量进行评估。
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
// ==================== 导出方法 ====================

/**
 * 流式聊天 — 返回 AsyncGenerator，每次 yield 一段文本
 *
 * 使用方式：
 *   for await (const chunk of streamChat(messages)) {
 *     res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
 *   }
 */
export async function* streamChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: { model?: string; temperature?: number; maxTokens?: number; provider?: 'openai' | 'ollama' },
): AsyncGenerator<string> {
  if (options?.provider === 'ollama' || process.env.LLM_PROVIDER === 'ollama') {
    for await (const chunk of streamChatWithOllama(messages, options)) {
      yield chunk
    }
    return
  }

  const client = ensureAIClient();
  let lastError: any = null;

  for (const model of modelCandidates(options?.model)) {
    try {
      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
      return;
    } catch (error: any) {
      lastError = error;
      if (!canRetryByModel(error)) {
        throw createAIError(`AI 流式请求失败: ${normalizeErrorMessage(error)}`, error?.status ?? error?.response?.status ?? 500, error?.code ?? 'AI_STREAM_REQUEST_FAILED')
      }
    }
  }

  throw createAIError(
    `AI 流式请求失败（模型不可用）: ${normalizeErrorMessage(lastError)}`,
    lastError?.status ?? lastError?.response?.status ?? 500,
    'AI_MODEL_UNAVAILABLE',
  )
}

/**
 * 面试分析评分 — 根据对话记录生成分析报告
 */
export async function analyzeInterview(
  messages: InterviewMessage[],
): Promise<InterviewAnalysis> {
  const client = ensureAIClient();

  // 真实模式
  const chatMessages = messages.map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: `[${m.role === "assistant" ? "面试官" : "候选人"}]: ${m.content}`,
  }));

  let response: any = null;
  let lastError: any = null;

  for (const model of modelCandidates()) {
    try {
      response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          ...chatMessages,
        ],
        temperature: 0.3,
      });
      break;
    } catch (error: any) {
      lastError = error;
      if (!canRetryByModel(error)) {
        throw new Error(`AI 评估请求失败: ${normalizeErrorMessage(error)}`);
      }
    }
  }

  if (!response) {
    throw new Error(
      `AI 评估请求失败（模型不可用）: ${normalizeErrorMessage(lastError)}`,
    );
  }

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const jsonStr = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(jsonStr) as InterviewAnalysis;
  } catch {
    console.error("[AI] 解析分析结果失败:", content);
    throw new Error("AI 分析结果解析失败");
  }
}

/**
 * 语音转文字（Whisper）
 */
export async function speechToText(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<{ text: string; language?: string }> {
  const client = ensureAIClient();

  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("wav")
      ? "wav"
      : "mp3";
  const file = new File([new Uint8Array(audioBuffer)], `recording.${ext}`, {
    type: mimeType,
  });

  let lastError: any = null;
  for (const model of sttModels) {
    try {
      const transcription = await client.audio.transcriptions.create({
        model,
        file,
        language: "zh",
      });
      return { text: transcription.text };
    } catch (error: any) {
      lastError = error;
      try {
        const transcription = await client.audio.transcriptions.create({
          model,
          file,
        });
        return { text: transcription.text };
      } catch (errorNoLang: any) {
        lastError = errorNoLang;
      }
    }
  }

  throw new Error(`语音转写模型不可用: ${normalizeErrorMessage(lastError)}`);
}

/**
 * 文字转语音（TTS）
 */
export async function textToSpeech(
  text: string,
  voice: string = "alloy",
): Promise<Buffer> {
  const client = ensureAIClient();

  const response = await client.audio.speech.create({
    model: "tts-1",
    input: text,
    voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    response_format: "mp3",
  });

  return Buffer.from(await response.arrayBuffer());
}
