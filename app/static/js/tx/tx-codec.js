import {
  _bytesToHex,
  _hexToBytes,
  _readI64LE,
  _readU32,
  _readVarint,
  _writeI64LE,
  _writeU32,
  _writeVarint,
} from "../core/encoding.js";

export function _parseTx(hex) {
  const b = _hexToBytes(hex);
  let off = 0;
  const versionRaw = _readU32(b, off); off += 4;
  const fOverwintered = (versionRaw >>> 31) & 1;
  const nVersion = versionRaw & 0x7fffffff;
  let nVersionGroupId = 0;
  if (fOverwintered) { nVersionGroupId = _readU32(b, off); off += 4; }
  let vinCount; [vinCount, off] = _readVarint(b, off);
  const vins = [];
  for (let i = 0; i < vinCount; i++) {
    const prevTxid = b.slice(off, off + 32); off += 32;
    const prevVout = _readU32(b, off); off += 4;
    let ssLen; [ssLen, off] = _readVarint(b, off);
    const scriptSig = b.slice(off, off + ssLen); off += ssLen;
    const sequence = _readU32(b, off); off += 4;
    vins.push({ prevTxid, prevVout, scriptSig, sequence });
  }
  let voutCount; [voutCount, off] = _readVarint(b, off);
  const vouts = [];
  for (let i = 0; i < voutCount; i++) {
    const value = _readI64LE(b, off); off += 8;
    let spkLen; [spkLen, off] = _readVarint(b, off);
    const scriptPubKey = b.slice(off, off + spkLen); off += spkLen;
    vouts.push({ value, scriptPubKey });
  }
  const nLockTime = _readU32(b, off); off += 4;
  let nExpiryHeight = 0;
  if (fOverwintered) { nExpiryHeight = _readU32(b, off); off += 4; }
  const remainder = b.slice(off);
  return { fOverwintered, nVersion, nVersionGroupId, vins, vouts, nLockTime, nExpiryHeight, remainder };
}

export function _serializeTx(tx) {
  const parts = [];
  const versionRaw = ((tx.nVersion & 0x7fffffff) | ((tx.fOverwintered & 1) << 31)) >>> 0;
  parts.push(_writeU32(versionRaw));
  if (tx.fOverwintered) parts.push(_writeU32(tx.nVersionGroupId));
  parts.push(_writeVarint(tx.vins.length));
  for (const v of tx.vins) {
    parts.push(v.prevTxid);
    parts.push(_writeU32(v.prevVout));
    parts.push(_writeVarint(v.scriptSig.length));
    parts.push(v.scriptSig);
    parts.push(_writeU32(v.sequence));
  }
  parts.push(_writeVarint(tx.vouts.length));
  for (const o of tx.vouts) {
    parts.push(_writeI64LE(o.value));
    parts.push(_writeVarint(o.scriptPubKey.length));
    parts.push(o.scriptPubKey);
  }
  parts.push(_writeU32(tx.nLockTime));
  if (tx.fOverwintered) parts.push(_writeU32(tx.nExpiryHeight));
  parts.push(tx.remainder);
  let total = 0; for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return _bytesToHex(out);
}
