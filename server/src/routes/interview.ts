/**
 * server/src/routes/interview.ts — 面试管理路由
 *
 * 接口列表：
 * POST   /api/interview/start          — 开始新面试
 * POST   /api/interview/:id/message     — 发送消息（获取 AI 回复）
 * POST   /api/interview/:id/end         — 结束面试（生成分析报告）
 * POST   /api/interview/:id/cancel      — 取消面试（路由离开/主动取消）
 * GET    /api/interview/history         — 面试历史列表（分页）
 * GET    /api/interview/:id             — 面试详情
 * DELETE /api/interview/:id             — 删除面试记录
 */

import { Router, type Request, type Response } from "express";
import {
  interviewStorage,
  type InterviewRecord,
  type InterviewMessage,
} from "../services/storage.js";
import { authMiddleware } from "./auth.js";
import { streamChat, analyzeInterview } from "../services/openai.js";

export async function collectStreamText(stream: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    text += chunk;
  }
  return text;
}

const router = Router();

// 所有面试接口需要登录
router.use(authMiddleware);

// ==================== POST /api/interview/start ====================
router.post("/start", (req: Request, res: Response) => {
  const { position, difficulty, duration } = req.body;
  const userId = (req as any).user.userId;

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

  const title = `${positionLabels[position] || position} - ${diffLabels[difficulty] || "中等"}难度`;

  const record = interviewStorage.create({
    id: `interview_${Date.now()}`,
    userId,
    title,
    position,
    difficulty,
    duration,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    status: "ongoing",
    messages: [],
  });

  res.json({
    code: 200,
    success: true,
    message: "面试已开始",
    data: { interviewId: record.id, status: "started" },
  });
});

// ==================== POST /api/interview/:id/message ====================
router.post("/:id/message", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, audioData } = req.body;

  const record = interviewStorage.findById(id);
  if (!record) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  if (record.status !== "ongoing") {
    const endedMessage = record.status === "canceled" ? "面试已取消" : "面试已结束";
    res.status(400).json({ code: 400, success: false, message: endedMessage });
    return;
  }

  // 1. 保存用户消息
  const userMsg: InterviewMessage = {
    id: `msg_${Date.now()}`,
    content,
    role: "user",
    timestamp: Date.now(),
    isAudio: !!audioData,
  };
  record.messages.push(userMsg);
  interviewStorage.update(id, { messages: record.messages });

  // 2. 调用 AI 获取回复（非流式，直接返回完整文本）
  try {
    const chatMessages = record.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const aiContent = await collectStreamText(streamChat(chatMessages));

    const aiMsg: InterviewMessage = {
      id: `msg_${Date.now() + 1}`,
      content: aiContent,
      role: "assistant",
      timestamp: Date.now(),
    };
    record.messages.push(aiMsg);
    interviewStorage.update(id, { messages: record.messages });

    res.json({
      code: 200,
      success: true,
      message: "请求成功",
      data: {
        id: aiMsg.id,
        role: aiMsg.role,
        content: aiMsg.content,
        timestamp: aiMsg.timestamp,
      },
    });
  } catch (error: any) {
    console.error("[Interview] AI 回复失败:", error.message);
    res
      .status(500)
      .json({ code: 500, success: false, message: "AI 回复生成失败" });
  }
});

const FALLBACK_ANALYSIS = {
  technicalScore: 3.0,
  communicationScore: 3.0,
  problemSolvingScore: 3.0,
  overallScore: 3.0,
  strengths: ["分析报告生成失败，使用默认评分"],
  weaknesses: [],
  suggestions: [],
};

async function buildInterviewAnalysis(record: InterviewRecord) {
  try {
    return await analyzeInterview(record.messages);
  } catch (error: any) {
    console.error("[Interview] 分析报告生成失败:", error.message);
    return FALLBACK_ANALYSIS;
  }
}

// ==================== POST /api/interview/:id/end ====================
router.post("/:id/end", async (req: Request, res: Response) => {
  const { id } = req.params;

  const record = interviewStorage.findById(id);
  if (!record) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  // 自动结束幂等：如果已完成，直接返回已存在的分析，避免重复写入 completed 污染统计
  if (record.status === "completed") {
    if (record.analysis) {
      res.json({
        code: 200,
        success: true,
        message: "面试已结束（幂等返回）",
        data: record.analysis,
      });
      return;
    }

    const analysis = await buildInterviewAnalysis(record);
    interviewStorage.update(id, {
      score: analysis.overallScore,
      analysis,
    });

    res.json({
      code: 200,
      success: true,
      message: "面试已结束（幂等补全分析）",
      data: analysis,
    });
    return;
  }

  if (record.status === "canceled") {
    res.status(400).json({ code: 400, success: false, message: "面试已取消，无法结束" });
    return;
  }

  if (record.status !== "ongoing") {
    res.status(400).json({ code: 400, success: false, message: "面试状态异常" });
    return;
  }

  const analysis = await buildInterviewAnalysis(record);

  const now = Date.now();
  interviewStorage.update(id, {
    status: "completed",
    endTime: now,
    durationMs: now - record.startTime,
    score: analysis.overallScore,
    analysis,
  });

  res.json({
    code: 200,
    success: true,
    message: "面试已结束",
    data: analysis,
  });
});

