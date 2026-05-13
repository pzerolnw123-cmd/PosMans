"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { fetchWithCsrfRetry } from "@/lib/csrf";
import {
  activeGhostButtonClass,
  compactFooterGhostButtonClass,
  compactFooterPrimaryButtonClass,
  compactBankInputClass,
  fieldLabelClass,
  readApiMessage,
  type LineRecipientType,
  type OwnerLineSettingsValue,
} from "./shared";

const defaultLineSettings: OwnerLineSettingsValue = {
  enabled: false,
  notifyOnSalePaid: true,
  recipientType: "USER",
  recipientId: "",
  hasChannelAccessToken: false,
  channelAccessTokenHint: null,
  lastTestedAt: null,
  lastSuccessAt: null,
  lastError: null,
};

const recipientOptions: Array<{ value: LineRecipientType; label: string; helper: string }> = [
  { value: "USER", label: "เจ้าของร้าน", helper: "userId ขึ้นต้นด้วย U" },
  { value: "GROUP", label: "กลุ่มร้าน", helper: "groupId ขึ้นต้นด้วย C" },
  { value: "ROOM", label: "ห้องแชท", helper: "roomId ขึ้นต้นด้วย R" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function loadLineSettings() {
  const response = await fetch("/api/auth/owner-line-settings", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readApiMessage(response, "ไม่สามารถโหลดการตั้งค่า LINE OA ได้"));
  }

  const payload = (await response.json()) as { line?: OwnerLineSettingsValue };
  return payload.line || defaultLineSettings;
}

export function OwnerLineSettingsClient({ startExpanded = false }: { startExpanded?: boolean }) {
  const { setShellAlert } = useBackofficeShellAlert();
  const [settings, setSettings] = useState<OwnerLineSettingsValue>(defaultLineSettings);
  const [savedSettings, setSavedSettings] = useState<OwnerLineSettingsValue>(defaultLineSettings);
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [expanded, setExpanded] = useState(startExpanded);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLineSettings()
      .then((lineSettings) => {
        if (!cancelled) {
          setSettings(lineSettings);
          setSavedSettings(lineSettings);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setShellAlert({
            tone: "danger",
            message: error instanceof Error ? error.message : "ไม่สามารถโหลดการตั้งค่า LINE OA ได้",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setShellAlert]);

  const trimmedRecipientId = settings.recipientId.trim();
  const trimmedChannelAccessToken = channelAccessToken.trim();
  const hasEffectiveToken = !clearToken && (settings.hasChannelAccessToken || trimmedChannelAccessToken.length > 0);
  const canToggleNotification = trimmedRecipientId.length > 0 && hasEffectiveToken;
  const effectiveEnabled = settings.enabled && canToggleNotification;
  const hasSettingsChanges =
    effectiveEnabled !== savedSettings.enabled ||
    settings.notifyOnSalePaid !== savedSettings.notifyOnSalePaid ||
    settings.recipientType !== savedSettings.recipientType ||
    trimmedRecipientId !== savedSettings.recipientId ||
    clearToken;
  const hasTokenChange = trimmedChannelAccessToken.length > 0;
  const hasChanges = hasSettingsChanges || hasTokenChange;
  const canSave = !loading && !saving && !testing && hasChanges;
  const ready = !loading && !clearToken && settings.hasChannelAccessToken && trimmedRecipientId.length > 0;
  const statusLabel = ready && effectiveEnabled ? "เชื่อมต่อแล้ว" : ready ? "พร้อมแต่ยังปิดอยู่" : "ยังไม่ได้เชื่อมต่อ";
  const lastSuccessText = useMemo(() => formatDateTime(settings.lastSuccessAt), [settings.lastSuccessAt]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithCsrfRetry("/api/auth/owner-line-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: effectiveEnabled,
          notifyOnSalePaid: settings.notifyOnSalePaid,
          recipientType: settings.recipientType,
          recipientId: trimmedRecipientId || null,
          channelAccessToken: trimmedChannelAccessToken || null,
          clearChannelAccessToken: clearToken,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response, "ไม่สามารถบันทึกการตั้งค่า LINE OA ได้"));
      }

      const payload = (await response.json()) as { line?: OwnerLineSettingsValue };
      const nextSettings = payload.line || defaultLineSettings;
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setChannelAccessToken("");
      setClearToken(false);
      setShellAlert({ tone: "success", message: "บันทึกการตั้งค่า LINE OA แล้ว" });
    } catch (error) {
      setShellAlert({
        tone: "danger",
        message: error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่า LINE OA ได้",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMessage() {
    setTesting(true);
    try {
      const response = await fetchWithCsrfRetry("/api/auth/owner-line-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response, "ส่งข้อความทดสอบ LINE OA ไม่สำเร็จ"));
      }

      const payload = (await response.json()) as { line?: OwnerLineSettingsValue };
      const nextSettings = payload.line || settings;
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setShellAlert({ tone: "success", message: "ส่งข้อความทดสอบ LINE OA แล้ว" });
    } catch (error) {
      setShellAlert({
        tone: "danger",
        message: error instanceof Error ? error.message : "ส่งข้อความทดสอบ LINE OA ไม่สำเร็จ",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={saveSettings}>
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="mt-1 block text-[0.98rem] leading-tight text-[var(--foreground)]">{loading ? "กำลังโหลด..." : statusLabel}</strong>
            <p className="m-0 mt-1 text-[0.76rem] leading-[1.45] text-[var(--foreground-soft)]">
              แจ้งเตือนยอดขายสำเร็จด้วย LINE OA ของร้านนี้ โควต้านับแยกตาม OA ของร้าน
            </p>
          </div>
          <button
            type="button"
            className={`${activeGhostButtonClass} min-h-[34px] shrink-0 px-3 text-[0.82rem]`}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "ย่อ" : "ตั้งค่า"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.76rem] text-[var(--foreground-soft)]">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">
            Token: {loading ? "กำลังโหลด..." : settings.channelAccessTokenHint || (settings.hasChannelAccessToken ? "บันทึกแล้ว" : "ยังไม่มี")}
          </span>
          {lastSuccessText ? <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1">ล่าสุด: {lastSuccessText}</span> : null}
        </div>
      </div>

      {expanded ? loading ? (
        <div
          className="grid min-h-[220px] place-items-center rounded-[12px] border border-[var(--border)] bg-[var(--panel-subtle)] p-3 text-center"
          aria-busy="true"
        >
          <div className="grid gap-2">
            <span className="mx-auto h-3 w-24 rounded-full bg-[var(--surface-muted)]" />
            <strong className="text-[0.95rem] text-[var(--foreground)]">กำลังโหลดการตั้งค่า LINE OA...</strong>
            <span className="text-[0.78rem] text-[var(--foreground-soft)]">รอข้อมูลจริงจากระบบก่อนแสดงสวิตช์</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--panel-subtle)] p-3">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2 max-[640px]:flex-col max-[640px]:items-start">
            <span className="grid min-w-0 gap-1">
              <span className="truncate text-[0.95rem] font-bold leading-[1.45] text-[var(--foreground)]">เปิดแจ้งเตือน LINE OA</span>
              <span className="text-[0.8rem] leading-[1.45] text-[var(--foreground-soft)]">
                {canToggleNotification ? "ส่งเมื่อชำระเงินสำเร็จ" : "กรอก Recipient ID และ token ก่อนเปิดสวิตช์"}
              </span>
            </span>
            <span className={`stock-toggle-uiverse shrink-0 ${canToggleNotification ? "" : "opacity-[0.55]"}`}>
              <span className="check" aria-hidden="true">
                <input
                  id="owner-line-settings-toggle"
                  type="checkbox"
                  checked={effectiveEnabled}
                  onChange={(event) => {
                    if (!canToggleNotification) {
                      return;
                    }
                    setSettings((current) => ({ ...current, enabled: event.target.checked }));
                  }}
                  disabled={!canToggleNotification}
                  aria-label={settings.enabled ? "ปิดแจ้งเตือน LINE OA" : "เปิดแจ้งเตือน LINE OA"}
                />
                <label htmlFor="owner-line-settings-toggle" />
              </span>
            </span>
          </div>

          <div className="grid gap-2">
            <span className={fieldLabelClass}>ปลายทางแจ้งเตือน</span>
            <div className="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1">
              {recipientOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    settings.recipientType === option.value
                      ? "rounded-[10px] border border-[var(--brand-strong)] bg-[var(--active-surface)] px-3 py-2 text-left text-[var(--foreground)] shadow-[var(--brand-shadow)_0_8px_18px]"
                      : "rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[var(--foreground-soft)] transition hover:border-[var(--border-strong)]"
                  }
                  onClick={() => setSettings((current) => ({ ...current, recipientType: option.value }))}
                >
                  <strong className="block text-[0.84rem]">{option.label}</strong>
                  <span className="text-[0.68rem] leading-[1.25]">{option.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className={fieldLabelClass}>Recipient ID</span>
            <input
              className={compactBankInputClass}
              value={settings.recipientId}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  enabled: event.target.value.trim() ? current.enabled : false,
                  recipientId: event.target.value,
                }))
              }
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={fieldLabelClass}>Channel access token</span>
            <input
              className={compactBankInputClass}
              value={channelAccessToken}
              onChange={(event) => {
                setChannelAccessToken(event.target.value);
                setClearToken(false);
              }}
              placeholder={settings.hasChannelAccessToken ? "เว้นว่างไว้ถ้าไม่เปลี่ยน token" : "ใส่ long-lived channel access token"}
              type="password"
              autoComplete="off"
            />
          </label>

          {settings.hasChannelAccessToken ? (
            <label className="group inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.78rem] font-semibold text-[var(--foreground-soft)] transition hover:border-[var(--danger-border)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-bright)]">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={clearToken}
                onChange={(event) => {
                  setClearToken(event.target.checked);
                  if (event.target.checked) {
                    setChannelAccessToken("");
                    setSettings((current) => ({ ...current, enabled: false }));
                  }
                }}
              />
              <span
                className="grid h-4 w-4 place-items-center rounded-[5px] border border-[var(--border-field)] bg-[var(--field-bg)] text-[0.7rem] leading-none text-transparent transition peer-checked:border-[var(--danger-border)] peer-checked:bg-[var(--danger-bright)] peer-checked:text-white"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>ลบ token ที่บันทึกไว้</span>
            </label>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={compactFooterGhostButtonClass} onClick={sendTestMessage} disabled={testing || saving || !ready}>
              {testing ? "กำลังส่ง..." : "ส่งทดสอบ"}
            </button>
            <button type="submit" className={compactFooterPrimaryButtonClass} disabled={!canSave}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
