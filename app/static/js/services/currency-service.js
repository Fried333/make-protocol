export const CURRENCIES = [
  "VRSC",
  "DAI.vETH",
  "vETH",
  "MKR.vETH",
  "vUSDC.vETH",
  "vUSDT.vETH",
  "vLINK.vETH",
  "tBTC.vETH",
  "EURC.vETH",
  "vARRR",
  "vDEX",
  "CHIPS",
];

export const CURRENCY_NAME_TO_IADDR = {
  "VRSC": "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV",
  "DAI.vETH": "iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM",
  "vETH": "iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4",
  "vLINK.vETH": "iJczmut8fHgRvVxaNfEPm7SkgJLDFtPcrK",
  "CHIPS": "iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP",
};

const KNOWN_CURRENCY_IDS = {
  "i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV": "VRSC",
  "iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM": "DAI.vETH",
  "iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4": "vETH",
  "iJczmut8fHgRvVxaNfEPm7SkgJLDFtPcrK": "vLINK.vETH",
  "iJ3WZocnjG9ufv7GKUA4LijQno5gTMb7tP": "CHIPS",
  "iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2": "vARRR",
  "iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N": "vDEX",
};

export function currencyOptions(selected = "VRSC") {
  return CURRENCIES.map((c) => `<option value="${c}"${c === selected ? " selected" : ""}>${c}</option>`).join("");
}

export function _balanceForCurrency(rBalance, currencyName) {
  if (!rBalance) return 0;
  const iaddrKey = CURRENCY_NAME_TO_IADDR[currencyName];
  if (iaddrKey != null && rBalance[iaddrKey] != null) return parseFloat(rBalance[iaddrKey]);
  if (rBalance[currencyName] != null) return parseFloat(rBalance[currencyName]);
  return 0;
}

export function fmtBalances(bal, currencyMap = {}) {
  const items = [];
  for (const [k, v] of Object.entries(bal || {})) {
    const name = KNOWN_CURRENCY_IDS[k] || currencyMap[k] || k;
    if (parseFloat(v) > 0) items.push(`${parseFloat(v)} ${name}`);
  }
  return items.length ? items.join(" · ") : "—";
}
