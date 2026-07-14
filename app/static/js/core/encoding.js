export function _hexToBytes(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2) out[i / 2] = parseInt(h.slice(i, i + 2), 16);
  return out;
}

export function _bytesToHex(b) {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function _readVarint(b, off) {
  const v = b[off];
  if (v < 0xfd) return [v, off + 1];
  if (v === 0xfd) return [b[off + 1] | (b[off + 2] << 8), off + 3];
  if (v === 0xfe) return [(b[off + 1] | (b[off + 2] << 8) | (b[off + 3] << 16) | (b[off + 4] << 24)) >>> 0, off + 5];
  let n = 0n;
  for (let i = 0; i < 8; i++) n |= BigInt(b[off + 1 + i]) << BigInt(8 * i);
  return [Number(n), off + 9];
}

export function _writeVarint(n) {
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
  if (n <= 0xffffffff) {
    return new Uint8Array([0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
  }
  const out = new Uint8Array(9);
  out[0] = 0xff;
  let big = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[1 + i] = Number(big & 0xffn);
    big >>= 8n;
  }
  return out;
}
export function _readU32(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

export function _writeU32(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
}

export function _readI64LE(b, off) {
  let n = 0n;
  for (let i = 0; i < 8; i++) n |= BigInt(b[off + i]) << BigInt(8 * i);
  return n;
}

export function _writeI64LE(n) {
  const out = new Uint8Array(8);
  let big = BigInt(n);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(big & 0xffn);
    big >>= 8n;
  }
  return out;
}
