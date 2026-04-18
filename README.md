# 🌐 Wallet Reputation Graph

<div align="center">

![Soroban](https://img.shields.io/badge/Built%20with-Soroban%20SDK-blueviolet?style=for-the-badge)
![Stellar](https://img.shields.io/badge/Blockchain-Stellar-informational?style=for-the-badge&logo=stellar)
![Rust](https://img.shields.io/badge/Language-Rust-orange?style=for-the-badge&logo=rust)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A decentralized, on-chain reputation layer for Stellar wallets — built on Soroban.**

</div>

---

## 🎥 Live Demo Video

<div align="center">
  <a href="https://youtu.be/ROXrRNNsZAw">
    <img src="https://img.youtube.com/vi/ROXrRNNsZAw/maxresdefault.jpg" alt="Wallet Reputation Graph Demo Video" width="800" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" />
  </a>
  <br/>
  <br/>
  <em>🎬 Click the image above or the link to watch the full project walkthrough and demonstration.</em>
  youtube link: https://youtu.be/ROXrRNNsZAw
</div>

---

## 🔄 CI/CD Pipeline

<div align="center">
  <img width="1410" height="744" alt="CI/CD Pipeline" src="https://github.com/user-attachments/assets/85b04551-4cb5-4790-b9c2-b4607a3b2f84" />
</div>

Our automated CI/CD pipeline ensures code quality and reliable deployments through GitHub Actions.

---

## 📱 Mobile View

<div align="center">
  <img width="540" height="1200" alt="Mobile View Animation" src="https://github.com/user-attachments/assets/3861b4de-e820-4e22-8107-24898655570c" />
</div>

The application is fully responsive, providing a seamless experience on mobile devices.

---

## 📋 Table of Contents

- [Project Title](#-wallet-reputation-graph)
- [Live Demo Video](#-live-demo-video)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Mobile View](#-mobile-view)
- [Project Description](#-project-description)
- [Product Showcase](#-product-showcase)
- [Project Vision](#-project-vision)
- [Key Features](#-key-features)
- [Smart Contract Architecture](#-smart-contract-architecture)
  - [Data Structures](#data-structures)
  - [Storage Design](#storage-design)
  - [Contract Functions](#contract-functions)
- [Score Mechanics](#-score-mechanics)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Build](#build)
  - [Deploy](#deploy)
  - [Invoke Functions](#invoke-functions)
- [Future Scope](#-future-scope)
- [License](#-license)

---

## 📖 Project Description

**Wallet Reputation Graph** is a fully on-chain, decentralized reputation system built on the **Stellar blockchain** using the **Soroban smart contract SDK**. It allows any participant in the Stellar ecosystem to register a wallet identity, receive peer endorsements for trustworthy behaviour, and accumulate (or lose) reputation points based on community-driven reports.

Every interaction — registration, endorsement, or report — is permanently logged on-chain with a timestamp and a human-readable reason. Reputation scores are calculated deterministically from on-chain data: each endorsement adds **+1** point and each negative report deducts **−3** points, creating a weighted signal where bad behaviour has a meaningfully higher impact than isolated endorsements.

The contract exposes a clean, minimal API of **4 core functions** (plus 2 view helpers), making it easy to integrate into wallets, dApps, DEXes, and DeFi protocols that need a trust signal before executing high-value transactions.

---

## 📸 Product Showcase

The application pairs the Soroban smart contract with a clean frontend so users can explore wallet reputation, submit trust signals, and inspect credibility at a glance.

### Landing Page

<div align="center">
  <img width="1239" height="841" alt="Wallet Reputation Graph landing page" src="https://github.com/user-attachments/assets/698e88be-383b-45ae-ad98-9b87d6513e37" />
</div>

The landing page introduces the protocol, highlights live ecosystem stats, and guides new users into connecting their wallet and joining the reputation network.

### Dashboard Overview

<div align="center">
  <img width="767" height="830" alt="Wallet Reputation Graph dashboard overview" src="https://github.com/user-attachments/assets/4152618f-8cea-4001-ad71-9dd8ca5c5f69" />
</div>

The dashboard is the main control center. From here, users can register a wallet, search any profile by wallet ID or Stellar address, and inspect current reputation metrics in one place.

### Trust Actions: Endorse or Report

<div align="center">
  <img width="792" height="733" alt="Wallet dashboard actions for endorsing or reporting a project" src="https://github.com/user-attachments/assets/e4b97e6d-b7a6-4536-9d03-5fffdedb068b" />
</div>

- **Endorse a wallet:** submit a positive trust signal for reliable behavior. Each endorsement adds **+1** to the wallet score.
- **Report a project or wallet:** flag suspicious or malicious activity so the community can react early. Each report deducts **−3** from the wallet score.

### Credibility View

<div align="center">
  <img width="772" height="788" alt="Wallet credibility and reputation view" src="https://github.com/user-attachments/assets/a4de4195-ac54-4500-a094-064c2ff735f5" />
</div>

This view helps users quickly evaluate whether a wallet looks credible by surfacing its score, endorsement count, report count, and overall trust posture in an easy-to-read format.

---

## 🔭 Project Vision

The DeFi and Web3 ecosystem suffers from an acute **trust deficit**. Pseudonymous wallet addresses provide no inherent signal of reliability, past behaviour, or community standing. This forces users to rely on off-chain reputations (Twitter profiles, Discord handles) that are easily faked, siloed, and non-composable.

**Wallet Reputation Graph** envisions a future where:

> *Every Stellar wallet carries a transparent, tamper-proof, community-curated trust score that any dApp can query in real time — no central authority required.*

By anchoring reputation data directly on the Stellar ledger via Soroban, we eliminate the need for off-chain oracles, centralised databases, or trusted third parties. The graph grows organically as the community endorses good actors and reports bad ones, creating a **living, self-correcting social trust layer** for the entire Stellar ecosystem.

Long-term, this contract is designed to serve as a primitive — a composable building block that other protocols on Stellar can build upon, much like how ERC-20 became a universal token standard on Ethereum.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🆔 **Wallet Registration** | Any participant can register a new wallet identity and receive a unique, auto-incremented `wallet_id` on-chain. |
| 👍 **Peer Endorsements** | Users can endorse any registered wallet with a short on-chain reason string, boosting its reputation score by +1. |
| 🚩 **Negative Reports** | Users can submit weighted negative reports (−3 per report) against wallets that have behaved maliciously or dishonestly. |
| 📊 **Live Reputation Scores** | Reputation scores are computed and stored on-chain at every interaction — no off-chain computation needed. |
| 📜 **Immutable Interaction Log** | Every endorsement and report is stored as an `InteractionLog` entry with a timestamp, reason, and log ID — fully auditable. |
| 🌍 **Global Statistics** | A real-time `GlobalStats` struct tracks total wallets, total endorsements, and total reports across the entire platform. |
| ⚖️ **Weighted Scoring** | Reports carry 3× the weight of endorsements, ensuring that community warnings are meaningful signal, not noise. |
| ♻️ **Composable Design** | Clean, minimal function surface makes it easy to integrate as a reputation oracle into other Soroban contracts or dApps. |

---

## 🏗 Smart Contract Architecture

### Data Structures

```
┌──────────────────────────────────────────────────────────┐
│                    GlobalStats                           │
│  total_wallets      u64  ─ registered wallet count       │
│  total_endorsements u64  ─ all-time endorsement count    │
│  total_reports      u64  ─ all-time report count         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  ReputationRecord                        │
│  wallet_id         u64   ─ unique identifier             │
│  score             i64   ─ net reputation (can go < 0)   │
│  endorsement_count u64   ─ total endorsements received   │
│  report_count      u64   ─ total reports received        │
│  last_updated      u64   ─ ledger timestamp              │
│  is_active         bool  ─ registration status           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   InteractionLog                         │
│  log_id            u64    ─ unique log entry ID          │
│  target_wallet_id  u64    ─ wallet being acted upon      │
│  is_endorsement    bool   ─ true=endorse / false=report  │
│  reason            String ─ human-readable reason        │
│  timestamp         u64    ─ ledger timestamp             │
└──────────────────────────────────────────────────────────┘
```

### Storage Design

| Storage Key | Type | Contents |
|---|---|---|
| `GLB_STATS` | Instance | `GlobalStats` singleton |
| `C_WALLET` | Instance | Running wallet ID counter |
| `C_LOG` | Instance | Running log ID counter |
| `WalletBook::Wallet(id)` | Instance | `ReputationRecord` per wallet |
| `LogBook::Log(id)` | Instance | `InteractionLog` per interaction |

### Contract Functions

#### 🔵 Mutating Functions

```
register_wallet(env) → wallet_id: u64
```
Registers a new wallet. Returns the auto-assigned `wallet_id`. Initialises score to `0` and `is_active` to `true`. Updates `GlobalStats.total_wallets`.

---

```
endorse_wallet(env, target_wallet_id: u64, reason: String) → log_id: u64
```
Submits a positive endorsement for the target wallet. Adds `+1` to `score`. Creates an `InteractionLog` entry. Updates `GlobalStats.total_endorsements`. Returns the `log_id`. Panics if the wallet does not exist or is inactive.

---

```
report_wallet(env, target_wallet_id: u64, reason: String) → log_id: u64
```
Submits a negative report against the target wallet. Subtracts `3` from `score`. Creates an `InteractionLog` entry. Updates `GlobalStats.total_reports`. Returns the `log_id`. Panics if the wallet does not exist or is inactive.

#### 🟢 Read-only Functions

```
view_wallet_reputation(env, wallet_id: u64) → ReputationRecord
```
Returns the full `ReputationRecord` for a given `wallet_id`. Returns a zeroed-out default if the ID is not found.

---

```
view_global_stats(env) → GlobalStats
```
Returns the platform-wide `GlobalStats` singleton.

---

```
view_interaction_log(env, log_id: u64) → InteractionLog
```
Returns a single `InteractionLog` entry by its `log_id`. Returns a zeroed-out default if not found.

---

## ⚖️ Score Mechanics

```
score = (endorsements × +1) + (reports × −3)
```

| Scenario | Score Impact |
|---|---|
| 1 endorsement | +1 |
| 1 report | −3 |
| 3 endorsements + 1 report | 0 (net neutral) |
| 10 endorsements + 5 reports | −5 (net negative) |
| 10 endorsements + 0 reports | +10 (strong positive) |

> **Design rationale:** A 3× penalty ensures that a single malicious act cannot be trivially "washed out" by a burst of cheap endorsements. At least 3 endorsements are required to neutralise every report, encouraging organic reputation building over gaming.

Scores are stored as `i64` and **can go negative** — there is no floor. A deeply negative score is a strong on-chain warning signal.

---

## 🚀 Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable, 2021 edition)
- [Soroban CLI](https://developers.stellar.org/docs/smart-contracts/getting-started/setup)
- A Stellar Testnet or Futurenet account funded via [Friendbot](https://friendbot.stellar.org/)

```bash
# Install Soroban CLI
cargo install --locked soroban-cli

# Add the WASM compilation target
rustup target add wasm32-unknown-unknown
```

### Build

```bash
# Clone the repository
git clone https://github.com/your-org/wallet-reputation-graph.git
cd wallet-reputation-graph

# Build the contract for WASM
soroban contract build

# The compiled artefact will be at:
# target/wasm32-unknown-unknown/release/wallet_reputation_graph.wasm
```

### Deploy

```bash
# Deploy to Testnet and capture the contract ID
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/wallet_reputation_graph.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet)

echo "Contract deployed at: $CONTRACT_ID"
```

### Invoke Functions

#### Register a new wallet

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- register_wallet
```

#### Endorse a wallet (wallet_id = 1)

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- endorse_wallet \
  --target_wallet_id 1 \
  --reason '"Delivered on a P2P trade promptly and honestly."'
```

#### Report a wallet (wallet_id = 2)

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- report_wallet \
  --target_wallet_id 2 \
  --reason '"Failed to send funds after trade was agreed upon."'
```

#### View reputation of wallet_id = 1

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- view_wallet_reputation \
  --wallet_id 1
```

#### View global platform stats

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- view_global_stats
```

#### View an interaction log entry (log_id = 1)

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- view_interaction_log \
  --log_id 1
```

---

## 🔮 Future Scope

The current contract establishes a solid, minimal on-chain reputation primitive. The following enhancements are planned for future iterations:

### 🔑 Wallet Address Binding
Replace the internal numeric `wallet_id` with the actual `Address` type from `soroban_sdk` so that reputation records are natively tied to real Stellar public keys — eliminating the need for a separate registration step and making the system self-sovereign by default.

### 🏷️ Category-Based Reputation
Introduce multi-dimensional reputation by allowing endorsements and reports to be tagged with categories (e.g., `Trading`, `Lending`, `NFT`, `DAO Governance`). This enables dApps to query a wallet's trust score within a specific domain rather than relying solely on a global aggregate.

### 🛡️ Sybil Resistance Mechanisms
Integrate Stellar account age, minimum XLM balance thresholds, or Soroban-based zero-knowledge proof verifications to make it significantly harder for bad actors to create fresh wallets and game the endorsement system.

### 🗳️ Stake-Weighted Voting
Allow endorsers and reporters to optionally attach a stake in XLM or a Stellar asset. Higher-stake interactions carry proportionally more weight in the score, aligning economic incentives with honest behaviour.

### 🤝 Cross-Contract Composability
Expose a standardised interface (similar to an ABI) so that other Soroban smart contracts — DEX order books, lending protocols, NFT marketplaces — can call `view_wallet_reputation` in real time as a gating condition before executing high-value operations.

### 📡 Event Emission
Leverage Soroban's event system (`env.events().publish(...)`) to emit structured events on every endorsement and report, enabling off-chain indexers, analytics dashboards, and reputation-explorer frontends to track changes in near real time.

### ⏳ Time-Decayed Scoring
Implement an optional score decay model where interactions older than a configurable ledger window contribute less to the current score — ensuring that wallets cannot rest on historical laurels and must maintain consistently good behaviour over time.

### 🌉 Cross-Chain Reputation Bridging
Explore bridges to import reputation signals from other blockchains (Ethereum ENS scores, Lens Protocol, etc.) via Stellar-compatible oracles, creating a unified multi-chain reputation identity for power users.

---

## 📋 Contract Details

| Property | Value |
|---|---|
| **Contract ID** | `CDHR3VDMHNWYXAF6ZNJEVUQWOU6P7TP45OMWOYM3TLACOZOEOIPJOOSX` |

<div align="center">
  <img width="1000" height="600" alt="Contract Interface" src="https://github.com/user-attachments/assets/bbb0f658-7d73-4d2a-a160-e0fa406e95a8" />
</div>

---

## 📝 Feedback

We'd love to hear your thoughts! Help us improve WalletGraph by sharing your feedback:

<div align="center">

| Feedback Type | Link |
|---|---|
| 💼 **Response Data Collection** | [Google Sheets](https://docs.google.com/spreadsheets/d/1LeWtIn1Gc0lEMhISqLlrBRDt4y3MR1yQUj78Vfv5K_0/edit?usp=sharing) |
| ⭐ **Rate the Website** | [Google Forms](https://forms.gle/PwVY4yJUobUFv7ig9) |

</div>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ on the **Stellar** blockchain using **Soroban SDK**

*Empowering trust in decentralised finance — one wallet at a time.*

</div>
