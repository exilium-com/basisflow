export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function usd(value, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function percent(value, digits = 1) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${roundTo(safeValue, digits)}%`;
}

export function years(value) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `${safeValue} ${safeValue === 1 ? "year" : "years"}`;
}

export function readNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function numberToEditableString(value, decimals = 0) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return decimals === 0 ? String(Math.round(value)) : String(roundTo(value, decimals));
}

export function formatInputDisplay(value, config) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (config.kind === "currency") {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: config.decimals,
    }).format(value);
  }

  if (config.kind === "integer") {
    return String(Math.round(value));
  }

  return String(roundTo(value, config.decimals));
}

export function readSavedString(value, fallback) {
  return typeof value === "string" && value !== "" ? value : fallback;
}

export function stripToNumber(rawValue) {
  if (typeof rawValue !== "string") {
    return Number.isFinite(rawValue) ? rawValue : NaN;
  }

  const normalized = rawValue.replace(/[^0-9.-]/g, "");
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return NaN;
  }

  return Number.parseFloat(normalized);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
