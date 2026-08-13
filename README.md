# campus-market

校园二手交易与闲置租借平台。基于 **npm workspaces** 的 monorepo。

**产品形态：网页（Web）+ Capacitor App。**

## 技术栈

- **网站前台 + API + 管理后台** `apps/server`：Next.js App Router + TypeScript
- **移动 App 壳** `apps/mobile`：Capacitor（WebView 加载网站）
- **数据库层** `packages/db`：Prisma + SQLite（起步，可切换 PostgreSQL）
- **共享层** `packages/shared`：TypeScript 类型 / 枚举 / API 路径常量

## 目录结构

```
campus-market/
├── apps/
│   ├── server/           # Next.js：网站前台 + API + 管理后台
│   └── mobile/           # Capacitor iOS/Android 壳
├── packages/
│   ├── db/               # Prisma 数据库层 (@campus/db)
│   └── shared/           # 共享类型/枚举/常量 (@campus/shared)
├── docker-compose.yml
├── Dockerfile
├── package.json
└── .env.example
```

## 包命名约定

| 包 | 名称 |
| --- | --- |
| 数据库层 | `@campus/db` |
| 共享层 | `@campus/shared` |
| 网站/API/后台 | `@campus/server` |
| 移动 App 壳 | `@campus/mobile` |

## 核心模块

账号注册登录、校园认证、二手商品、闲置租借、交易/租借订单、搜索分类、收藏、站内聊天、举报、推送设备注册、管理后台。

## 环境准备

1. Node.js >= 18.18、npm >= 9  
2. 复制环境变量：

```bash
cp .env.example apps/server/.env.local
# 或按仓库约定放置 DATABASE_URL / JWT_SECRET
```

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 数据库连接串 |
| `JWT_SECRET` | JWT 签名密钥（建议 ≥32 字符） |
| `NEXT_PUBLIC_SITE_URL` | 对外网站根地址（sitemap / OG） |
| `UPLOAD_BASE_URL` | 上传资源访问基础地址；真机请用局域网 IP，或依赖按 Host 自动改写 |
| `CAPACITOR_SERVER_URL` | App WebView 加载的网站地址 |

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run dev:server` | 启动网站 + API（默认 http://localhost:3000） |
| `npm run mobile:sync` | Capacitor sync |
| `npm run mobile:android` | 打开 Android 工程 |
| `npm run mobile:ios` | 打开 iOS 工程（需 macOS） |
| `npm run typecheck` / `lint` / `build` | 各 workspace 检查与构建 |

## 本地体验（网站）

```bash
npm run dev:server
```

- 网站：[http://localhost:3000](http://localhost:3000)  
- 管理后台：[http://localhost:3000/admin](http://localhost:3000/admin)  
- 登录：账号密码注册/登录；开发环境另提供「开发登录」。

## 手机 App 联调（Capacitor）

1. 电脑与手机同一 Wi‑Fi，查局域网 IP（如 `192.168.0.104`）。
2. 设置 App 指向该地址：

```bash
# Windows PowerShell 示例
$env:CAPACITOR_SERVER_URL="http://192.168.0.104:3000"
npm run mobile:sync
```

或直接改 [`apps/mobile/capacitor.config.ts`](apps/mobile/capacitor.config.ts) 里的默认 `server.url`。

3. 确保 `apps/server/.env.local` 中上传地址对手机可达（可写局域网 IP；若仍为 `localhost`，上传接口会按请求 Host 自动改写）。
4. 安装 [Android Studio](https://developer.android.com/studio)。Windows 若 `cap open android` 找不到 IDE，设置：

```powershell
$env:CAPACITOR_ANDROID_STUDIO_PATH="C:\Program Files\Android\Android Studio\bin\studio64.exe"
npm run mobile:android
```

5. 在 Android Studio 中运行到模拟器或真机。

iOS 需在 **macOS + Xcode** 上执行 `npx cap add ios`（见 [`apps/mobile/IOS.md`](apps/mobile/IOS.md)）。

更多说明：[`apps/mobile/README.md`](apps/mobile/README.md)、上架材料 [`apps/mobile/STORE.md`](apps/mobile/STORE.md)。

## 生产部署（Docker）

```bash
# 配置 .env 后
docker compose up -d --build
```

详见 `docker-compose.yml` 与环境变量说明。生产请使用 HTTPS 域名，并将 `CAPACITOR_SERVER_URL` 指向该域名后重新 sync / 打 Release 包。

## 隐私政策

网站路径：[/privacy](/privacy)
