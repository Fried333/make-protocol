import { rpc } from "../../rpc.js";
import { _bytesToHex, _hexToBytes } from "../../core/encoding.js";
import { _addrToP2pkhSpk, _addrToP2shSpk } from "../../tx/address-codec.js";
import { _parseTx, _serializeTx } from "../../tx/tx-codec.js";
import { VDXF_LOAN_REQUEST } from "./loan-schema.js";

const VRSC_CURRENCY_ID = "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV";

// Look up the compressed pubkey for an R-address by finding any prior tx
// where it spent. For P2PKH inputs the scriptSig is `<sig> <pubkey>`.
export async function getPubkeyForRAddress(rAddr) {
  try {
    const v = await rpc("validateaddress", [rAddr]);
    if (v?.pubkey) return v.pubkey;
  } catch {}

  let txids = [];
  try {
    txids = await rpc("getaddresstxids", [{ addresses: [rAddr] }]);
  } catch {
    return null;
  }

  for (let i = txids.length - 1; i >= 0; i--) {
    try {
      const tx = await rpc("getrawtransaction", [txids[i], 1]);
      for (const vin of tx?.vin || []) {
        const ssHex = vin?.scriptSig?.hex;
        if (!ssHex) continue;
        const inAddrs = vin?.addresses || [];
        if (!inAddrs.includes(rAddr)) continue;
        const bytes = _hexToBytes(ssHex);
        let off = 0;
        const sigLen = bytes[off]; off += 1 + sigLen;
        if (off >= bytes.length) continue;
        const pkLen = bytes[off]; off += 1;
        if ((pkLen !== 33 && pkLen !== 65) || off + pkLen > bytes.length) continue;
        return _bytesToHex(bytes.slice(off, off + pkLen));
      }
    } catch {}
  }
  return null;
}

// Pull a loan.request payload directly from the local daemon by reading the
// originating tx and decoding the contentmultimap update.
export async function fetchRequestFromLocalDaemon(txid) {
  const tx = await rpc("getrawtransaction", [txid, 1]);
  for (const vout of tx?.vout || []) {
    const cm = vout?.scriptPubKey?.identityprimary?.contentmultimap;
    if (cm && cm[VDXF_LOAN_REQUEST]) {
      const entry = cm[VDXF_LOAN_REQUEST][0];
      const hex = typeof entry === "string" ? entry : entry?.serializedhex || entry?.message || "";
      if (!hex) continue;
      try {
        const json = JSON.parse(new TextDecoder().decode(_hexToBytes(hex)));
        return { principal: json.principal, collateral: json.collateral, repay: json.repay, term_days: json.term_days };
      } catch {}
    }
  }
  return null;
}

