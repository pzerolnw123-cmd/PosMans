"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useBackofficeShellAlert } from "@/components/backoffice-shell";
import { StatusPill } from "@/components/ui-primitives";
import { ensureCsrfToken } from "@/lib/csrf";
import type { OwnerThemeId } from "./shared";
import {
  activeGhostButtonClass,
  isOwnerTheme,
  ownerThemeOptions,
  ownerThemeStorageKey,
} from "./shared";

// ── Theme Helpers ────────────────────────────────────────────────────────────

function readOwnerTheme(): OwnerThemeId {
  if (typeof window === "undefined") {
    return "violet";
  }

  const currentTheme = document.documentElement.dataset.storeTheme;
  if (isOwnerTheme(currentTheme)) {
    return currentTheme;
  }

  try {
    const savedTheme = window.localStorage.getItem(ownerThemeStorageKey);
    if (isOwnerTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // Ignore localStorage access issues and fall back to the default theme.
  }

  return "violet";
}

function applyOwnerTheme(theme: OwnerThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.storeTheme = theme;

  try {
    window.localStorage.setItem(ownerThemeStorageKey, theme);
  } catch {
    // Persisting the theme is optional; the visual update should still work.
  }
}

async function persistOwnerTheme(theme: OwnerThemeId) {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch("/api/auth/owner-theme", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken || "",
    },
    body: JSON.stringify({ theme }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "ไม่สามารถบันทึกธีมของผู้ใช้ได้");
  }

  return response.json().catch(() => null);
}

// ── ThemeSparkleIcon ─────────────────────────────────────────────────────────

function ThemeSparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="m12 3 1.72 4.28L18 9l-4.28 1.72L12 15l-1.72-4.28L6 9l4.28-1.72L12 3Zm7 10 1 2.5 2.5 1-2.5 1L19 20l-1-2.5-2.5-1 2.5-1L19 13ZM5 14l1.1 2.9L9 18l-2.9 1.1L5 22l-1.1-2.9L1 18l2.9-1.1L5 14Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── ThemePickerModal ─────────────────────────────────────────────────────────

