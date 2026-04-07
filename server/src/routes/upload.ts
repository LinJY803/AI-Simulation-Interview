/**
 * server/src/routes/upload.ts — 文件上传路由
 *
 * 接口列表：
 * POST /api/upload/resume — 上传简历
 * POST /api/upload/audio   — 上传音频
 *
 * 文件存储在 server/uploads/ 目录下。
 */

import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "./auth.js";
import { userStorage } from "../services/storage.js";

const router = Router();

router.use(authMiddleware);

// ==================== Multer 配置 ====================

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // 文件名：时间戳-原始文件名
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

// 文件大小限制：50MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("只允许上传图片文件"));
  },
});

// ==================== POST /api/upload/resume ====================
router.post(
  "/resume",
  upload.single("resume"),
  (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      res
        .status(400)
        .json({ code: 400, success: false, message: "请选择要上传的文件" });
      return;
    }

    const fileUrl = `/uploads/${file.filename}`;

    res.json({
      code: 200,
      success: true,
      message: "上传成功",
      data: { url: fileUrl, filename: file.originalname },
    });
  },
);

// ==================== POST /api/upload/audio ====================
router.post("/audio", upload.single("audio"), (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    res
      .status(400)
      .json({ code: 400, success: false, message: "请选择要上传的音频" });
    return;
  }

  const fileUrl = `/uploads/${file.filename}`;

  res.json({
    code: 200,
    success: true,
    message: "上传成功",
    data: { url: fileUrl, filename: file.originalname },
  });
});

router.post(
  "/avatar",
  avatarUpload.single("avatar"),
  (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      res
        .status(400)
        .json({ code: 400, success: false, message: "请选择要上传的图片" });
      return;
    }

    const userId = (req as any).user?.userId;
    const fileUrl = `/uploads/${file.filename}`;
    if (userId) {
      userStorage.update(userId, { avatar: fileUrl } as any);
    }

    res.json({
      code: 200,
      success: true,
      message: "上传成功",
      data: { url: fileUrl, filename: file.originalname },
    });
  },
);

export default router;
