const thaiNumberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

const thaiCurrencyFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

const thaiMediumDateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

const thaiShortDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatThaiNumber(value: number) {
  return thaiNumberFormatter.format(value);
}

export function formatBaht(value: number) {
  return `฿${thaiCurrencyFormatter.format(Math.round(value))}`;
}

export function formatCompactBaht(value: number) {
  if (value >= 1_000_000) {
    return `฿${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `฿${Math.round(value / 1000)}K`;
  }

  return `฿${Math.round(value)}`;
}

export function formatThaiDate(value: Date) {
  return thaiShortDateFormatter.format(value);
}

export function formatThaiDateTime(value: string | Date) {
  return thaiMediumDateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}
