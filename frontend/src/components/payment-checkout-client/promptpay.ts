export type PromptPaySettingsLike = {
  promptPayRecipientType: string;
  promptPayMobileId: string;
  promptPayNationalId: string;
  promptPayTaxId: string;
};

export function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayProxy(settings: PromptPaySettingsLike) {
  if (settings.promptPayRecipientType === "MOBILE") {
    const id = settings.promptPayMobileId.replace(/\D/g, "");
    return { tag: "01", value: `0066${id.slice(1)}` };
  }

  if (settings.promptPayRecipientType === "NATIONAL_ID") {
    const id = settings.promptPayNationalId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  if (settings.promptPayRecipientType === "TAX_ID") {
    const id = settings.promptPayTaxId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  return null;
}

export function createPromptPayPayload(settings: PromptPaySettingsLike, amount: number) {
  const proxy = normalizePromptPayProxy(settings);
  if (!proxy) {
    return "";
  }

  const merchantAccountInfo = emv("00", "A000000677010111") + emv(proxy.tag, proxy.value);
  const amountText = Math.max(0, amount).toFixed(2);
  const payloadWithoutCrc =
    emv("00", "01") +
    emv("01", "12") +
    emv("29", merchantAccountInfo) +
    emv("53", "764") +
    emv("54", amountText) +
    emv("58", "TH") +
    "6304";

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}
