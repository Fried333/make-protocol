import { _bytesToHex, _hexToBytes } from "./encoding.js";

export function isHexString(value) {
  return typeof value === "string" && value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

export function isIaddr(value) {
  return typeof value === "string" && /^i[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
}

export function encodeJsonToHex(payload) {
  return _bytesToHex(new TextEncoder().encode(JSON.stringify(payload)));
}

export function multimapEntryToHex(entry, { fallbackToJson = false } = {}) {
  if (typeof entry === "string") return entry;
  if (entry?.serializedhex) return entry.serializedhex;
  if (entry?.message) return entry.message;
  return fallbackToJson ? JSON.stringify(entry) : "";
}

export function decodeJsonMultimapEntry(entry) {
  const hex = multimapEntryToHex(entry);
  if (!isHexString(hex)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(_hexToBytes(hex)));
  } catch {
    return null;
  }
}

export function normalizeContentMultimap(
  cm,
  { fallbackToJson = false, requireHex = false, requireIaddrKeys = false } = {},
) {
  const out = {};
  for (const [key, value] of Object.entries(cm || {})) {
    if (requireIaddrKeys && !isIaddr(key)) continue;
    const entries = (Array.isArray(value) ? value : [value])
      .map((entry) => multimapEntryToHex(entry, { fallbackToJson }))
      .filter((hex) => requireHex ? isHexString(hex) : !!hex);
    if (entries.length) out[key] = entries;
  }
  return out;
}

export function setMultimapEntries(cm, vdxfId, entries, options) {
  const out = normalizeContentMultimap(cm, options);
  out[vdxfId] = entries;
  return out;
}

export function dropMultimapKey(cm, vdxfId, options) {
  const out = normalizeContentMultimap(cm, options);
  delete out[vdxfId];
  return out;
}
