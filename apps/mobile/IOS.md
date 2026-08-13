# iOS 工程说明

本仓库在 Windows 上无法生成/编译 iOS 工程。请在 **macOS + Xcode** 上执行：

```bash
cd apps/mobile
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

生产构建前设置：

```bash
export CAPACITOR_SERVER_URL="https://你的域名"
npx cap sync ios
```

深链：在 Xcode 中为 `campusmarket` URL Scheme 与 Associated Domains（Universal Links）完成配置。
