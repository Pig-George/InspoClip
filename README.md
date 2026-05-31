<p align="center">
  <img src="client/public/favicon.png" alt="InspoClip" width="120" />
</p>

# InspoClip

AI 驱动的设计灵感剪贴簿。每日粘贴设计截图，AI 自动生成中英双语设计术语，以拼贴风格的周视图呈现。

![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/React-18-61dafb)
![Stack](https://img.shields.io/badge/Express-4-green)
![Stack](https://img.shields.io/badge/PostgreSQL-16-336791)

## 功能特性

### 核心功能

- **日视图 / 周视图 / 时间轴视图** — 日视图支持无限横向滚动，时间轴按月回顾灵感
- **AI 术语提取** — 粘贴图片后自动生成 5-10 个中英双语设计术语
- **AI Prompt 生成** — 为设计图片生成可复现风格的 AI 提示词，支持中英切换
- **多模型支持** — Google Gemini / OpenAI 兼容 (DeepSeek, Grok) / Anthropic Claude
- **配色板提取** — 自动提取图片主色（最多 10 色），点击复制 HEX 值
- **图片相似度检测** — 上传时自动检测重复/相似图片，防止重复收集
- **标签/分类系统** — 自定义标签管理，支持按标签筛选搜索
- **智能缩略图** — 基于熵值的智能裁剪，生成高质量缩略图

### 交互体验

- **拼贴风格** — 纸质纹理、和纸胶带、图钉、回形针、订书钉、缝线等 8 种装饰
- **术语交互** — 悬停展开、分中英文独立复制、删除二次确认
- **拖拽排序** — 支持拖拽调整同一天内图片顺序
- **全局粘贴** — 页面任意位置粘贴图片自动上传到今日
- **批量导入** — 支持一次选择/拖入多张图片批量上传
- **键盘快捷键** — `←/→` 切换日期、`/` 搜索、`D/W` 切换视图、`T` 跳转今天、`?` 帮助
- **搜索** — 按术语关键词搜索，支持标签筛选
- **导出** — 支持 ZIP（图片+数据）、Markdown、JSON 三种格式导出
- **中英切换** — 界面一键中英文切换
- **深色模式** — 暖琥珀色深色主题

### 浏览器扩展

- **右键保存** — 在任意网页/图片上右键「Save to InspoClip」
- **区域截图** — 支持框选区域进行分析或保存
- **智能选区** — 悬停自动识别元素区域，点击确认或拖拽自定义
- **分析面板** — 页面内弹出分析结果（术语、色卡、Prompt）
- **历史记录** — 多次分析支持上下翻阅历史
- **相似检测** — 保存前自动检测相似图片并提示确认
- **自定义快捷键** — 支持用户自定义键盘快捷键
- **浮动标签** — 分析后关闭弹窗，右侧显示可拖动的浮动入口

## 页面展示

![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212829193.png)

![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212655122.png)

![image.png](https://mood-mom.oss-cn-hangzhou.aliyuncs.com/picgo/node/20260521212741043.png)

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, @dnd-kit |
| 后端 | Node.js, Express, TypeScript, Drizzle ORM, Sharp |
| 数据库 | PostgreSQL 16 |
| AI | OpenAI SDK (多模型), Sharp (图片处理/色提取/pHash) |
| 部署 | Docker Compose, Nginx |
| 扩展 | Chrome Extension Manifest V3 |

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

### 浏览器扩展安装

1. Chrome 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `extension/` 文件夹

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
├── client/                    # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── DayView.tsx           # 日视图 (无限滚动)
│   │   │   ├── WeekView.tsx          # 周视图 (7列)
│   │   │   ├── TimelineView.tsx      # 时间轴视图 (按月)
│   │   │   ├── DayColumn.tsx         # 日期卡片列 (拖拽排序)
│   │   │   ├── ImageCard.tsx         # 图片卡片 (详情/删除)
│   │   │   ├── ImageUploader.tsx     # 上传组件 (单张/批量)
│   │   │   ├── TermTag.tsx           # 术语标签
│   │   │   ├── TagManager.tsx        # 标签管理器
│   │   │   ├── ColorPalette.tsx      # 配色板组件
│   │   │   ├── DesignPrompt.tsx      # AI Prompt 生成
│   │   │   ├── NotesArea.tsx         # 笔记区域
│   │   │   ├── SearchDialog.tsx      # 搜索弹窗
│   │   │   ├── SettingsDialog.tsx    # AI 设置
│   │   │   ├── ExportDialog.tsx      # 导出弹窗
│   │   │   ├── Toast.tsx             # 通知提示
│   │   │   └── DecorElement.tsx      # 装饰元素
│   │   ├── context/          # ThemeContext, LanguageContext
│   │   ├── hooks/            # useScrollLock, useKeyboardShortcuts
│   │   ├── lib/              # api.ts, utils.ts, events.ts
│   │   ├── i18n/             # translations.ts
│   │   └── types/            # TypeScript 类型定义
│   ├── nginx.conf
│   └── Dockerfile
├── server/                    # Express 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── weeks.ts             # 周数据 + 月度时间轴
│   │   │   ├── images.ts            # 图片上传/删除/分析
│   │   │   ├── terms.ts             # 术语管理
│   │   │   ├── tags.ts              # 标签 CRUD
│   │   │   ├── config.ts            # AI 配置
│   │   │   ├── search.ts            # 搜索
│   │   │   └── export.ts            # 导出 (ZIP/MD/JSON)
│   │   ├── services/
│   │   │   ├── ai.ts                # AI 多模型调用
│   │   │   ├── colors.ts            # 配色板提取
│   │   │   ├── phash.ts             # 相似度检测 (pHash+aHash+colorHash)
│   │   │   └── thumbnail.ts         # 智能缩略图生成
│   │   ├── db/               # Drizzle ORM schema + 连接
│   │   └── middleware/       # multer 文件上传
│   └── Dockerfile
├── extension/                 # Chrome 浏览器扩展
│   ├── manifest.json
│   ├── background.js          # Service Worker
│   ├── content.js             # Content Script (页面注入)
│   ├── popup.html/js/css      # 弹出面板
│   └── icons/
├── docker-compose.yml
├── deploy.sh
└── .env.example
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/weeks/:date` | 获取指定日期所在周的数据 |
| `GET` | `/api/weeks/month/:YYYY-MM` | 获取月度时间轴数据 |
| `POST` | `/api/images` | 上传图片 (multipart) |
| `POST` | `/api/images/analyze` | 分析图片 (不保存) |
| `POST` | `/api/images/check-similarity` | 检查相似图片 |
| `POST` | `/api/images/:id/prompt` | 生成/获取 AI Prompt |
| `POST` | `/api/images/:id/critique` | 生成/获取 AI 点评 |
| `PATCH` | `/api/images/reorder` | 更新图片排序 |
| `DELETE` | `/api/images/:id` | 删除图片及术语 |
| `DELETE` | `/api/terms/:id` | 删除单个术语 |
| `PATCH` | `/api/weeks/:id/notes` | 保存笔记 |
| `GET` | `/api/tags` | 获取所有标签 |
| `POST` | `/api/tags` | 创建标签 |
| `DELETE` | `/api/tags/:id` | 删除标签 |
| `POST` | `/api/tags/image/:id` | 给图片添加标签 |
| `DELETE` | `/api/tags/image/:id/:tagId` | 移除图片标签 |
| `GET` | `/api/search?q=keyword` | 搜索术语 |
| `GET` | `/api/export/week/:date?format=` | 导出 (zip/markdown/json) |
| `GET` | `/api/config` | 获取 AI 配置 |
| `PATCH` | `/api/config` | 更新 AI 配置 |
| `GET` | `/api/health` | 健康检查 |

## License

MIT
