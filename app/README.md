# app - local web UI

A small Python server plus static HTML/JS that runs on your machine,
talks to your local `verusd` via RPC, and drives the current loan GUI.

The app is a sidecar client. It does not replace Verus Desktop or the
daemon. It reads and writes the same VerusID `contentmultimap` entries
that any other compatible client can read.

## Run

```bash
python3 app/server.py
# Default: http://127.0.0.1:7777/
# Default RPC config: ~/.komodo/VRSC/VRSC.conf
```

Override:

```bash
python3 app/server.py --port 8080 --conf /path/to/VRSC.conf
```

Open the URL in a browser. No package install is required.

## What's here

- `server.py` - stdlib HTTP server. Serves `static/`, proxies `/rpc` to
  local `verusd`, and stores the optional History cache at
  `~/.verus_contract_gui/history_cache.json`.
- `static/index.html` - Loans shell: acting identity picker, request/offer
  forms, Loans / History / Marketplace tabs, and background-writes toggle.
- `static/js/rpc.js` - thin local RPC client.
- `static/js/main.js` - loan GUI orchestration.
- `static/js/core/`, `static/js/services/`, `static/js/protocols/`,
  `static/js/tx/` - extracted helpers for encoding, multimap handling,
  currency display, loan schema/tx logic, and tx/address serialization.

## State and trust model

- **Local daemon / chain** is the source of truth.
- **Browser localStorage** is ephemeral UI state and fast-path caches only.
- **`~/.verus_contract_gui/history_cache.json`** is a rebuildable local
  History cache.
- **VerusID `contentmultimap` + identity history** is the durable protocol
  data layer.
- **scan.verus.cx or another indexer** may be used for global discovery
  and display, but must not drive signing, accepting, repayment, default,
  or recovery decisions.

Known-counterparty loans are fully rebuildable from the local daemon using
`getidentity`, `getidentityhistory`, `getrawtransaction`,
`getaddressutxos`, and related RPCs. Global stranger-discovery is the part
that benefits from an indexer, because a plain daemon does not maintain a
searchable list of every identity with a loan offer.

## Current loan flow

- Lender posts `make.vrsc::contract.loan.offer`.
- Borrower posts directed `make.vrsc::contract.loan.request`.
- Lender funds the request by posting `make.vrsc::contract.loan.match`
  containing the signed Tx-A / Tx-Repay / Tx-B material.
- Borrower manually accepts or auto-accepts after local safety verification.
- Borrower repays; GUI posts borrower `loan.history` and removes
  borrower `loan.status`.
- Lender background watcher, when enabled, waits for confirmed vault spend,
  rebuilds original request terms from contentmultimap, posts lender
  `loan.history`, and drops the settled `loan.match`.

## Indexer boundary

The GUI may discover rows from an indexer when `localStorage.vl_explorer_api`
is set. The default is empty, which disables external API calls.

Before money-moving actions, the GUI re-fetches canonical data locally:

- v2 accept re-reads `loan.request` from the original request transaction's
  contentmultimap.
- v2 accept re-reads `loan.match` from the lender VerusID multimap.
- repay recovers Tx-Repay from localStorage, borrower `loan.status`, or
  lender `loan.match` / identity history.
- lender settlement attestation resolves the vault spend locally and
  rebuilds request terms from the original request tx.

Legacy v1 accept is disabled in this build because it could depend on
scan-derived request terms. Use v2 matches only.

## Regression matrix

See [`../LOAN_TEST_MATRIX.md`](../LOAN_TEST_MATRIX.md). The current
regression suite covers:

- local daemon discovery with scan disabled
- request/match/auto-accept/repay lifecycle
- lender history cleanup after confirmed repay
- browser localStorage deletion
- `history_cache.json` deletion and rebuild
- scan/indexer trust-boundary checks
