# Loan GUI Test Matrix

Test IDs:

- Borrower: `3965555_108of200.vlotto@` / `i44CxABWkVnUhoPMjuM2ViJDDu2icd7jg7`
- Lender: `3965555_101of200.vlotto@` / `i7b7Tq8JYXX9iqS7FBevC6LaG3ioh8z3RM`

Default amounts for chain-mutating tests:

- Principal: `0.01 VRSC`
- Collateral: `0.02 VRSC`
- Repay: `0.0102 VRSC`
- Term: `1 day`, except default-adjacent tests using `0 days`

| ID | Area | Scenario | Mutates chain | Expected result | Status |
| --- | --- | --- | --- | --- | --- |
| S1 | Security | `/rpc` without CSRF header | No | HTTP 403 | Pass |
| S2 | Security | `/rpc` method outside allowlist, e.g. `stop` | No | HTTP 403 | Pass |
| S3 | Network | Explorer API disabled | No | GUI uses local daemon/proxy only | Pass |
| S4 | Network | Scan/indexer data cannot drive accept/sign path | No | v2 accept re-fetches request from daemon/contentmultimap; legacy scan-backed v1 accept disabled | Pass |
| V1 | Validation | Post request while acting as `All identities` | No | Form blocks posting | Pass |
| V2 | Validation | Request preview with missing lender | No | Preview blocks before split/sign | Pass |
| V3 | Validation | Request preview with unresolved lender | No | Preview blocks before split/sign | Pass |
| V4 | Validation | Request with insufficient collateral | No | Preview button disabled | Pass |
| V5 | Validation | Offer-driven request below min collateral ratio | No | Preview button disabled | Pass |
| O1 | Offer | Lender post offer | Yes | `loan.offer` appears on lender ID | Pass |
| O2 | Offer | Borrower discovers lender offer without explorer | No | Offer appears in Marketplace from local daemon | Pass |
| O3 | Offer | Lender cancels offer | Yes | `loan.offer` removed; other keys preserved | Pending |
| R1 | Request | Borrower posts request from lender offer | Yes | Directed `loan.request` appears on borrower ID | Pass |
| R2 | Request | Borrower cancels request before lender match | Yes | `loan.request` removed and locked collateral UTXO released | Pass |
| M1 | Match | Lender sees directed borrower request without explorer | No | Request appears in lender Loans tab | Pass |
| M2 | Match | Lender funds request | Yes | `loan.match` appears on lender ID | Pass |
| M3 | Match | Lender cancels match before borrower accept | Yes | New pending match can be cancelled without deleting unrelated state; borrower request remains | Pass |
| M4 | Match safety | Borrower rejects malformed match: wrong principal recipient | Harness only | Safety check fails before Tx-A broadcast | Pending |
| M5 | Match safety | Borrower rejects malformed match: wrong repay amount/recipient | Harness only | Safety check fails before Tx-A broadcast | Pending |
| M6 | Match safety | Borrower rejects malformed match: wrong vault or maturity | Harness only | Safety check fails before Tx-A broadcast | Pending |
| A1 | Accept | Manual borrower accept | Yes | Tx-A broadcast and borrower `loan.status` active | Pass |
| A2 | Accept | Auto-accept off | Yes | Match waits for manual accept | Pass |
| A3 | Accept | Auto-accept on + background writes on | Yes | Borrower auto-broadcasts Tx-A and posts `loan.status` | Pass |
| P1 | Repay | Repay active loan | Yes | Tx-Repay broadcast; `loan.status` removed; `loan.history(outcome=repaid)` posted | Pass |
| P2 | Repay | Repay recovery from fresh browser/localStorage empty | Yes | Recovers Tx-Repay from `loan.status.tx_repay_signed` | Pass |
| P3 | Repay | Double repay | No | No active borrower loan / no repay button | Pass |
| P4 | Repay | Insufficient repay balance | Harness/local only | Repay disabled or split/broadcast blocked before settlement | Pending |
| D1 | Default | Lender view before maturity | No | Collateral claim disabled until maturity | Pass |
| D2 | Default | Lender view at/after maturity | Yes for setup | GUI shows manual/default claim boundary; no automatic claim available | Pending |
| D3 | Default | Broadcast Tx-B default claim | Yes | Vault collateral moves to lender; borrower history/default attested | Not wired in GUI |
| H1 | History | Repaid loan hidden from Active for borrower | No | Active loan disappears; History shows repaid | Pass |
| H2 | History | Repaid loan hidden from lender claim path | No | No claim/default action after borrower history exists | Pass |
| H3 | History | Lender background history attestation after confirmed repay | Yes | Rebuilds request terms from contentmultimap, posts lender `loan.history`, removes settled `loan.match` | Pass |
| C1 | Concurrency | Cancel/repost request does not strand locked UTXO | Yes | Repost reuses or unlocks old collateral UTXO cleanly | Pass |
| C2 | Concurrency | Cancel match does not remove prior matches for same borrower | Yes | Settled historical matches are pruned while live pending/active matches are preserved | Pass |
| REC1 | Recovery | Browser localStorage cleared, then app reloads | No | Loans/Marketplace rebuild from local daemon, not local browser state | Pass |
| REC2 | Recovery | Delete `~/.verus_contract_gui/history_cache.json` | No | History tab cold-rebuilds settled history and recreates cache file | Pass |
| REC3 | Recovery | Cache already rebuilt, then app reloads | No | History renders from cache and reconciles against daemon | Pass |
| REC4 | Recovery | Restore/prune stale lender match state from identity history | Yes | Old settled match can be recovered for diagnosis; new match write prunes it safely | Pass |

Notes:

- `D3` is explicitly not a GUI test today. The GUI currently renders default claim as manual-only.
- Malformed-match cases should be harness-only unless the app adds a local fixture path; do not post intentionally malicious matches to chain.
- Recovery tests delete only local/browser cache data. Canonical on-chain identity content is not deleted except through the app's normal cancel/settle flows.
- `H3` originally failed because lender `loan.match` stores only `request.{iaddr,txid,block}`. The watcher now rebuilds financial terms from the original request transaction's contentmultimap before classifying the vault spend.

Latest chain-mutating auto-accept regression run after scan trust-boundary patch:

- Request txid: `6c3248794b6748f249045547e5bf67b42e88e8b86e46e225661405846270cf14`
- Auto-accepted Tx-A / loan id: `e90958b6d2e875189cafb7256c8a41cd72399773dda866091261a2e9d37d48ec`
- Repay txid: `075463ff367f698b0914d53f262bc5dea6a542c9c8df4ff506b21b00c32f5309`
