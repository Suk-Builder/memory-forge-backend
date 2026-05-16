# Memory Forge Backend

AI 人格记忆基础设施 — 后端服务

## 技术栈

- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL 14 + Prisma ORM
- **缓存**: Redis 7
- **AI**: DeepSeek API (OpenAI-compatible)
- **部署**: Docker Compose + Nginx

## 快速开始

### 前置要求

- Docker & Docker Compose
- DeepSeek API Key (可选，用于 AI 对话)

### 部署

```bash
# 1. 设置环境变量
export DEEPSEEK_API_KEY=your-key-here
export JWT_SECRET=your-secret-here

# 2. 一键部署
chmod +x deploy.sh
./deploy.sh
```

### API 文档

#### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 当前用户 |

#### 人格

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/personalities | 人格列表 |
| POST | /api/personalities | 创建人格 |
| GET | /api/personalities/:id | 人格详情 |
| PUT | /api/personalities/:id | 更新人格 |
| DELETE | /api/personalities/:id | 删除人格 |

#### 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat/:personalityId | 流式对话 (SSE) |
| POST | /api/chat/:personalityId/complete | 非流式对话 |
| GET | /api/conversations | 对话列表 |
| POST | /api/conversations | 保存对话 |
| GET | /api/conversations/:id | 对话详情 |

#### 模板

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/templates | 模板列表 |
| GET | /api/templates/:id | 模板详情 |
| POST | /api/templates/:id/use | 使用模板 |

#### 导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/personalities/:id/export?format= | 导出人格 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接字符串 | 见 docker-compose |
| REDIS_URL | Redis 连接字符串 | redis://redis:6379 |
| JWT_SECRET | JWT 签名密钥 | (必须设置) |
| DEEPSEEK_API_KEY | DeepSeek API Key | (可选) |
| NODE_ENV | 运行环境 | production |
| PORT | 服务端口 | 3000 |

## 目录结构

```
api/
├── src/
│   ├── config/        # 配置管理
│   ├── constants/     # 业务常量
│   ├── lib/           # 基础设施 (Prisma, Redis, Logger)
│   ├── middleware/    # 中间件 (Auth, RateLimit, ErrorHandler)
│   ├── routes/        # API 路由
│   ├── services/      # 业务服务 (DeepSeek, Export, SystemPrompt)
│   ├── types/         # 类型定义
│   ├── utils/         # 工具函数 (JWT, Password)
│   ├── validations/   # 输入验证 (Zod)
│   └── index.ts       # 入口文件
├── prisma/
│   ├── schema.prisma  # 数据库模型
│   └── seed.ts        # 初始化数据
├── Dockerfile
├── package.json
└── tsconfig.json
```

## License

MIT
