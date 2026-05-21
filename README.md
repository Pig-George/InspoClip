<p align="center">
  <img src="client/public/favicon.svg" alt="InspoClip" width="120" />
</p>

# InspoClip

AI 驱动的设计灵感剪贴簿。每日粘贴设计截图，AI 自动生成中英双语设计术语，以拼贴风格的周视图呈现。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/React-18-61dafb)
![Stack](https://img.shields.io/badge/Express-4-green)
![Stack](https://img.shields.io/badge/PostgreSQL-16-336791)

## 功能特性

- **日视图 / 周视图** — 日视图支持无限横向滚轮滚动，跨周加载
- **AI 术语提取** — 粘贴图片后自动生成 5-10 个中英双语设计术语
- **多模型支持** — Google Gemini / OpenAI 兼容 (DeepSeek, Grok) / Anthropic Claude
- **拼贴风格** — 纸质纹理、和纸胶带、图钉、回形针、订书钉、缝线等 8 种装饰
- **术语交互** — 悬停展开、分中英文独立复制、删除二次确认
- **全局粘贴** — 页面任意位置粘贴图片自动上传到今日
- **搜索** — 按术语关键词搜索，结果高亮显示
- **中英切换** — 界面一键中英文切换
- **深色模式** — 暖琥珀色深色主题

## 页面展示
![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212829193.png)

![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212655122.png)

![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212741043.png)
## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| 后端 | Node.js, Express, TypeScript, Drizzle ORM |
| 数据库 | PostgreSQL 16 |
| AI | OpenAI SDK (多模型), Sharp (图片压缩) |
| 部署 | Docker Compose, Nginx |

## 快速开始

### 本地开发

```bash
# 启动 PostgreSQL (Docker)
docker run -d --name inspoclip-postgres \
  -e POSTGRES_USER=inspoclip -e POSTGRES_PASSWORD=inspoclip -e POSTGRES_DB=inspoclip \
  -p 5432:5432 postgres:16-alpine

# 启动后端
cd server
npm install
npm run dev

# 启动前端
cd client
npm install
npm run dev
```

访问 http://localhost:5173

### Docker 一键部署

```bash
cp .env.example .env
# 编辑 .env 填入 AI_API_KEY 等配置

docker compose up -d --build
```

访问 http://localhost:8080

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_PROVIDER` | 模型服务商 | `openai` |
| `AI_API_KEY` | API 密钥 | `sk-placeholder` |
| `AI_API_BASE` | API 地址 | `https://api.deepseek.com/v1` |
| `AI_MODEL` | 模型名称 | `deepseek-chat` |
| `PORT` | 前端端口 | `8080` |

## 项目结构

```
InspoClip/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   │   ├── DayView.tsx         # 日视图 (无限滚动)
│   │   │   ├── WeekView.tsx        # 周视图 (7列)
│   │   │   ├── DayColumn.tsx       # 日期卡片列
│   │   │   ├── ImageCard.tsx       # 图片卡片 (详情/删除)
│   │   │   ├── ImageUploader.tsx   # 上传组件
│   │   │   ├── TermTag.tsx         # 术语标签
│   │   │   ├── NotesArea.tsx       # 笔记区域
│   │   │   ├── SearchDialog.tsx    # 搜索弹窗
│   │   │   ├── SettingsDialog.tsx  # AI 设置
│   │   │   ├── Toast.tsx           # 通知提示
│   │   │   └── DecorElement.tsx    # 装饰元素
│   │   ├── context/        # ThemeContext, LanguageContext
│   │   ├── hooks/          # useScrollLock 等
│   │   ├── lib/            # api.ts, utils.ts, events.ts
│   │   ├── i18n/           # translations.ts
│   │   └── types/          # TypeScript 类型定义
│   ├── nginx.conf
│   └── Dockerfile
├── server/                 # Express 后端
│   ├── src/
│   │   ├── routes/         # weeks, images, terms, config, search
│   │   ├── services/       # ai.ts (多模型调用)
│   │   ├── db/             # Drizzle ORM schema + 连接
│   │   └── middleware/     # multer 文件上传
│   └── Dockerfile
├── docker-compose.yml
├── deploy.sh
└── .env.example
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/weeks/:date` | 获取指定日期所在周的数据 |
| `POST` | `/api/images` | 上传图片 (multipart) |
| `DELETE` | `/api/images/:id` | 删除图片及术语 |
| `DELETE` | `/api/terms/:id` | 删除单个术语 |
| `PATCH` | `/api/weeks/:id/notes` | 保存笔记 |
| `GET` | `/api/search?q=keyword` | 搜索术语 |
| `GET` | `/api/config` | 获取 AI 配置 |
| `PATCH` | `/api/config` | 更新 AI 配置 |
| `GET` | `/api/health` | 健康检查 |

## License

MIT
