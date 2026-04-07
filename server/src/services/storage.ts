/**
 * server/src/services/storage.ts — JSON 文件持久化存储
 *
 * 使用 JSON 文件存储用户和面试数据，无需安装数据库。
 * 数据存储在 server/data/ 目录下：
 *   - users.json      → 用户表
 *   - interviews.json → 面试记录表
 *
 * 首次启动时自动创建文件和默认管理员账号。
 */

import fs from "fs";
import path from "path";

// ==================== 类型定义 ====================

export interface User {
  id: number;
  username: string;
  password: string; // 明文存储（仅开发环境，生产环境应使用 bcrypt）
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

export interface InterviewMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: number;
  isAudio?: boolean;
  audioUrl?: string;
}

export interface InterviewAnalysis {
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface InterviewRecord {
  id: string;
  userId: number;
  title: string;
  position?: string;
  difficulty?: string;
  duration?: number; // 预设时长（分钟）
  startTime: number;
  endTime: number;
  durationMs: number; // 实际时长（毫秒）
  status: "ongoing" | "completed" | "canceled";
  score?: number;
  messages: InterviewMessage[];
  analysis?: InterviewAnalysis;
}

// ==================== 存储类 ====================

class JsonStorage<T extends { id: string | number }> {
  private filePath: string;
  private data: T[] = [];

  constructor(fileName: string) {
    const dataDir = process.env.DATA_DIR || "./data";
    // 确保目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.resolve(dataDir, fileName);
    this.load();
  }

  /** 从文件加载数据 */
  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
      } catch {
        this.data = [];
      }
    }
  }

  /** 持久化到文件 */
  private save() {
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.data, null, 2),
      "utf-8",
    );
  }

  /** 获取全部数据 */
  getAll(): T[] {
    return [...this.data];
  }

  /** 根据 id 查找 */
  findById(id: string | number): T | undefined {
    return this.data.find((item) => item.id === id);
  }

  /** 新增一条记录 */
  create(item: T): T {
    this.data.push(item);
    this.save();
    return item;
  }

  /** 更新一条记录 */
  update(id: string | number, partial: Partial<T>): T | undefined {
    const index = this.data.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    this.data[index] = { ...this.data[index], ...partial };
    this.save();
    return this.data[index];
  }

  /** 删除一条记录 */
  delete(id: string | number): boolean {
    const index = this.data.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  /** 根据条件筛选 */
  filter(predicate: (item: T) => boolean): T[] {
    return this.data.filter(predicate);
  }
}

// ==================== 导出存储实例 ====================

/** 用户存储 */
export const userStorage = new JsonStorage<User>("users.json");

/** 面试记录存储 */
export const interviewStorage = new JsonStorage<InterviewRecord>(
  "interviews.json",
);

// ==================== 初始化默认数据 ====================

/** 下一个用户 ID（自增） */
export function getNextUserId(): number {
  const users = userStorage.getAll();
  if (users.length === 0) return 1;
  return Math.max(...users.map((u) => u.id)) + 1;
}

/** 初始化：如果没有任何用户，创建默认管理员 */
export function initDefaultData() {
  const users = userStorage.getAll();
  if (users.length === 0) {
    userStorage.create({
      id: 1,
      username: "admin",
      password: "123456", // 默认密码，仅开发环境
      email: "admin@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      role: "admin",
      createdAt: Date.now(),
    });
    userStorage.create({
      id: 2,
      username: "user",
      password: "123456",
      email: "user@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
      role: "user",
      createdAt: Date.now(),
    });
    console.log("[Storage] 已创建默认用户: admin/123456, user/123456");
  }
}

// 首次导入时初始化
initDefaultData();