// ==================== POST /api/interview/:id/cancel ====================
router.post("/:id/cancel", (req: Request, res: Response) => {
  const { id } = req.params;

  const record = interviewStorage.findById(id);
  if (!record) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  if (record.status === "completed") {
    res.status(400).json({ code: 400, success: false, message: "面试已完成，无法取消" });
    return;
  }

  if (record.status === "canceled") {
    res.json({
      code: 200,
      success: true,
      message: "面试已取消（幂等返回）",
      data: { status: "canceled" },
    });
    return;
  }

  const now = Date.now();
  interviewStorage.update(id, {
    status: "canceled",
    endTime: now,
    durationMs: now - record.startTime,
  });

  res.json({
    code: 200,
    success: true,
    message: "面试已取消",
    data: { status: "canceled" },
  });
});

// ==================== GET /api/interview/history ====================
router.get("/history", (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  // 查询当前用户的所有面试记录，按开始时间倒序
  let records = interviewStorage
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startTime - a.startTime);

  const total = records.length;

  // 分页
  const start = (page - 1) * limit;
  const list = records.slice(start, start + limit).map((r) => ({
    id: r.id,
    title: r.title,
    startTime: r.startTime,
    endTime: r.endTime,
    duration: r.durationMs,
    status: r.status,
    score: r.score || 0,
  }));

  res.json({
    code: 200,
    success: true,
    message: "请求成功",
    data: { list, total, page, limit },
  });
});

router.get("/:id/export", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;
  const format = String(req.query.format || "txt").toLowerCase();
  const record = interviewStorage.findById(id);

  if (!record || record.userId !== userId) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  const durationMinutes = Math.floor((record.durationMs || 0) / 60000);
  const analysis = record.analysis;
  const messages = record.messages || [];

  const lines = [
    `标题: ${record.title}`,
    `开始时间: ${new Date(record.startTime).toLocaleString("zh-CN")}`,
    `结束时间: ${new Date(record.endTime).toLocaleString("zh-CN")}`,
    `时长: ${durationMinutes} 分钟`,
    `状态: ${record.status}`,
    `综合得分: ${analysis?.overallScore ?? 0}`,
    "",
    "对话记录:",
  ];

  for (const m of messages) {
    lines.push(
      `[${new Date(m.timestamp).toLocaleTimeString("zh-CN")}] ${m.role === "assistant" ? "面试官" : "候选人"}: ${m.content}`,
    );
  }

  if (analysis) {
    lines.push("");
    lines.push("分析结果:");
    lines.push(`技术能力: ${analysis.technicalScore}`);
    lines.push(`沟通表达: ${analysis.communicationScore}`);
    lines.push(`问题解决: ${analysis.problemSolvingScore}`);
    lines.push(`综合得分: ${analysis.overallScore}`);
    lines.push(`优势: ${(analysis.strengths || []).join("；")}`);
    lines.push(`建议: ${(analysis.suggestions || []).join("；")}`);
  }

  const baseName = `${record.title.replace(/[\\/:*?"<>|]/g, "_")}_${record.id}`;

  if (format === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.json"`,
    );
    res.send(
      JSON.stringify(
        {
          id: record.id,
          title: record.title,
          startTime: record.startTime,
          endTime: record.endTime,
          durationMs: record.durationMs,
          status: record.status,
          score: record.score || 0,
          messages: record.messages,
          analysis: record.analysis,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (format === "html") {
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${record.title}</title><style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.7;color:#222}h1{margin-bottom:8px}pre{white-space:pre-wrap;background:#f7f7f7;border-radius:8px;padding:16px}</style></head><body><h1>${record.title}</h1><pre>${lines.join("\n")}</pre></body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.html"`,
    );
    res.send(html);
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${baseName}.txt"`,
  );
  res.send(lines.join("\n"));
});

// ==================== GET /api/interview/:id ====================
router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;
  const record = interviewStorage.findById(id);

  if (!record || record.userId !== userId) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  res.json({
    code: 200,
    success: true,
    message: "请求成功",
    data: {
      id: record.id,
      title: record.title,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.durationMs,
      status: record.status,
      score: record.score || 0,
      messages: record.messages,
      analysis: record.analysis,
    },
  });
});

// ==================== DELETE /api/interview/:id ====================
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.userId;

  const record = interviewStorage.findById(id);
  if (!record || record.userId !== userId) {
    res
      .status(404)
      .json({ code: 404, success: false, message: "面试记录不存在" });
    return;
  }

  interviewStorage.delete(id);
  res.json({
    code: 200,
    success: true,
    message: "删除成功",
    data: { deleted: true },
  });
});

export default router;
