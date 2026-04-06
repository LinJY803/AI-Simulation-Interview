# AI 面试系统 - 完整项目目录结构

## 📁 项目根目录结构

```
ai-interview/
├── 📄 package.json                  # 项目依赖配置
├── 📄 vite.config.ts               # Vite 构建配置
├── 📄 tsconfig.json                # TypeScript 配置
├── 📄 index.html                   # HTML 入口文件
├── 📄 .gitignore                   # Git 忽略文件
├── 📄 .env.example                 # 环境变量示例
├── 📄 README.md                    # 项目说明文档
├── 📄 PROJECT_STRUCTURE.md         # 目录结构说明（本文档）
├── 📁 public/                      # 静态资源目录
└── 📁 src/                         # 源代码目录
```

## 📁 src 源代码目录结构

```
src/
├── 📁 assets/                      # 静态资源
│   ├── 📁 images/                  # 图片资源
│   │   ├── logo.png               # 项目Logo
│   │   ├── avatar-default.png     # 默认头像
│   │   └── background.jpg         # 背景图片
│   └── 📁 mock/                    # 模拟数据
│       └── interviews.ts          # 面试数据模拟
│
├── 📁 components/                  # 通用组件（可按需创建）
│   ├── HelloWorld.vue             # 示例组件
│   ├── ChartWrapper.vue           # 图表包装组件
│   ├── AudioVisualizer.vue        # 音频可视化组件
│   ├── LoadingSpinner.vue         # 加载动画组件
│   ├── EmptyState.vue             # 空状态组件
│   └── ErrorBoundary.vue          # 错误边界组件
│
├── 📁 config/                      # 配置文件
│   └── index.ts                   # 应用全局配置
│
├── 📁 router/                      # 路由配置
│   └── index.ts                   # 路由定义和守卫
│
├── 📁 service/                     # 服务层
│   ├── api.ts                     # HTTP API 服务
│   ├── websocket.ts               # WebSocket 服务
│   ├── sse.ts                     # SSE（Server-Sent Events）服务
│   └── audio.ts                   # 音频服务
│
├── 📁 store/                       # 状态管理（Pinia）
│   └── index.ts                   # Pinia store 定义
│
├── 📁 styles/                      # 样式文件
│   ├── index.scss                 # 全局样式
│   └── variables.scss             # 样式变量
│
├── 📁 types/                       # TypeScript 类型定义
│   └── index.ts                   # 全局类型定义
│
├── 📁 utils/                       # 工具函数
│   └── index.ts                   # 通用工具函数
│
├── 📁 views/                       # 页面组件
│   ├── Login.vue                  # 登录页面
│   ├── 📁 layout/                  # 布局组件
│   │   └── MainLayout.vue         # 主布局组件
│   ├── 📁 interview/               # 面试相关页面
│   │   └── Interview.vue          # AI面试页面
│   ├── 📁 history/                 # 历史相关页面
│   │   └── History.vue            # 面试历史页面
│   ├── 📁 report/                  # 报告相关页面
│   │   └── Report.vue             # 面试报告页面
│   └── 📁 profile/                 # 个人中心页面
│       └── Profile.vue            # 个人中心页面
│
├── 📄 App.vue                      # 根组件
├── 📄 main.ts                      # 应用入口文件
└── 📄 env.d.ts                     # 环境变量类型定义
```

## 📄 文件功能详细说明

### 🎯 根目录文件

#### **package.json** - 项目依赖配置
- 项目名称、版本、描述
- 依赖包管理（Vue3, TypeScript, Vite, Element Plus等）
- 开发脚本（dev, build, lint, format等）
- 项目类型配置（ES Module）

#### **vite.config.ts** - Vite 构建配置
- Vue3 插件配置
- 路径别名配置（@ → src）
- 开发服务器配置（端口、代理等）
- CSS 预处理器配置
- 构建优化配置

#### **tsconfig.json** - TypeScript 配置
- TypeScript 编译器选项
- 路径映射配置
- 类型包含/排除配置
- 编译目标设置

#### **index.html** - HTML 入口文件
- HTML5 文档结构
- Vue 应用挂载点
- 元数据设置
- 全局脚本引入

### 📱 页面组件（views/）

#### **Login.vue** - 登录页面
- 用户登录表单
- 注册功能入口
- 记住我功能
- 忘记密码链接
- 演示账号切换
- 响应式设计

#### **MainLayout.vue** - 主布局组件
- 顶部导航栏（Logo、菜单、用户信息）
- 面包屑导航
- 主体内容区域
- 底部版权信息
- 用户下拉菜单
- 路由守卫

#### **Interview.vue** - AI面试页面
- 面试控制面板（开始/结束/暂停）
- 面试配置对话框
- 实时对话界面
- 语音输入控制
- 消息时间戳显示
- 音频波形可视化
- 面试计时器

#### **History.vue** - 面试历史页面
- 统计数据卡片
- 筛选和搜索功能
- 面试记录表格
- 分页组件
- 详细侧边栏
- 导出功能
- 删除和查看操作

#### **Report.vue** - 面试报告页面
- 总体评分展示
- ECharts 雷达图
- 详细分析报告
- 关键对话记录
- 优势和改进建议
- 导出报告功能
- 图表交互功能

#### **Profile.vue** - 个人中心页面
- 用户信息展示
- 头像上传功能
- 设置选项配置
- 安全设置
- 数据统计展示
- 偏好设置保存

### 🔧 核心服务（service/）

