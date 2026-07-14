import { escapeHtml } from "./dom.js";

export function formatAmount(a) {
  if (!a || typeof a !== "object") return "—";
  return `${escapeHtml(a.amount ?? "?")} ${escapeHtml(a.currency ?? "")}`;
}
