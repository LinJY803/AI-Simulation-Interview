/**
 * server/src/routes/gpt.ts — GPT / AI 相关路由
 *
 * 接口列表：
 * GET  /api/gpt/analysis/:id    — 获取面试分析报告（SSE 流式 + 普通两种模式）
 * POST /api/gpt/stream          — SSE 流式聊天（直接返回 stream）
 * POST /api/gpt/speech-to-text  — 语音转文字
 * POST /api/gpt/text-to-speech  — 文字转语音
 */

import { Router, type Request, type Response } from "express";
import { interviewStorage } from "../services/storage.js";
import { authMiddleware } from "./auth.js";
import {
  streamChat,
  analyzeInterview,
  speechToText,
  textToSpeech,
} from "../services/openai.js";

const router = Router();

router.use(authMiddleware);

// ==================== GET /api/gpt/analysis/:id ====================
router.get("/analysis/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = interviewStorage.findById(id);

  if (!record) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  // 如果已有分析报告，直接返回
  if (record.analysis) {
    res.json({
      code: 200,
      success: true,
      message: "请求成功",
      data: record.analysis,
    });
    return;
  }

  // 否则实时生成
  try {
    const analysis = await analyzeInterview(record.messages);
    interviewStorage.update(id, { analysis, score: analysis.overallScore });
    res.json({ code: 200, success: true, message: "请求成功", data: analysis });
  } catch (error: any) {
    res
      .status(500)
      .json({
        code: 500,
        success: false,
        message: "分析报告生成失败: " + error.message,
      });
  }
});

// ==================== POST /api/gpt/stream ====================
/**
 * SSE 流式聊天
 * 前端通过 fetch 或 EventSource 连接此接口，
 * 后端逐块推送 AI 回复文本片段。
 *
 * SSE 格式：
 *   data: {"content":"你"}\n\n
 *   data: {"content":"好"}\n\n
 *   data: [DONE]\n\n
 */
router.post("/stream", async (req: Request, res: Response) => {
  const { messages, model, temperature } = req.body;

  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Nginx 环境需要
  res.flushHeaders();

  try {
    for await (const chunk of streamChat(messages, { model, temperature })) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ==================== POST /api/gpt/speech-to-text ====================
router.post("/speech-to-text", async (req: Request, res: Response) => {
  try {
    // 前端发送 multipart/form-data
    const file = (req as any).file;
    if (!file) {
      // 也支持 base64 格式
      const { audioData } = req.body;
      if (!audioData) {
        res
          .status(400)
          .json({ code: 400, success: false, message: "请提供音频数据" });
        return;
      }
      const buffer = Buffer.from(audioData, "base64");
      const result = await speechToText(buffer, "audio/webm");
      res.json({ code: 200, success: true, message: "请求成功", data: result });
      return;
    }

    const result = await speechToText(file.buffer, file.mimetype);
    res.json({ code: 200, success: true, message: "请求成功", data: result });
  } catch (error: any) {
    res
      .status(500)
      .json({
        code: 500,
        success: false,
        message: "语音转文字失败: " + error.message,
      });
  }
});

// ==================== POST /api/gpt/text-to-speech ====================
router.post("/text-to-speech", async (req: Request, res: Response) => {
  const { text, voice } = req.body;

  if (!text) {
    res
      .status(400)
      .json({ code: 400, success: false, message: "请提供要转换的文本" });
    return;
  }

  try {
    const audioBuffer = await textToSpeech(text, voice);

    if (audioBuffer.length === 0) {
      // Mock 模式下返回空响应
      res.json({
        code: 200,
        success: true,
        message: "请求成功",
        data: { url: "mock_audio_url" },
      });
      return;
    }

    // 真实模式：返回音频流
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);
  } catch (error: any) {
    res
      .status(500)
      .json({
        code: 500,
        success: false,
        message: "文字转语音失败: " + error.message,
      });
  }
});

export default router;
