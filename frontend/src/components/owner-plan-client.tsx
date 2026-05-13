"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui-primitives";

type PlanTier = "START" | "PLUS";

type PlanLimits = {
  paymentConfirmationsPerMonth: number | null;
  products: number | null;
  stockQuantityTotal: number | null;
};

type PlanSummary = {
  plan: PlanTier;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  period: string;
  limits: PlanLimits;
  usage: {
    paymentConfirmationsThisMonth: number;
    products: number;
    stockQuantityTotal: number;
  };
};

type OwnerPlanResponse = {
  plan: PlanSummary;
};

const fallbackPlan: PlanSummary = {
  plan: "START",
  status: "ACTIVE",
  period: "",
  limits: {
    paymentConfirmationsPerMonth: 30,
    products: 7,
    stockQuantityTotal: 300,
  },
  usage: {
    paymentConfirmationsThisMonth: 0,
    products: 0,
    stockQuantityTotal: 0,
  },
};

function formatLimit(used: number, limit: number | null) {
  if (limit === null) {
    return "ไม่จำกัด";
  }

  return `${used.toLocaleString("th-TH")} / ${limit.toLocaleString("th-TH")}`;
}

function usageTone(used: number, limit: number | null) {
  if (limit === null) {
    return "text-[var(--success)]";
  }

  if (used >= limit) {
    return "text-[var(--danger)]";
  }

  if (used / limit >= 0.8) {
    return "text-[var(--warning)]";
  }

  return "text-[var(--foreground)]";
}

