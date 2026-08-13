import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "校园集市隐私政策与权限说明",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-[var(--cm-on-surface)]">
      <h1 className="text-2xl font-extrabold text-[var(--cm-primary)]">
        隐私政策
      </h1>
      <p className="text-[var(--cm-on-surface-variant)]">
        更新日期：2026-08-13 · 适用于校园集市网站与手机 App
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">我们收集的信息</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>账号信息：用户名、昵称、密码哈希、校园认证材料</li>
          <li>交易与发布：商品/租借信息、订单、收藏、站内消息</li>
          <li>设备信息（App）：推送设备令牌、系统平台（用于消息通知）</li>
          <li>日志：必要的访问与错误日志，用于安全与排障</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">App 权限说明</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>相机 / 相册：用于发布商品与聊天发送图片</li>
          <li>网络：加载网站内容与同步数据</li>
          <li>通知（可选）：新消息提醒</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">信息使用与共享</h2>
        <p>
          信息仅用于提供校园交易与租借服务、内容审核与安全风控。我们不会出售个人数据。依法配合监管或处理违法违规内容时可能披露必要信息。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">存储与安全</h2>
        <p>
          密码以哈希存储；生产环境建议使用 HTTPS 与强
          JWT_SECRET。上传图片保存在服务端配置的存储中。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">你的权利</h2>
        <p>
          可通过「我的」修改资料；如需注销账号或删除数据，请联系站点管理员处理。
        </p>
      </section>

      <p>
        <Link href="/" className="font-semibold text-[var(--cm-primary)]">
          返回首页
        </Link>
      </p>
    </article>
  );
}