"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CATEGORIES,
  PRODUCTS,
  ProductCondition,
  RENTALS,
  type CategoryTreeDTO,
  type ProductDTO,
  type RentalItemDTO,
} from "@campus/shared";

import { ImageUploader } from "@/components/site/ImageUploader";
import { yuanToFen } from "@/lib/site-format";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

const CONDITIONS: Array<{ value: ProductCondition; label: string }> = [
  { value: ProductCondition.NEW, label: "全新" },
  { value: ProductCondition.LIKE_NEW, label: "几乎全新" },
  { value: ProductCondition.GOOD, label: "良好" },
  { value: ProductCondition.FAIR, label: "一般" },
  { value: ProductCondition.POOR, label: "较差" },
];

function flattenCategories(tree: CategoryTreeDTO[]): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const p of tree) {
    if (p.children.length === 0) out.push({ id: p.id, label: p.name });
    else {
      for (const c of p.children) {
        out.push({ id: c.id, label: `${p.name} / ${c.name}` });
      }
    }
  }
  return out;
}

export default function PublishPage() {
  const router = useRouter();
  const { ready, requireLogin } = useSiteAuth();
  const [kind, setKind] = useState<"SALE" | "RENT">("SALE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [priceYuan, setPriceYuan] = useState("");
  const [condition, setCondition] = useState(ProductCondition.GOOD);
  const [dailyYuan, setDailyYuan] = useState("");
  const [depositYuan, setDepositYuan] = useState("");
  const [minDays, setMinDays] = useState("1");
  const [maxDays, setMaxDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!requireLogin("/publish")) return;
    void siteRequest<CategoryTreeDTO[]>(CATEGORIES.list, { auth: false })
      .then((tree) => {
        const flat = flattenCategories(tree);
        setCategories(flat);
        setCategoryError(
          flat.length === 0
            ? "暂无可用分类，请稍后重试或联系管理员"
            : null,
        );
      })
      .catch(() => {
        setCategories([]);
        setCategoryError("分类加载失败，请刷新重试");
      });
  }, [ready, requireLogin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireLogin("/publish")) return;
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("请填写标题和描述");
      return;
    }
    if (images.length < 1) {
      setError("请至少上传 1 张图片");
      return;
    }
    if (!categoryId) {
      setError("请选择分类");
      return;
    }

    setSubmitting(true);
    try {
      if (kind === "SALE") {
        const price = yuanToFen(priceYuan);
        if (price == null) {
          setError("请输入有效售价");
          return;
        }
        const product = await siteRequest<ProductDTO>(PRODUCTS.create, {
          method: "POST",
          data: {
            title: title.trim(),
            description: description.trim(),
            price,
            condition,
            images,
            categoryId,
          },
        });
        router.push(`/products/${product.id}`);
      } else {
        const dailyPrice = yuanToFen(dailyYuan);
        const deposit = yuanToFen(depositYuan);
        if (dailyPrice == null || deposit == null) {
          setError("请输入有效日租金与押金");
          return;
        }
        const min = Number.parseInt(minDays, 10);
        const max = maxDays.trim() ? Number.parseInt(maxDays, 10) : null;
        const rental = await siteRequest<RentalItemDTO>(RENTALS.create, {
          method: "POST",
          data: {
            title: title.trim(),
            description: description.trim(),
            dailyPrice,
            deposit,
            minDays: min,
            maxDays: max,
            images,
            categoryId,
          },
        });
        router.push(`/rentals/${rental.id}`);
      }
    } catch (err) {
      setError(err instanceof SiteApiError ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-[#c3c6d7] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--cm-primary-container)]";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto max-w-xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-extrabold">发布新闲置</h1>
        <p className="mt-1 text-sm text-[var(--cm-on-surface-variant)]">
          添加清晰照片与详细说明
        </p>
      </div>

      <div className="flex rounded-2xl border border-[#c3c6d7] bg-[var(--cm-surface-high)] p-1">
        {(
          [
            ["SALE", "二手出售"],
            ["RENT", "闲置租借"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-xl py-2.5 text-sm ${
              kind === k
                ? "bg-[var(--cm-primary-container)] font-bold text-white"
                : "text-[var(--cm-on-surface-variant)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
          图片
        </label>
        <ImageUploader value={images} onChange={setImages} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
          标题
        </label>
        <input
          className={field}
          value={title}
          maxLength={100}
          placeholder="例如：几乎全新无线耳机"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
          描述
        </label>
        <textarea
          className={`${field} min-h-28`}
          value={description}
          maxLength={5000}
          placeholder="补充成色、面交地点等"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
          分类
        </label>
        <select
          className={field}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">请选择分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {categoryError ? (
          <p className="text-sm text-red-600">{categoryError}</p>
        ) : null}
      </div>

      {kind === "SALE" ? (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              售价（元）
            </label>
            <input
              className={field}
              inputMode="decimal"
              value={priceYuan}
              placeholder="0.00"
              onChange={(e) => setPriceYuan(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              成色
            </label>
            <select
              className={field}
              value={condition}
              onChange={(e) => setCondition(e.target.value as ProductCondition)}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              日租金（元）
            </label>
            <input
              className={field}
              value={dailyYuan}
              onChange={(e) => setDailyYuan(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              押金（元）
            </label>
            <input
              className={field}
              value={depositYuan}
              onChange={(e) => setDepositYuan(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              最短天数
            </label>
            <input
              className={field}
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--cm-on-surface-variant)]">
              最长天数
            </label>
            <input
              className={field}
              value={maxDays}
              placeholder="可不填"
              onChange={(e) => setMaxDays(e.target.value)}
            />
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-[var(--cm-primary-container)] py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-60"
      >
        {submitting ? "发布中…" : "立即发布"}
      </button>
    </form>
  );
}
