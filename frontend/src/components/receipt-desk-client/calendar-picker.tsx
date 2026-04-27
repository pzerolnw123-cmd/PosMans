import { useState, useMemo } from "react";
import { formatDateTime, monthLabel, buildCalendarDays, toDateInputValue, shiftDateInputValue, parseDateInput } from "./shared";

export type CalendarPickerProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function CalendarPicker({ selectedDate, onSelectDate }: CalendarPickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const todayDate = new Date();
    return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  });

  const today = useMemo(() => toDateInputValue(new Date()), []);
  const yesterday = useMemo(() => shiftDateInputValue(-1), []);
  const datePreset =
    selectedDate === ""
      ? "all"
      : selectedDate === today
        ? "today"
        : selectedDate === yesterday
          ? "yesterday"
          : "custom";

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  function applyDateFilter(date: string) {
    onSelectDate(date);
    const parsed = parseDateInput(date);
    if (parsed) {
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }

  return (
    <div className="grid w-full gap-2">
      <span className="text-[0.78rem] font-bold text-[var(--foreground-soft)]">เลือกวันที่เอง</span>
      <div className="relative">
        <button
          type="button"
          className="relative flex h-[46px] w-full items-center rounded-[8px] border border-[rgba(100,120,160,0.24)] bg-[var(--field-bg)] px-4 pr-10 text-left text-[0.95rem] font-bold text-[var(--foreground)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--brand-strong)] focus:shadow-[var(--brand-shadow)_0_0_0_4px]"
          onClick={() => setCalendarOpen((open) => !open)}
        >
          <span>{selectedDate ? formatDateTime(`${selectedDate}T00:00:00+07:00`).replace(" 00:00", "") : "เลือกจากปฏิทิน"}</span>
          <span className="absolute inset-y-0 right-4 flex items-center" aria-hidden="true">
            <span className="block h-2 w-2 rotate-45 border-b-2 border-r-2 border-[var(--accent-text)]" />
          </span>
        </button>

        {calendarOpen ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-full max-w-[340px] overflow-y-auto rounded-none border border-[rgba(100,120,160,0.24)] bg-[var(--surface)] p-3 shadow-[rgba(0,0,0,0.18)_0_18px_38px] max-h-[min(360px,calc(100vh-260px))] max-[520px]:left-0 max-[520px]:right-auto max-[520px]:max-w-none">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] text-[1.45rem] leading-none text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <strong className="text-[1.05rem] font-black text-[var(--foreground)]">{monthLabel(calendarMonth)}</strong>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-none border border-[rgba(100,120,160,0.16)] bg-[var(--panel-subtle)] text-[1.45rem] leading-none text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-[rgba(100,120,160,0.16)] pb-2 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] text-[var(--eyebrow)]">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                <span key={day} className="py-1">{day}</span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-1">
              {calendarDays.map((day) => {
                const active = day.value === selectedDate;
                const isToday = day.value === today;

                return (
                  <button
                    key={day.value}
                    type="button"
                    className={
                      active
                        ? "h-8 rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[0.78rem] font-black text-[var(--foreground)] shadow-[var(--brand-shadow)_0_8px_18px]"
                        : isToday
                          ? "h-8 rounded-none border border-[rgba(46,212,122,0.32)] bg-[rgba(46,212,122,0.1)] text-[0.78rem] font-black text-[#8cffbd]"
                          : day.inMonth
                            ? "h-8 rounded-none border border-transparent text-[0.78rem] font-black text-[var(--foreground)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-surface)]"
                            : "h-8 rounded-none border border-transparent text-[0.78rem] font-black text-[#4f5d75] transition hover:text-[var(--foreground-soft)]"
                    }
                    onClick={() => {
                      applyDateFilter(day.value);
                      setCalendarOpen(false);
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
