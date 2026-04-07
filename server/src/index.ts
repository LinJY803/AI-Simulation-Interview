/**
 * server/src/index.ts — 后端服务入口
 *
 * 启动 Express HTTP 服务器 + WebSocket 服务器。
 *
 * 启动方式：
 *   cd server && npm run dev     # 开发模式（热重载）
 *   cd server && npm run start   # 生产模式
 *
 * HTTP 接口前缀：/api
 * WebSocket 地址：/ws
 *
 * 默认端口：3001（前端 Vite 在 3000，代理 /api 到 3001）
 */

import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth.js";
import interviewRoutes from "./routes/interview.js";
import gptRoutes from "./routes/gpt.js";
import uploadRoutes from "./routes/upload.js";
import userRoutes from "./routes/user.js";
import errorRoutes from "./routes/errors.js";
import { streamChat } from "./services/openai.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const uploadDir = process.env.UPLOAD_DIR || "./uploads";

// ==================== Express 应用 ====================

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// 请求日志（开发环境）
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      );
    }
  });
  next();
});

// 静态文件服务（上传的文件可通过 URL 访问）
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(path.resolve(uploadDir)));

// API 路由
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/gpt", gptRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/errors", errorRoutes);

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({
    code: 200,
    success: true,
    message: "AI Interview Server is running",
    data: { version: "1.0.0", timestamp: Date.now() },
  });
});

// 404 兜底
app.use((_req, res) => {
  res.status(404).json({ code: 404, success: false, message: "接口不存在" });
});

// 全局错误处理
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[Server Error]", err.message);
    res
      .status(500)
      .json({ code: 500, success: false, message: "服务器内部错误" });
  },
);

// ==================== HTTP + WebSocket 服务器 ====================

const server = http.createServer(app);

// WebSocket 服务器（路径：/ws）
const wss = new WebSocketServer({ server, path: "/ws" });

/**
 * WebSocket 消息协议：
 * 客户端发送 → { type: 'chat', messages: [{role, content}, ...] }
 * 服务端推送 → { type: 'chunk', content: '文本片段' }
 * 服务端推送 → { type: 'done',  content: '完整文本' }
 * 服务端推送 → { type: 'error', message: '错误描述' }
 */
wss.on("connection", (ws) => {
  console.log("[WebSocket] 新客户端连接");

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "chat" && Array.isArray(msg.messages)) {
        // 流式推送 AI 回复
        let fullText = "";

        for await (const chunk of streamChat(msg.messages)) {
          fullText += chunk;
          // 检查连接是否仍然打开
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "chunk", content: chunk }));
          }
        }

        // 推送完成信号
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "done", content: fullText }));
        }
      } else {
        ws.send(JSON.stringify({ type: "error", message: "未知消息类型" }));
      }
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", message: error.message }));
    }
  });

  ws.on("close", () => {
    console.log("[WebSocket] 客户端断开");
  });

  ws.on("error", (error) => {
    console.error("[WebSocket] 错误:", error.message);
  });
});

// ==================== 启动 ====================

server.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       AI Interview Backend Server          ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  HTTP:     http://localhost:${PORT}            ║`);
  console.log(`║  WebSocket: ws://localhost:${PORT}/ws          ║`);
  console.log(`║  Health:   http://localhost:${PORT}/api/health ║`);
  console.log("║  默认账号: admin / 123456                    ║");
  console.log("╚══════════════════════════════════════════════╝");
});
