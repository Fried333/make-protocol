const _B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function _b58dec(s) {
  let n = 0n;
  for (const c of s) {
    const idx = _B58.indexOf(c);
    if (idx < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(idx);
  }
  const bytes = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  let pad = 0;
  for (const c of s) {
    if (c === "1") pad++;
    else break;
  }
  return new Uint8Array([...new Array(pad).fill(0), ...bytes]);
}

export function _addrToHash160(addr) {
  const raw = _b58dec(addr);
  if (raw.length !== 25) throw new Error(`expected 25 bytes for ${addr}, got ${raw.length}`);
  return raw.slice(1, 21);
}

export function _addrToP2pkhSpk(addr) {
  const h = _addrToHash160(addr);
  return new Uint8Array([0x76, 0xa9, 0x14, ...h, 0x88, 0xac]);
}

export function _addrToP2shSpk(addr) {
  const h = _addrToHash160(addr);
  return new Uint8Array([0xa9, 0x14, ...h, 0x87]);
}