function ThemePickerModal({
  open,
  activeTheme,
  onSelect,
  onClose,
}: {
  open: boolean;
  activeTheme: OwnerThemeId;
  onSelect: (theme: OwnerThemeId) => void;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[320] grid place-items-center bg-[var(--modal-backdrop)] p-3 backdrop-blur-[16px] max-[640px]:p-2.5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--brand-soft),transparent_52%)]" />
      <div
        className="relative z-[1] grid max-h-[min(560px,calc(100vh-24px))] w-[min(540px,calc(100vw-24px))] gap-3 overflow-y-auto overflow-x-hidden rounded-[20px] border border-[var(--border)] bg-[var(--modal-surface)] p-4 shadow-[var(--modal-shadow)] max-[640px]:max-h-[min(520px,calc(100vh-20px))] max-[640px]:gap-2.5 max-[640px]:rounded-[16px] max-[640px]:p-3.5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[var(--brand-strong)]">
              <ThemeSparkleIcon className="h-3.5 w-3.5" />
              Theme Switch
            </span>
            <div className="grid gap-1">
              <h3 className="m-0 text-[1.4rem] leading-tight tracking-[-0.05em] text-[var(--foreground)] max-[640px]:text-[1.2rem]">เลือกธีมร้านของคุณ</h3>
              <p className="m-0 text-[0.88rem] leading-[1.6] text-[var(--foreground-soft)] max-[640px]:text-[0.8rem]">
                เปลี่ยนโทนสีของ owner workspace แล้วดูผลได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            onClick={onClose}
            aria-label="ปิดหน้าต่างเลือกธีม"
          >
            <span className="text-[1.2rem] leading-none">×</span>
          </button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ownerThemeOptions.map((option) => {
            const active = option.id === activeTheme;

            return (
              <button
                key={option.id}
                type="button"
                className={
                  active
                    ? "grid min-w-0 gap-2 rounded-[16px] border border-[var(--brand-strong)] bg-[linear-gradient(180deg,var(--brand-soft),rgba(255,255,255,0.02))] p-2.5 text-left text-[var(--foreground)] shadow-[var(--brand-shadow)_0_14px_28px] transition"
                    : "grid min-w-0 gap-2 rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-left text-[var(--foreground-soft)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                }
                onClick={() => onSelect(option.id)}
              >
                <span
                  className="block h-12 rounded-[12px] shadow-sm"
                  style={{ background: option.preview }}
                  aria-hidden="true"
                />
                <div className="grid gap-1">
                  <span className="text-[0.9rem] font-bold leading-[1.2]">{option.label}</span>
                  <span className={`text-[0.72rem] leading-[1.4] ${active ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]"}`}>
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-2.5 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:px-3">
          <p className="m-0 text-[0.76rem] leading-[1.45] text-[var(--foreground-soft)]">
            ธีมจะถูกบันทึกไว้ในเบราว์เซอร์นี้ และมีผลกับสี accent ของ workspace ฝั่งเจ้าของร้าน
          </p>
          <button type="button" className={`${activeGhostButtonClass} min-h-[36px] shrink-0 px-3.5 text-[0.84rem]`} onClick={onClose}>
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── OwnerThemeStatusPill ─────────────────────────────────────────────────────

export function OwnerThemeStatusPill() {
  return (
    <StatusPill tone="success">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      คุณมีธีมร้านแล้ว
    </StatusPill>
  );
}

// ── OwnerThemeClient ─────────────────────────────────────────────────────────

export function OwnerThemeClient() {
  const { setShellAlert } = useBackofficeShellAlert();
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<OwnerThemeId | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    setActiveTheme(readOwnerTheme());
  }, []);

  useEffect(() => {
    if (!activeTheme) {
      return;
    }

    applyOwnerTheme(activeTheme);
  }, [activeTheme]);

  const activeThemeOption = ownerThemeOptions.find((option) => option.id === activeTheme) || ownerThemeOptions[0];

  return (
    <div className="mt-1 grid min-w-0 gap-2 max-[520px]:gap-2">
      <button
        type="button"
        className="grid min-w-0 gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)] max-[520px]:rounded-[11px] max-[520px]:p-2.5"
        onClick={() => setThemePickerOpen(true)}
        aria-expanded={themePickerOpen}
        aria-haspopup="dialog"
      >
        <div className="flex min-w-0 items-start justify-between gap-2.5 max-[520px]:gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--eyebrow)]">ธีมที่กำลังใช้</span>
            <strong className="mt-1 block break-words text-[0.94rem] leading-tight text-[var(--foreground)] max-[520px]:text-[0.86rem]">{activeThemeOption.label}</strong>
          </div>
          <span
            className="h-9 w-9 shrink-0 rounded-[11px] border border-[var(--border)] shadow-[rgba(0,0,0,0.2)_0_10px_20px] max-[520px]:h-8 max-[520px]:w-8"
            style={{ background: activeThemeOption.preview }}
            aria-hidden="true"
          />
        </div>
        <p className="m-0 text-[0.78rem] leading-[1.45] text-[var(--foreground-soft)] max-[520px]:text-[0.72rem]">{activeThemeOption.description}</p>
      </button>

      <button
        type="button"
        className="hidden"
        onClick={() => setThemePickerOpen((open) => !open)}
        aria-expanded={themePickerOpen}
      >
        <ThemeSparkleIcon className="h-[18px] w-[18px] shrink-0 opacity-90 max-[520px]:h-4 max-[520px]:w-4" />
        เลือกธีมร้านของคุณใหม่
      </button>

      <ThemePickerModal
        open={themePickerOpen}
        activeTheme={activeThemeOption.id}
        onSelect={(theme) => {
          const previousTheme = activeTheme || "violet";
          setActiveTheme(theme);
          setThemePickerOpen(false);
          setSavingTheme(true);

          void persistOwnerTheme(theme)
            .then(() => {
              setShellAlert({ message: "บันทึกธีมของผู้ใช้เรียบร้อยแล้ว", tone: "success" });
            })
            .catch((error) => {
              setActiveTheme(previousTheme);
              applyOwnerTheme(previousTheme);
              setShellAlert({
                message: error instanceof Error ? error.message : "ไม่สามารถบันทึกธีมของผู้ใช้ได้",
                tone: "danger",
              });
            })
            .finally(() => {
              setSavingTheme(false);
            });
        }}
        onClose={() => setThemePickerOpen(false)}
      />

      {false ? (
        <div className="grid gap-2.5 overflow-hidden rounded-none border border-[rgba(100,120,160,0.16)] bg-[rgba(255,255,255,0.03)] p-3 max-[520px]:p-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            {ownerThemeOptions.map((option) => {
              const active = option.id === activeTheme;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={
                    active
                      ? "grid min-w-0 gap-2 rounded-[12px] border border-[var(--brand-strong)] bg-[var(--brand-soft)] p-2.5 text-left text-[var(--foreground)] shadow-[rgba(0,0,0,0.16)_0_10px_18px] max-[520px]:rounded-[10px] max-[520px]:p-2"
                      : "grid min-w-0 gap-2 rounded-[12px] border border-[rgba(100,120,160,0.16)] bg-[var(--field-bg)] p-2.5 text-left text-[var(--foreground-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] max-[520px]:rounded-[10px] max-[520px]:p-2"
                  }
                  onClick={() => setActiveTheme(option.id)}
                >
                  <span
                    className="block h-10 rounded-[10px] border border-[var(--border)] max-[520px]:h-8"
                    style={{ background: option.preview }}
                    aria-hidden="true"
                  />
                  <span className="break-words text-[0.84rem] font-bold leading-[1.35] max-[520px]:text-[0.76rem]">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="m-0 text-[0.75rem] leading-[1.45] text-[var(--foreground-soft)] max-[520px]:text-[0.7rem]">
            ธีมจะถูกบันทึกไว้ในเบราว์เซอร์นี้ และมีผลกับสี accent ของ workspace ฝั่งเจ้าของร้าน
          </p>
        </div>
      ) : null}
    </div>
  );
}
