# 🟠 Orange Dev Network | Bitcoin Technical Influence Map

Mapping the hidden structures of **Bitcoin R&D** through the lens of technical consensus.

This repository analyzes 15+ years of technical discussions (2011–Present) from the **Bitcoin-dev Mailing List** and **Delving Bitcoin** to visualize influence hubs, technical authority, and the evolution of the protocol.

---

## 📊 Technical Insights

### 🗓️ Temporal Leadership (Top 10 Influencers)
*Ranked by message frequency and network centrality in specific eras.*

| Era | Top 10 Contributors |
| :--- | :--- |
| **Foundation (All-Time)** | Peter Todd, Mike Hearn, Gregory Maxwell, Luke Dashjr, ZmnSCPxj, Jeff Garzik, Pieter Wuille, Jorge Timón, Gavin Andresen, Matt Corallo |
| **Post-Segwit (2016+)** | ZmnSCPxj, Peter Todd, Antoine Riard, Luke Dashjr, Anthony Towns, Gregory Maxwell, Erik Aronesty, Eric Voskuil, Matt Corallo, Jeremy |
| **Modern R&D (2023+)** | Antoine Riard, Peter Todd, /dev /fd0, Anthony Towns, Antoine Poinsot, Gregory Maxwell, Erik Aronesty, David A. Harding, Murch, Andrew Poelstra |

### 📂 Technical Area Deep-Dive
- **Mempool & Fees**: Peak activity has shifted to the modern era (**2024**), driven by complex debates on cluster mempool and V3 transaction structures. **Peter Todd** remains the most prolific voice in this domain.
- **Covenants**: Currently the fastest-growing technical theme. Activity spiked in **2025**, marking a transition from abstract research to concrete proposal review, led by **ZmnSCPxj**.
- **Lightning Network**: Technical discourse reached a new high in **2025**, focusing on LN-Symmetry (eltoo), BOLT 12, and channel jamming. **ZmnSCPxj** drives a significant portion of the cross-layer research.
- **Privacy & Fungibility**: Although a constant concern, activity peaked early in **2014** during discussions on stealth addresses and CoinJoin. Recent activity (2024+) focus on Silent Payments and Frost-based threshold privacy.
- **Soft Fork Activation**: Historically dominated by the **2017** era during the lead-up to SegWit. **Jorge Timón** and **Luke Dashjr** were primary drivers in defining the mechanics of upgrade signaling (BIP 9/8).
- **Mining & PoW**: Historically peaked in **2015**, capturing the era of intense debate over block templates, ASICs, and the fundamental consensus rules.
- **Wallet & Keys**: Primary development of standards (BIP 32/39/44) occurred in **2014**, with **Pavol Rusnak** as a key technical contributor to early HD wallet architecture.

### 📈 Network Summary
- **Total Messages Parsed**: 27,172
- **Unique Contributors**: 1,523
- **Primary Channels**: Bitcoin-dev Mailing List & Delving Bitcoin
- **Temporal Range**: June 2011 – February 2026

---

## 🏗️ Repository Structure

- **/scripts/ingest**: Data gathering from Public-Inbox and Delving API.
- **/scripts/analysis**: Influence hub calculation, thread categorization, and metric aggregation.
- **/config**: Identity mapping tables (`identity_mappings.json`) to resolve handles to canonical names.
- **/data/viz**: Core JSON artifacts feeding the interactive front-end.
- **/research**: Markdown notes on protocol evolution and technical friction.

---

## 🚀 Interactive Visualization

The repo powers a live **Interactive Technical Graph** hosted via GitHub Pages:
👉 **[View the Orange Dev Network Map](https://sorukumar.github.io/orange-dev-network/)**
