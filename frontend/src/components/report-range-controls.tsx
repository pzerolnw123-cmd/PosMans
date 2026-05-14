import { CalendarPicker } from "@/components/receipt-desk-client/calendar-picker";

type ReportRangeOption<T extends string> = {
  value: T;
  label: string;
};

type ReportRangeControlsProps<T extends string> = {
  calendarSelectedDate: string;
  range: T;
  rangeOptions: Array<ReportRangeOption<T>>;
  selectedDate: string;
  onRangeChange: (range: T) => void;
  onSelectedDateChange: (date: string) => void;
};

export function ReportRangeControls<T extends string>({
  calendarSelectedDate,
  range,
  rangeOptions,
  selectedDate,
  onRangeChange,
  onSelectedDateChange,
}: ReportRangeControlsProps<T>) {
  return (
    <>
      <CalendarPicker selectedDate={calendarSelectedDate} onSelectDate={onSelectedDateChange} />
      <div className="report-range-buttons flex flex-wrap justify-end gap-2 max-[720px]:justify-start">
        {rangeOptions.map((option) => {
          const active = !selectedDate && option.value === range;

          return (
            <button
              key={option.value}
              type="button"
              className={
                active
                  ? "min-h-[36px] rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 text-[0.84rem] font-bold text-[var(--foreground)]"
                  : "min-h-[36px] rounded-none border border-[var(--border)] bg-[var(--field-bg)] px-3 text-[0.84rem] font-bold text-[var(--foreground-soft)] transition hover:border-[var(--accent-border)] hover:text-[var(--foreground)]"
              }
              onClick={() => {
                onSelectedDateChange("");
                onRangeChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
