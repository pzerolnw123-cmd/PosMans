"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/components/product-management-studio/lib";
import type { SuperAdminPayload, SuperAdminUser } from "@/lib/superadmin";
import { StatusPill } from "@/components/ui-primitives";

type PlanRow = NonNullable<SuperAdminPayload["plans"]>[number];

const inputClass =
  "min-h-[40px] rounded-none border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[0.88rem] text-[var(--foreground)] outline-none focus:border-[var(--accent-border)]";
const buttonClass =
  "inline-flex min-h-[40px] items-center justify-center rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 text-[0.86rem] font-bold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50";
const mutedFieldClass =
  "min-h-[40px] rounded-none border border-[var(--border)] bg-[var(--panel-subtle)] px-3 py-2 text-[0.88rem] text-[var(--foreground-soft)]";

const plusDurationOptions = [
  { value: "1", label: "1 เดือน" },
  { value: "3", label: "3 เดือน" },
  { value: "6", label: "6 เดือน" },
  { value: "12", label: "12 เดือน" },
];

function formatExpiry(value: string | null | undefined) {
  if (!value) {
    return "ยังไม่ได้กำหนด";
  }

  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
}

export function SuperAdminOwnersEditor({ owners }: { owners: SuperAdminUser[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submitOwner(event: FormEvent<HTMLFormElement>, owner: SuperAdminUser) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      username: String(form.get("username") || "").trim(),
      displayName: String(form.get("displayName") || "").trim(),
      isActive: form.get("isActive") === "true",
    };

    try {
      setBusyId(owner.id);
      setMessage("");
      await requestJson(`/api/superadmin/owners/${owner.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage("บันทึกข้อมูลผู้ใช้แล้ว");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="max-w-full overflow-hidden rounded-none border border-[var(--border)] bg-[var(--surface-muted)]">
        <table className="w-full table-fixed border-collapse text-left text-[0.82rem]">
          <thead className="bg-[var(--panel-subtle)] text-[0.72rem] uppercase tracking-[0.16em] text-[var(--eyebrow)]">
            <tr>
              <th className="w-[25%] border-b border-[var(--border)] px-3 py-2 font-bold">Username</th>
              <th className="w-[25%] border-b border-[var(--border)] px-3 py-2 font-bold">Display</th>
              <th className="w-[24%] border-b border-[var(--border)] px-3 py-2 font-bold max-[820px]:hidden">Store</th>
              <th className="w-[120px] border-b border-[var(--border)] px-3 py-2 font-bold">Status</th>
              <th className="w-[120px] border-b border-[var(--border)] px-3 py-2 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => {
              const formId = `superadmin-owner-${owner.id}`;
              return (
                <tr key={owner.id} className="border-b border-[var(--border-hairline)] last:border-b-0">
                  <td className="min-w-0 px-3 py-2.5 align-middle">
                    <input className={`${inputClass} w-full min-w-0`} form={formId} name="username" defaultValue={owner.username} autoComplete="off" />
                  </td>
                  <td className="min-w-0 px-3 py-2.5 align-middle">
                    <input className={`${inputClass} w-full min-w-0`} form={formId} name="displayName" defaultValue={owner.displayName} autoComplete="off" />
                  </td>
                  <td className="min-w-0 px-3 py-2.5 align-middle max-[820px]:hidden">
                    <span className="block truncate text-[0.84rem] text-[var(--foreground)]" title={owner.store ? `${owner.store.name} (${owner.store.slug})` : "ไม่ผูกร้าน"}>
                      {owner.store ? `${owner.store.name} (${owner.store.slug})` : "ไม่ผูกร้าน"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <select className={`${inputClass} w-full min-w-0`} form={formId} name="isActive" defaultValue={String(owner.isActive)}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <form id={formId} onSubmit={(event) => void submitOwner(event, owner)}>
                      <button className={`${buttonClass} w-full`} type="submit" disabled={busyId === owner.id || isPending}>
                        บันทึก
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {message ? <p className="m-0 text-[0.86rem] text-[var(--foreground-soft)]">{message}</p> : null}
    </div>
  );
}

export function SuperAdminOwnerPlanEditor({ owners }: { owners: SuperAdminUser[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedTierByOwner, setSelectedTierByOwner] = useState<Record<string, string>>({});
  const ownersWithStores = owners.filter((owner) => owner.store);

  async function submitOwnerPlan(event: FormEvent<HTMLFormElement>, owner: SuperAdminUser) {
    event.preventDefault();
    if (!owner.store) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const tier = String(form.get("tier") || "START");
    const durationMonths = Number(String(form.get("durationMonths") || "1"));
    const extendDaysText = String(form.get("extendDays") || "").trim();
    const payload = {
      tier,
      status: String(form.get("status") || "ACTIVE"),
      ...(tier === "PLUS"
        ? {
            durationMonths,
            ...(extendDaysText ? { extendDays: Number(extendDaysText) } : {}),
          }
        : { expiresAt: null }),
    };

    try {
      setBusyId(owner.id);
      setMessage("");
      await requestJson(`/api/superadmin/plans/${owner.store.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage("บันทึก plan ของ owner แล้ว");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (!ownersWithStores.length) {
    return <p className="m-0 text-[0.9rem] text-[var(--foreground-soft)]">ยังไม่มี owner ที่ผูกร้านสำหรับกำหนด plan</p>;
  }

  return (
    <div className="grid gap-3">
      {ownersWithStores.map((owner) => {
        const plan = owner.store?.plan;
        const selectedTier = selectedTierByOwner[owner.id] || plan?.tier || "START";
        const isPlus = selectedTier === "PLUS";

        return (
          <form key={owner.id} className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] p-3" onSubmit={(event) => void submitOwnerPlan(event, owner)}>
            <div className="flex items-start justify-between gap-3 max-[720px]:flex-col">
              <div>
                <strong className="block text-[1rem]">{owner.displayName}</strong>
                <span className="text-[0.82rem] text-[var(--foreground-soft)]">
                  {owner.store?.name} ({owner.store?.slug})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill>{plan?.tier || "START"}</StatusPill>
                <StatusPill tone={(plan?.status || "ACTIVE") === "ACTIVE" ? "success" : "ghost"}>{plan?.status || "ACTIVE"}</StatusPill>
              </div>
            </div>

            <div className="grid grid-cols-[150px_160px_1fr_auto] gap-2 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
              <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                Plan
                <select
                  className={inputClass}
                  name="tier"
                  value={selectedTier}
                  onChange={(event) => setSelectedTierByOwner((current) => ({ ...current, [owner.id]: event.target.value }))}
                >
                  <option value="START">START</option>
                  <option value="PLUS">PLUS</option>
                </select>
              </label>
              <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                Status
                <select className={inputClass} name="status" defaultValue={plan?.status || "ACTIVE"}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </label>
              {isPlus ? (
                <div className="grid grid-cols-3 gap-2 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1">
                  <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    ระยะเวลา PLUS
                    <select className={inputClass} name="durationMonths" defaultValue="1">
                      {plusDurationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    เพิ่มวันเอง
                    <input className={inputClass} type="number" name="extendDays" min="1" max="365" placeholder="ไม่บังคับ" />
                  </label>
                  <div className="grid content-end gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    หมดอายุปัจจุบัน
                    <span className={mutedFieldClass}>{formatExpiry(plan?.expiresAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="grid content-end gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                  PLUS
                  <span className={mutedFieldClass}>เลือก PLUS ก่อน แล้วเลือกระยะเวลาใช้งาน เช่น 1 เดือน</span>
                </div>
              )}
              <div className="grid items-end">
                <button className={buttonClass} type="submit" disabled={busyId === owner.id || isPending}>
                  บันทึก plan
                </button>
              </div>
            </div>
          </form>
        );
      })}
      {message ? <p className="m-0 text-[0.86rem] text-[var(--foreground-soft)]">{message}</p> : null}
    </div>
  );
}

export function SuperAdminPlansEditor({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedTierByPlan, setSelectedTierByPlan] = useState<Record<string, string>>({});
  const [selectedStatusByPlan, setSelectedStatusByPlan] = useState<Record<string, string>>({});
  const [selectedDurationByPlan, setSelectedDurationByPlan] = useState<Record<string, string>>({});
  const [extendDaysByPlan, setExtendDaysByPlan] = useState<Record<string, string>>({});

  async function submitPlan(event: FormEvent<HTMLFormElement>, plan: PlanRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tier = String(form.get("tier") || "START");
    const durationMonths = Number(String(form.get("durationMonths") || "1"));
    const extendDaysText = String(form.get("extendDays") || "").trim();
    const payload = {
      tier,
      status: String(form.get("status") || "ACTIVE"),
      ...(tier === "PLUS"
        ? {
            durationMonths,
            ...(extendDaysText ? { extendDays: Number(extendDaysText) } : {}),
          }
        : { expiresAt: null }),
    };

    try {
      setBusyId(plan.store.id);
      setMessage("");
      await requestJson(`/api/superadmin/plans/${plan.store.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMessage("บันทึก plan แล้ว");
      setSelectedTierByPlan((current) => {
        const next = { ...current };
        delete next[plan.id];
        return next;
      });
      setSelectedStatusByPlan((current) => {
        const next = { ...current };
        delete next[plan.id];
        return next;
      });
      setSelectedDurationByPlan((current) => {
        const next = { ...current };
        delete next[plan.id];
        return next;
      });
      setExtendDaysByPlan((current) => {
        const next = { ...current };
        delete next[plan.id];
        return next;
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-3">
      {plans.map((plan) => {
        const selectedTier = selectedTierByPlan[plan.id] || plan.tier;
        const selectedStatus = selectedStatusByPlan[plan.id] || plan.status;
        const selectedDuration = selectedDurationByPlan[plan.id] || "1";
        const extendDays = extendDaysByPlan[plan.id] || "";
        const isPlus = selectedTier === "PLUS";
        const hasChanges = selectedTier !== plan.tier || selectedStatus !== plan.status || (isPlus && (selectedDuration !== "1" || extendDays.trim() !== ""));

        return (
          <form key={plan.id} className="grid gap-3 rounded-none border border-[var(--border)] bg-[var(--surface-muted)] p-3" onSubmit={(event) => void submitPlan(event, plan)}>
            <div className="flex items-start justify-between gap-3 max-[720px]:flex-col">
              <div>
                <strong className="block text-[1rem]">{plan.store.name}</strong>
                <span className="text-[0.82rem] text-[var(--foreground-soft)]">{plan.store.slug}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill>{plan.tier}</StatusPill>
                <StatusPill tone={plan.status === "ACTIVE" ? "success" : "ghost"}>{plan.status}</StatusPill>
              </div>
            </div>

            <div className="grid grid-cols-[150px_160px_1fr_auto] gap-2 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
              <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                Plan
                <select
                  className={inputClass}
                  name="tier"
                  value={selectedTier}
                  onChange={(event) => setSelectedTierByPlan((current) => ({ ...current, [plan.id]: event.target.value }))}
                >
                  <option value="START">START</option>
                  <option value="PLUS">PLUS</option>
                </select>
              </label>
              <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                Status
                <select
                  className={inputClass}
                  name="status"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatusByPlan((current) => ({ ...current, [plan.id]: event.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </label>
              {isPlus ? (
                <div className="grid grid-cols-3 gap-2 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1">
                  <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    ระยะเวลา PLUS
                    <select
                      className={inputClass}
                      name="durationMonths"
                      value={selectedDuration}
                      onChange={(event) => setSelectedDurationByPlan((current) => ({ ...current, [plan.id]: event.target.value }))}
                    >
                      {plusDurationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    เพิ่มวันเอง
                    <input
                      className={inputClass}
                      type="number"
                      name="extendDays"
                      min="1"
                      max="365"
                      placeholder="ไม่บังคับ"
                      value={extendDays}
                      onChange={(event) => setExtendDaysByPlan((current) => ({ ...current, [plan.id]: event.target.value }))}
                    />
                  </label>
                  <div className="grid content-end gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                    หมดอายุปัจจุบัน
                    <span className={mutedFieldClass}>{formatExpiry(plan.expiresAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="grid content-end gap-1 text-[0.78rem] font-bold text-[var(--foreground-soft)]">
                  PLUS
                  <span className={mutedFieldClass}>เลือก PLUS ก่อน แล้วเลือกระยะเวลาใช้งาน เช่น 1 เดือน</span>
                </div>
              )}
              <div className="grid items-end">
                <button className={buttonClass} type="submit" disabled={!hasChanges || busyId === plan.store.id || isPending}>
                  บันทึก plan
                </button>
              </div>
            </div>
          </form>
        );
      })}
      {message ? <p className="m-0 text-[0.86rem] text-[var(--foreground-soft)]">{message}</p> : null}
    </div>
  );
}
