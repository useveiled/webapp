<h1 align="center">Veiled</h1>

<p align="center">
  <b>A private bank account on Solana, shared by you and the AI agents you trust with money.</b>
</p>

<p align="center">
  <a href="https://useveiled.com"><img alt="useveiled.com" src="https://img.shields.io/badge/useveiled.com-0B0B0F?style=for-the-badge&logo=vercel&logoColor=white"></a>
  <a href="https://docs.useveiled.com"><img alt="Documentation" src="https://img.shields.io/badge/Documentation-1B1B22?style=for-the-badge&logo=gitbook&logoColor=white"></a>
  <a href="https://x.com/useveiled"><img alt="@useveiled on X" src="https://img.shields.io/badge/@useveiled-000000?style=for-the-badge&logo=x&logoColor=white"></a>
</p>

<p align="center">
  <img alt="Solana" src="https://img.shields.io/badge/Solana-settlement-14F195?style=flat-square&logo=solana&logoColor=black">
  <img alt="Anchor 0.31" src="https://img.shields.io/badge/Anchor-0.31-512BD4?style=flat-square&logo=rust&logoColor=white">
  <img alt="Token-2022 confidential transfers" src="https://img.shields.io/badge/Token--2022-confidential%20transfers-9945FF?style=flat-square">
  <img alt="x402" src="https://img.shields.io/badge/x402-native-2563EB?style=flat-square">
  <img alt="Beta" src="https://img.shields.io/badge/status-beta-F59E0B?style=flat-square">
</p>

---

Picture a payment you would rather keep to yourself: a salary, the rent, the monthly bill an agent runs up buying API calls. A bank sees all of it. A public blockchain shows all of it to everyone. Veiled settles on Solana, where every payment is validated and recorded for good, yet a confidential payment carries its amount as ciphertext. Anyone can confirm that two addresses transacted. Only the people involved know the sum.

You hold your own keys. Your balance is in USDG or USDC, both issued natively on Solana, and a small SOL reserve for network fees is topped up for you. Your agents get wallets of their own, spend inside limits the chain enforces, and appear in your activity feed alongside your own payments.

## The repositories

| Repo | Contents |
| --- | --- |
| [`useveiled/protocol`](https://github.com/useveiled/protocol) | `veiled`, the open source Anchor program in Rust. It adds what an encrypted balance needs to behave like a bank account: `.veiled` names, agent accounts with chain enforced limits, an approval queue, request to pay links, disclosure receipts and the $VEILED fee model. |
| [`useveiled/sdk`](https://github.com/useveiled/sdk) | `@useveiled/sdk`, the MIT licensed TypeScript client for the REST API at api.useveiled.com: accounts and balances, transfers, agents and spend policies, webhooks and signature checks. |
| [`useveiled/app`](https://github.com/useveiled/app) | The Next.js web app and marketing site, backed by Supabase. |
| [`useveiled/docs`](https://github.com/useveiled/docs) | The source of [docs.useveiled.com](https://docs.useveiled.com). |

## What stays private, and what does not

The encryption is Solana's own. Token-2022, the chain's token program, has a confidential transfer extension that stores balances and amounts as twisted ElGamal ciphertexts. Your device builds the zero knowledge proofs, and Solana's native ZK proof program checks them inside the same transaction, so validators settle a transfer without ever learning its value. Veiled did not need to invent a cipher; it builds the bank on top.

Some things are public by design. Sender and recipient addresses are always visible. Payments the `veiled` program moves itself, such as an agent paying from its vault or someone paying a request link, use a standard token transfer, so their amounts show up in program events.

Deeper privacy is earned through verification. Every account gets confidential amounts by default. Shadow Pro adds shielded state, where balances and history live in a commitment tree pool and stealth addresses keep payees unlinkable. Shadow Enterprise, for KYB verified businesses, goes further still. When an auditor or tax office needs proof, you disclose one transaction to one party and nothing else, and can file an on-chain receipt that the disclosure happened.

Read more in [The Veiled Model](https://docs.useveiled.com/start-here/the-veiled-model) and [Encrypted Balances and Private Payments](https://docs.useveiled.com/confidentiality/encrypted-balances).

## Agents that cannot overspend

Each agent gets its own signing key, a vault only the program can debit and a spend policy the program checks on every payment:

- a ceiling per transaction
- a limit over a rolling 24 hours
- an optional allowlist of up to 10 recipients
- an approval threshold, above which a person signs off first

An autonomy tier decides how that threshold applies. `Supervised` agents queue every payment for approval, `SemiAutonomous` agents settle at or below the threshold and queue anything above it, and `FullyAutonomous` agents settle whatever the policy allows. Only the owner can change the policy, so neither a misbehaving agent nor a compromised server can loosen it.

If a key leaks, pause the agent or rotate its signer while vault, policy and history stay intact. Revoking is permanent and sweeps the vault back to you, and it keeps working even while the protocol's emergency pause is on, so the exit never closes.

Agents speak [x402](https://docs.useveiled.com/autonomous-agents/paying-per-request) natively. A service answers with `402 Payment Required`, the agent checks the price against its policy, pays, and retries with the transaction signature as proof. Each agent spend records an invoice reference on chain, so a payment can be traced to the invoice it settled. Details are in [Spending Guardrails](https://docs.useveiled.com/autonomous-agents/spending-guardrails).

## Try the API

```bash
npm install @useveiled/sdk
```

```ts
import { Veiled } from "@useveiled/sdk";

const veiled = new Veiled({ apiKey: process.env.VEILED_API_KEY! });

const payout = await veiled.transfers.create({
  to: "@studio_lena",
  amount: "860.00",
  memo: "Brand illustrations, October",
});

const settled = await veiled.transfers.waitForConfirmation(payout.transferId);
console.log(settled.status, settled.txSignature);
```

The key's prefix picks the network. A `vl_test_` key runs on Solana devnet and moves nothing of value; a `vl_live_` key runs on mainnet with real funds. Start with [Making Authenticated Requests](https://docs.useveiled.com/developer-api/making-requests).

## Status

Veiled is in beta. It is not open to US persons during the beta, and the first markets are the EU, the UK, Singapore and the UAE. The on-chain program is open source; the app, backend and indexer are closed source for now. See [Our Legal Posture](https://docs.useveiled.com/regulation/legal-posture) and [Common Questions](https://docs.useveiled.com/help/common-questions).

Found a bug? Open an issue on the repository it belongs to. Found a security vulnerability? Keep it out of public issues and email **security@useveiled.com**.

<p align="center">
  <sub>Verifiable payments. Private amounts.</sub>
</p>