#### **api.ts** - HTTP API 服务
- Axios 实例配置
- 请求/响应拦截器
- 统一错误处理
- 接口分组管理
- 认证头注入
- 请求重试机制

#### **websocket.ts** - WebSocket 服务
- WebSocket 连接管理
- 自动重连机制
- 消息类型定义
- 事件订阅/发布
- 心跳检测
- 连接状态监控

#### **sse.ts** - SSE 服务
- EventSource 封装
- 服务器推送事件处理
- 多事件类型支持
- 连接状态管理
- 错误处理和重连

#### **audio.ts** - 音频服务
- 麦克风权限管理
- 音频录制控制
- 音频播放功能
- 音频格式转换
- 波形数据提取
- 浏览器兼容性处理

### 📊 状态管理（store/）

#### **index.ts** - Pinia store 定义
- **useUserStore** - 用户状态管理
  - 用户信息存储
  - 登录状态管理
  - Token 管理
  - 登出功能

- **useInterviewStore** - 面试状态管理
  - 当前面试状态
  - 面试历史记录
  - 录音状态管理
  - 消息队列管理
  - 统计计算属性

### 📐 工具和类型

#### **utils/index.ts** - 工具函数集合
- 日期时间格式化
- 时长格式化
- 分数等级计算
- 防抖和节流函数
- 深拷贝工具
- 唯一ID生成
- 验证函数
- 文件处理工具
- 浏览器特性检测

#### **types/index.ts** - TypeScript 类型定义
- 用户相关类型
- 面试消息类型
- 面试分析类型
- API 响应类型
- WebSocket 消息类型
- 音频相关类型
- 图表数据类型
- 统计数据类型
- 组件 Props/Emits 类型

### 🎨 样式和配置

#### **styles/index.scss** - 全局样式
- 样式重置和基础样式
- 自定义滚动条
- Element Plus 样式覆盖
- 工具类定义
- 动画定义
- 响应式断点

#### **styles/variables.scss** - 样式变量
- 颜色变量系统
- 间距和尺寸变量
- 字体和排版变量
- 阴影和圆角变量
- 过渡动画变量
- 渐变背景变量
- 暗黑模式变量
- 媒体查询断点

#### **config/index.ts** - 应用配置
- 环境变量配置
- API 配置
- WebSocket 配置
- OpenAI 配置
- 面试配置
- 音频配置
- 评分配置
- 图表配置
- 主题配置
- 路由配置
- 存储配置
- 安全配置

### 🎪 模拟数据

#### **assets/mock/interviews.ts** - 面试数据模拟
- 随机面试数据生成
- 统计分析计算
- 趋势数据生成
- 面试问题库
- 模拟 API 响应
- 数据过滤和搜索工具

## 📋 技术实现细节

### 1. **模块化设计**
- 组件按功能模块划分
- 服务层分离业务逻辑
- 状态管理集中化
- 工具函数复用化

### 2. **类型安全**
- TypeScript 严格模式
- 完整类型定义
- 接口和泛型应用
- 运行时类型检查

### 3. **响应式设计**
- 移动端优先策略
- 弹性布局系统
- 媒体查询适配
- 触摸友好交互

### 4. **性能优化**
- 组件懒加载
- 代码分割
- 虚拟滚动
- 图片懒加载
- 请求缓存
- 本地存储

### 5. **可维护性**
- 清晰的目录结构
- 统一的编码规范
- 详细的文档注释
- 模块化配置管理

### 6. **扩展性**
- 插件化架构
- 配置驱动开发
- 热插拔功能模块
- 国际化支持

## 🔄 开发工作流程

### 1. **环境搭建**
```bash
# 克隆项目
git clone <repository-url>
cd ai-interview

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

### 2. **开发规范**
- 组件使用 `script setup` 语法
- TypeScript 严格类型检查
- Element Plus 组件规范
- ESLint + Prettier 代码格式化
- 提交信息规范化

### 3. **测试策略**
- 单元测试：Jest + Vue Test Utils
- E2E 测试：Cypress
- 集成测试：API 接口测试
- 性能测试：Lighthouse

### 4. **构建部署**
```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📚 学习资源

### Vue 3 相关
- [Vue 3 官方文档](https://vuejs.org/)
- [Vue Router 4 文档](https://router.vuejs.org/)
- [Pinia 状态管理](https://pinia.vuejs.org/)
- [Vite 构建工具](https://vitejs.dev/)

### UI 组件库
- [Element Plus 文档](https://element-plus.org/)
- [Element Plus Icons](https://element-plus.org/en-US/component/icon.html)

### 数据可视化
- [ECharts 文档](https://echarts.apache.org/)
- [vue-echarts 使用指南](https://github.com/ecomfe/vue-echarts)

### 网络通信
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Axios 文档](https://axios-http.com/)

### 音频处理
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

## 📞 技术支持

### 常见问题
1. **环境配置问题**：确保 Node.js 版本 >= 18
2. **依赖安装失败**：使用国内镜像源或清除 npm 缓存
3. **开发服务器无法启动**：检查端口占用情况
4. **TypeScript 类型错误**：运行 `npm run type-check` 检查

### 调试工具
- Vue Devtools 浏览器扩展
- Chrome 开发者工具
- Vite 热更新日志
- 网络请求监控

### 性能监控
- Lighthouse 性能评分
- Chrome Performance 面板
- 内存泄漏检测
- 包大小分析

---

**最后更新**：2024年 [根据实际情况填写]

**版本**：1.0.0

**许可证**：MIT