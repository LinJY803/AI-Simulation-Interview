/**
 * server/src/routes/auth.ts — 用户认证路由
 *
 * 接口列表：
 * POST /api/auth/login      — 用户登录
 * POST /api/auth/register   — 用户注册
 * POST /api/auth/logout     — 退出登录（仅校验 token）
 * GET  /api/auth/userinfo   — 获取当前用户信息
 */

import { Router, type Request, type Response } from "express";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { userStorage, getNextUserId, type User } from "../services/storage.js";

const router = Router();

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "ai-interview-jwt-secret-key-2024";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as SignOptions["expiresIn"];

// ==================== 中间件 ====================

/** JWT 认证中间件：从 Authorization header 解析用户 */
export function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ code: 401, success: false, message: "未提供认证令牌" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
    };
    (req as any).user = decoded;
    next();
  } catch {
    res
      .status(401)
      .json({ code: 401, success: false, message: "令牌无效或已过期" });
  }
}

// ==================== 路由 ====================

/** POST /api/auth/login — 用户登录 */
router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res
      .status(400)
      .json({ code: 400, success: false, message: "用户名和密码不能为空" });
    return;
  }

  const user = userStorage
    .getAll()
    .find((u: User) => u.username === username && u.password === password);

  if (!user) {
    res
      .status(401)
      .json({ code: 401, success: false, message: "用户名或密码错误" });
    return;
  }

  userStorage.update(user.id, { lastLoginAt: Date.now() });

  // 生成 JWT
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

  res.json({
    code: 200,
    success: true,
    message: "登录成功",
    data: {
      token,
      userInfo: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    },
  });
});

/** POST /api/auth/register — 用户注册 */
router.post("/register", (req: Request, res: Response) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    res
      .status(400)
      .json({ code: 400, success: false, message: "用户名和密码不能为空" });
    return;
  }

  // 检查用户名是否已存在
  const existing = userStorage
    .getAll()
    .find((u: User) => u.username === username);
  if (existing) {
    res
      .status(409)
      .json({ code: 409, success: false, message: "用户名已存在" });
    return;
  }

  const newUser = userStorage.create({
    id: getNextUserId(),
    username,
    password,
    email: email || `${username}@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    role: "user",
    createdAt: Date.now(),
  });

  res.json({
    code: 200,
    success: true,
    message: "注册成功",
    data: { id: newUser.id, username: newUser.username, email: newUser.email },
  });
});

/** POST /api/auth/logout — 退出登录 */
router.post("/logout", authMiddleware, (_req: Request, res: Response) => {
  // JWT 是无状态的，客户端清除 token 即可
  res.json({ code: 200, success: true, message: "退出成功", data: null });
});

router.post("/logout-all", authMiddleware, (_req: Request, res: Response) => {
  res.json({ code: 200, success: true, message: "已退出所有设备", data: null });
});

/** GET /api/auth/userinfo — 获取当前用户信息 */
router.get("/userinfo", authMiddleware, (req: Request, res: Response) => {
  const { userId } = (req as any).user;
  const user = userStorage.findById(userId);

  if (!user) {
    res.status(404).json({ code: 404, success: false, message: "用户不存在" });
    return;
  }

  res.json({
    code: 200,
    success: true,
    message: "请求成功",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    },
  });
});

export default router;