// Borrower-first Tx-A skeleton builder: constructs Tx-A with borrower's
// collateral input + outputs, and signs the borrower's input only with
// SIGHASH_ALL|ANYONECANPAY. The lender adds/signs their input later.
export async function buildAndSignBorrowerTxA({
  borrowerInputTxid,
  borrowerInputVout,
  borrowerR,
  principalCurrency,
  principalAmount,
  collateralCurrency,
  collateralAmount,
  vaultP2sh,
  utxoAmount,
}) {
  const FEE = 0.0001;
  if (utxoAmount === undefined) {
    const utxos = await rpc("getaddressutxos", [{ addresses: [borrowerR], currencynames: true }]);
    const u = utxos.find((x) => x.txid === borrowerInputTxid && x.outputIndex === borrowerInputVout);
    if (!u) throw new Error(`UTXO ${borrowerInputTxid.slice(0, 16)}...:${borrowerInputVout} not found at ${borrowerR}`);
    utxoAmount = collateralCurrency === "VRSC"
      ? u.satoshis / 1e8
      : parseFloat(u.currencyvalues?.[collateralCurrency] ?? 0);
  }

  const ccyIaddr = async (name) => {
    if (name === "VRSC") return VRSC_CURRENCY_ID;
    return (await rpc("getcurrency", [name]))?.currencyid;
  };
  const principalCcyId = await ccyIaddr(principalCurrency);
  const collateralCcyId = await ccyIaddr(collateralCurrency);
  if (!principalCcyId || !collateralCcyId) throw new Error("could not resolve currency ids");

  const utxoSats = Math.round(utxoAmount * 1e8);
  const collateralSats = Math.round(collateralAmount * 1e8);
  const feeSats = Math.round(FEE * 1e8);
  const changeSats = utxoSats - collateralSats - feeSats;
  if (changeSats < 0) throw new Error(`UTXO too small: have ${utxoSats} sats ${collateralCurrency}, need ${collateralSats + feeSats}`);
  const change = changeSats / 1e8;

  const principalOutputKey = borrowerR;
  const principalOutputVal = principalCurrency === "VRSC"
    ? principalAmount
    : { [principalCcyId]: principalAmount };
  const vaultOutputVal = collateralCurrency === "VRSC"
    ? collateralAmount
    : { [collateralCcyId]: collateralAmount };
  const changeOutputVal = collateralCurrency === "VRSC"
    ? change
    : { [collateralCcyId]: change };

  const tip = await rpc("getblockcount");
  const expiryHeight = tip + 720;
  const outputs = {};
  outputs[principalOutputKey] = principalOutputVal;
  outputs[vaultP2sh] = vaultOutputVal;
  if (principalOutputKey === borrowerR && change > 0) {
    if (principalCurrency === collateralCurrency) {
      throw new Error("principal and collateral cannot be the same currency in this builder yet");
    }
    outputs[borrowerR] = (typeof outputs[borrowerR] === "number")
      ? { [principalCcyId]: outputs[borrowerR], [collateralCcyId]: change }
      : { ...outputs[borrowerR], [collateralCcyId]: change };
  } else if (change > 0) {
    outputs[borrowerR] = changeOutputVal;
  }

  const unsignedHex = await rpc("createrawtransaction", [
    [{ txid: borrowerInputTxid, vout: borrowerInputVout }],
    outputs,
    0,
    expiryHeight,
  ]);

  const signed = await rpc("signrawtransaction", [unsignedHex, null, null, "ALL|ANYONECANPAY"]);
  if (!signed.complete) throw new Error("borrower signrawtransaction did not complete: " + JSON.stringify(signed.errors || {}));
  return signed.hex;
}

export function prependLenderInput(borrowerSkeletonHex, lenderInputTxid, lenderInputVout) {
  const tx = _parseTx(borrowerSkeletonHex);
  if (tx.vins.length !== 1) throw new Error(`expected 1 input in borrower skeleton, got ${tx.vins.length}`);
  if (tx.vouts.length < 2 || tx.vouts.length > 3) throw new Error(`expected 2 or 3 outputs in borrower skeleton, got ${tx.vouts.length}`);
  const txidBytes = _hexToBytes(lenderInputTxid).reverse();
  tx.vins.unshift({ prevTxid: txidBytes, prevVout: lenderInputVout, scriptSig: new Uint8Array(0), sequence: 0xffffffff });
  return _serializeTx(tx);
}

export function extendPresignedLoanTxA({
  presignedHex,
  borrowerInputTxid,
  borrowerInputVout,
  vaultP2sh,
  collateralSats,
  borrowerChangeAddr,
  borrowerChangeSats,
}) {
  const tx = _parseTx(presignedHex);
  if (tx.vins.length !== 1 || tx.vouts.length !== 1) {
    throw new Error(`expected pre-signed Tx-A with 1 input + 1 output, got ${tx.vins.length}/${tx.vouts.length}`);
  }
  const txidBytes = _hexToBytes(borrowerInputTxid).reverse();
  tx.vins.push({ prevTxid: txidBytes, prevVout: borrowerInputVout, scriptSig: new Uint8Array(0), sequence: 0xffffffff });
  tx.vouts.push({ value: BigInt(collateralSats), scriptPubKey: _addrToP2shSpk(vaultP2sh) });
  tx.vouts.push({ value: BigInt(borrowerChangeSats), scriptPubKey: _addrToP2pkhSpk(borrowerChangeAddr) });
  return _serializeTx(tx);
}
