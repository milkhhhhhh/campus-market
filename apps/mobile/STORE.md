# 应用商店上架材料（清单）

包名 / Bundle ID：`com.campus.market`  
应用名：校园集市

## 必备材料

- [ ] 应用图标（1024×1024）与各密度 mipmap
- [ ] 截图（手机竖屏 5–8 张：首页、详情、发布、消息、我的）
- [ ] 简短介绍 / 完整介绍文案
- [ ] 隐私政策 URL：`https://你的域名/privacy`
- [ ] 权限说明（相机、相册、网络、通知）
- [ ] Android 签名密钥（keystore），妥善备份
- [ ] 生产 `CAPACITOR_SERVER_URL=https://你的域名` 后 `npm run mobile:sync`

## Android Release

```bash
export CAPACITOR_SERVER_URL="https://你的域名"
npm run mobile:sync
npm run mobile:android
# 在 Android Studio：Build → Generate Signed Bundle / APK
```

## 推送

1. 用户登录后调用 `POST /api/devices/register` 上报 FCM/APNs token  
2. 配置服务端 FCM HTTP v1 / APNs（见 `apps/server/lib/push.ts` 占位）  
3. 新消息时调用 `notifyUserNewMessage`

## 深链

- Scheme：`campusmarket://products/<id>`  
- HTTPS App Links：需在域名部署 Digital Asset Links（`.well-known/assetlinks.json`）