export function OwnerPlanClient({ initialSummary = null }: { initialSummary?: PlanSummary | null }) {
  const [summary, setSummary] = useState<PlanSummary>(initialSummary || fallbackPlan);
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSummary) {
      return undefined;
    }

    let cancelled = false;

    async function loadPlan() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/owner-plan", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as OwnerPlanResponse | { error?: string } | null;

        if (!response.ok || !payload || !("plan" in payload)) {
          throw new Error((payload as { error?: string } | null)?.error || "โหลดข้อมูลแผนไม่สำเร็จ");
        }

        if (!cancelled) {
          setSummary(payload.plan);
        }
      } catch (planError) {
        if (!cancelled) {
          setError(planError instanceof Error ? planError.message : "โหลดข้อมูลแผนไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, [initialSummary]);

  const planCards = useMemo(
    () => [
      {
        id: "START" as const,
        name: "Start",
        price: "ฟรี",
        badge: summary.plan === "START" ? "แผนปัจจุบัน" : "เริ่มต้น",
        description: "เหมาะกับร้านที่เริ่มทดลองระบบและต้องการคุมขอบเขตการใช้งานรายเดือน",
        limits: [
          "ยืนยันชำระเงิน 30 ครั้ง / เดือน",
          "เพิ่มสินค้าได้ 7 รายการ",
          "จำนวนสต๊อกรวมสูงสุด 300 ชิ้น",
        ],
      },
      {
        id: "PLUS" as const,
        name: "Plus",
        price: "$15 / เดือน",
        badge: summary.plan === "PLUS" ? "แผนปัจจุบัน" : "เตรียมเปิดใช้งาน",
        description: "สำหรับร้านที่ใช้งานจริงทุกวันและไม่ต้องการชนเพดานการขายหรือจำนวนสินค้า",
        limits: ["ยืนยันชำระเงินไม่จำกัด", "เพิ่มสินค้าได้ไม่จำกัด", "จำนวนสต๊อกสินค้าไม่จำกัด"],
      },
      {
        id: "PRO" as const,
        name: "Pro",
        price: "เร็ว ๆ นี้",
        badge: "ยังไม่เปิด",
        description: "แผนสำหรับ automation เพิ่มเติม เช่น flow ยืนยันชำระเงินอัตโนมัติในอนาคต",
        limits: ["รวมทุกอย่างใน Plus", "เตรียมรองรับยืนยันชำระอัตโนมัติ", "ยังไม่เปิด subscription ในรอบนี้"],
      },
    ],
    [summary],
  );
  const isStartOverLimit =
    summary.plan === "START" &&
    ((summary.limits.products !== null && summary.usage.products > summary.limits.products) ||
      (summary.limits.stockQuantityTotal !== null && summary.usage.stockQuantityTotal > summary.limits.stockQuantityTotal));

  return (
    <div className="grid min-h-0 content-start gap-[8px]">
      <div className="grid min-h-0 grid-cols-3 items-start gap-[12px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!grid-cols-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-[8px] [@media(orientation:portrait)]:grid-cols-1 max-[1180px]:grid-cols-1">
        {planCards.map((plan) => {
          const active = summary.plan === plan.id;

          return (
            <article
              key={plan.id}
              className={`grid min-h-[286px] content-start rounded-none border px-4 py-3.5 shadow-[var(--shadow-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[246px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-3 ${
                active ? "border-[var(--accent-border)] bg-[var(--active-surface)]" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Plan</p>
                  <h3 className="my-2 text-[1.36rem] leading-tight text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[1.08rem]">{plan.name}</h3>
                </div>
                <StatusPill tone={active ? "success" : undefined}>{plan.badge}</StatusPill>
              </div>

              <strong className="mt-1 block text-[1.22rem] leading-tight text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[1rem]">{plan.price}</strong>
              <p className="m-0 mt-2 min-h-[48px] text-[0.82rem] leading-[1.45] text-[var(--foreground-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[60px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.72rem]">{plan.description}</p>

              <div className="mt-3 grid gap-2">
                {plan.limits.map((limit) => (
                  <div key={limit} className="flex items-start gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3 py-2 text-[0.82rem] leading-[1.4] text-[var(--foreground)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.7rem]">
                    <span className="mt-[0.16rem] grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--accent-border)] text-[0.68rem] text-[var(--accent-text)]">✓</span>
                    <span>{limit}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid content-start gap-2 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">Current Plan</p>
            <strong className="mt-1 block text-[1rem] leading-tight text-[var(--foreground)]">{summary.plan === "PLUS" ? "Plus" : "Start"}</strong>
          </div>
          <StatusPill tone={summary.status === "ACTIVE" ? "success" : undefined}>{loading ? "กำลังโหลด" : summary.status}</StatusPill>
        </div>

        <div className="grid grid-cols-3 items-start gap-2 [@media(orientation:portrait)]:grid-cols-1 max-[820px]:grid-cols-1">
          <div className="min-h-[62px] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3 py-2">
            <span className="text-[0.68rem] font-bold text-[var(--foreground-soft)]">ยืนยันชำระเดือนนี้</span>
            <strong className={`mt-1 block text-[0.96rem] ${usageTone(summary.usage.paymentConfirmationsThisMonth, summary.limits.paymentConfirmationsPerMonth)}`}>
              {formatLimit(summary.usage.paymentConfirmationsThisMonth, summary.limits.paymentConfirmationsPerMonth)}
            </strong>
          </div>
          <div className="min-h-[62px] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3 py-2">
            <span className="text-[0.68rem] font-bold text-[var(--foreground-soft)]">สินค้า</span>
            <strong className={`mt-1 block text-[0.96rem] ${usageTone(summary.usage.products, summary.limits.products)}`}>{formatLimit(summary.usage.products, summary.limits.products)}</strong>
          </div>
          <div className="min-h-[62px] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3 py-2">
            <span className="text-[0.68rem] font-bold text-[var(--foreground-soft)]">สต๊อกรวม</span>
            <strong className={`mt-1 block text-[0.96rem] ${usageTone(summary.usage.stockQuantityTotal, summary.limits.stockQuantityTotal)}`}>
              {formatLimit(summary.usage.stockQuantityTotal, summary.limits.stockQuantityTotal)}
            </strong>
          </div>
        </div>

        {isStartOverLimit ? (
          <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--panel-subtle)] px-3 py-2 text-[0.78rem] leading-[1.45] text-[var(--foreground-soft)]">
            <strong className="block text-[var(--foreground)]">ร้านนี้เกินขอบเขตแผน Start</strong>
            <span className="mt-1 block">
              ยังขายและแก้ไขข้อมูลเดิมได้ แต่จะเพิ่มสินค้า/เพิ่มสต๊อกไม่ได้จนกว่าจะลดให้อยู่ในขอบเขต หรืออัปเกรดเป็น Plus
            </span>
          </div>
        ) : null}
      </div>

      {error ? <p className="m-0 rounded-none border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[0.78rem] leading-[1.45] text-[var(--danger)] shadow-[var(--shadow-soft)]">{error}</p> : null}
    </div>
  );
}
