"use client";

import { useEffect, useState } from "react";

import { AUTH, VerifyStatus, type UserDTO } from "@campus/shared";

import { ImageUploader } from "@/components/site/ImageUploader";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

const STATUS_LABEL: Record<VerifyStatus, string> = {
  [VerifyStatus.UNVERIFIED]: "未认证",
  [VerifyStatus.PENDING]: "审核中",
  [VerifyStatus.APPROVED]: "已通过",
  [VerifyStatus.REJECTED]: "已拒绝",
};

export default function VerifyPage() {
  const { ready, user, requireLogin, refreshProfile } = useSiteAuth();
  const [school, setSchool] = useState("");
  const [studentId, setStudentId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!requireLogin("/verify")) return;
    if (user?.school) setSchool(user.school);
    if (user?.studentId) setStudentId(user.studentId);
  }, [ready, requireLogin, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireLogin("/verify")) return;
    setError(null);
    setMsg(null);
    if (!school.trim() || !studentId.trim()) {
      setError("请填写学校与学号");
      return;
    }
    if (images.length < 1) {
      setError("请上传 1–3 张证明材料");
      return;
    }
    setSubmitting(true);
    try {
      await siteRequest<UserDTO>(AUTH.verifySubmit, {
        method: "POST",
        data: {
          school: school.trim(),
          studentId: studentId.trim(),
          proofImages: images.slice(0, 3),
        },
      });
      await refreshProfile();
      setMsg("已提交认证，请等待审核");
    } catch (err) {
      setError(err instanceof SiteApiError ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-[#c3c6d7] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--cm-primary-container)]";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-lg space-y-5 rounded-2xl bg-white p-5 shadow-sm"
    >
      <h1 className="text-xl font-bold">校园认证</h1>
      {user ? (
        <p className="text-sm font-semibold text-[var(--cm-primary)]">
          当前状态：{STATUS_LABEL[user.verifyStatus]}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">学校</label>
        <input
          className={field}
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="例如：某某大学"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">学号</label>
        <input
          className={field}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">证明材料（1–3 张）</label>
        <ImageUploader value={images} onChange={setImages} max={3} />
        <p className="text-xs text-[var(--cm-outline)]">
          可上传学生证、校园卡等照片
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--cm-primary)]">{msg}</p> : null}

      <button
        type="submit"
        disabled={
          submitting || user?.verifyStatus === VerifyStatus.APPROVED
        }
        className="w-full rounded-2xl bg-[var(--cm-primary-container)] py-3 font-bold text-white disabled:opacity-50"
      >
        {user?.verifyStatus === VerifyStatus.APPROVED
          ? "已认证"
          : submitting
            ? "提交中…"
            : "提交认证"}
      </button>
    </form>
  );
}
