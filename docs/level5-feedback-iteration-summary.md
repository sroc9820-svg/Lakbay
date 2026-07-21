# Level 5 Feedback Iteration Summary

Themes collected from the 50-person Lakbay cohort, mapped to product improvements.

| Feedback theme | Improvement |
|---|---|
| Pool balance is not visible on the trip card. | Show running XLM pool total and member count next to the trip title. |
| Organizer-only spend action unclear in the UI. | Add a clear "Organizer only" badge near the spend button and a tooltip explaining the auth check. |
| Spend memo field hidden under "advanced". | Promote memo to a primary input on the spend form so it ships with every payout. |
| Trip status (open/closed) ambiguous after the event. | Surface a status pill on the trip header and disable contribute/spend/refund actions when closed. |
| Refund flow requires trust that the pool still has the funds. | Show the organiser's remaining pool balance before the Freighter popup on refund. |
| SEP-10 auth message wording is intimidating. | Add a one-line plaintext tooltip above the auth button explaining what is being signed. |
| Ledger row lacks the payee memo for accountability. | Render the spend memo (or its hash) directly under each ledger row. |
| USDC opt-in path not obvious in the trip screen. | Surface an "Enable USDC" inline card on the trip page when the connected wallet lacks the trustline. |
| Stats page mixes demo and real wallets. | Keep the existing exclusion of demo wallets and add a small footnote showing the exclusion rule. |
| Trip ID is a free-text field with no validation. | Add a slug regex check (lowercase letters, digits, dashes) before building the `open_trip` invoke. |
| Mobile spend form labels are cramped. | Increase tap target to ≥44 px and stack labels above inputs on narrow viewports. |
| Refund recipient picker is a raw text input. | Replace the raw input with a dropdown of members who ever contributed to the trip. |

## Iteration ledger (reviewer-facing)

| User feedback | Change made |
|---|---|
| Names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to Lakbay's organizer/member. |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work/dev suffixes across the 50 rows. |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot testnet. |
