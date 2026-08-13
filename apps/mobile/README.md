# @campus/mobile

Capacitor 壳：在手机上打开与网页相同的 Next 站点。

## 配置

编辑 `capacitor.config.ts`（或设置环境变量 `CAPACITOR_SERVER_URL`）：

- 开发：`http://<电脑局域网IP>:3000`
- 生产：`https://你的域名`（自动关闭 cleartext）

先启动网站：

```bash
# 仓库根目录
npm run dev:server
```

## 插件

已集成：StatusBar、SplashScreen、App、Keyboard、Camera、Preferences（在 `apps/server` 网页侧调用，原生侧需 sync）。

```bash
cd apps/mobile
npm install
npm run sync
```

## Android

需安装 Android Studio。Windows 示例：

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.x.x:3000"
$env:CAPACITOR_ANDROID_STUDIO_PATH="C:\Program Files\Android\Android Studio\bin\studio64.exe"
npm run mobile:sync
npm run mobile:android
```

## iOS

见 [IOS.md](./IOS.md)（需 macOS）。

## 上架

见 [STORE.md](./STORE.md)。

## 说明

本 App **不打包** Next 静态站，而是 WebView 访问线上/局域网服务。上传、登录、API 均走同一 `apps/server`。
