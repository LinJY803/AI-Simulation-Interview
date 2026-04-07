import { Router, type Request, type Response } from "express";
import { authMiddleware } from "./auth.js";
import {
  interviewStorage,
  userStorage,
  type User,
} from "../services/storage.js";

const router = Router();

router.use(authMiddleware);

router.get("/profile", (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const user = userStorage.findById(userId) as User | undefined;

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
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || user.createdAt,
      bio: user.bio || "",
      status: user.status || "active",
      skills: user.skills || [],
      notifications: user.notifications || [],
    },
  });
});

router.put("/profile", (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const user = userStorage.findById(userId) as User | undefined;

  if (!user) {
    res.status(404).json({ code: 404, success: false, message: "用户不存在" });
    return;
  }

  const { username, email, bio, status, skills, notifications, avatar } =
    req.body || {};
  const normalizedStatus =
    status === "active" || status === "inactive" || status === "banned"
      ? status
      : undefined;
  const updated = userStorage.update(userId, {
    ...(typeof username === "string" ? { username } : {}),
    ...(typeof email === "string" ? { email } : {}),
    ...(typeof bio === "string" ? { bio } : {}),
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
    ...(Array.isArray(skills) ? { skills } : {}),
    ...(Array.isArray(notifications) ? { notifications } : {}),
    ...(typeof avatar === "string" ? { avatar } : {}),
  });

  res.json({ code: 200, success: true, message: "保存成功", data: updated });
});

router.post("/change-password", (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const user = userStorage.findById(userId) as User | undefined;

  if (!user) {
    res.status(404).json({ code: 404, success: false, message: "用户不存在" });
    return;
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ code: 400, success: false, message: "参数不完整" });
    return;
  }

  if (user.password !== currentPassword) {
    res
      .status(400)
      .json({ code: 400, success: false, message: "当前密码错误" });
    return;
  }

  userStorage.update(userId, { password: newPassword });
  res.json({ code: 200, success: true, message: "密码修改成功", data: null });
});

router.get("/stats", (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const records = interviewStorage.filter((r) => r.userId === userId);

  const totalInterviews = records.length;
  const completed = records.filter((r) => r.status === "completed");
  const completedInterviews = completed.length;

  const scores = completed
    .map((r) => r.score || 0)
    .filter((n) => Number.isFinite(n));
  const averageScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const worstScore = scores.length ? Math.min(...scores) : 0;

  const totalDuration = completed.reduce(
    (sum, r) => sum + (r.durationMs || 0),
    0,
  );
  const dailyAverage = completedInterviews
    ? Math.round(totalDuration / completedInterviews / (1000 * 60))
    : 0;

  let improvementRate = 0;
  if (scores.length >= 2) {
    const first = scores[0];
    const last = scores[scores.length - 1];
    improvementRate = first ? Math.round(((last - first) / first) * 100) : 0;
  }

  res.json({
    code: 200,
    success: true,
    message: "请求成功",
    data: {
      totalInterviews,
      completedInterviews,
      averageScore: +averageScore.toFixed(1),
      bestScore: +bestScore.toFixed(1),
      worstScore: +worstScore.toFixed(1),
      totalDuration,
      dailyAverage,
      improvementRate,
    },
  });
});

export default router;
