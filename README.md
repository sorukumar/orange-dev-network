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
| **Post-Segwit (2016+)** | ZmnSCPxj, Peter Todd, Antoine Riard, Luke Dashjr, Anthony Towns, Gregory Maxwell, Erik Aronesty, Eric Voskuil, Matt Corallo, Jeremy Rubin |
| **Modern R&D (2023+)** | David A. Harding, Antoine Riard, Peter Todd, Anthony Towns, Antoine Poinsot, Gregory Maxwell, Erik Aronesty, Mark Erhardt (Murch), Andrew Poelstra, Bastien Teinturier |

### 📂 Technical Area Deep-Dive
- **Mempool & Fees**: Peak activity has shifted to the modern era (**2024**), driven by complex debates on cluster mempool and V3 transaction structures. **Peter Todd** remains the most prolific voice in this domain.
- **Covenants**: Currently the fastest-growing technical theme. Activity spiked in **2025**, marking a transition from abstract research to concrete proposal review, led by **ZmnSCPxj**.
- **Lightning Network**: Technical discourse reached a new high in **2025**, focusing on LN-Symmetry (eltoo), BOLT 12, and channel jamming. **ZmnSCPxj** and **Bastien Teinturier** drive significant portions of the research.
- **Privacy & Fungibility**: Although a constant concern, activity peaked early in **2014** during discussions on stealth addresses and CoinJoin. Recent activity (2024+) focus on Silent Payments and Frost-based threshold privacy.
- **Soft Fork Activation**: Historically dominated by the **2017** era during the lead-up to SegWit. **Jorge Timón** and **Luke Dashjr** were primary drivers in defining the mechanics of upgrade signaling (BIP 9/8).
- **Mining & PoW**: Historically peaked in **2015**, capturing the era of intense debate over block templates, ASICs, and the fundamental consensus rules.
- **Wallet & Keys**: Primary development of standards (BIP 32/39/44) occurred in **2014**, with **Pavol Rusnak** as a key technical contributor to early HD wallet architecture.

### � How Influence is Calculated
Influence in this network is not just about posting frequency; it is a measure of **technical weight** and **directed attention**.

- **For the Curious**: We use a **Temporal PageRank** algorithm (Eigenvector Centrality). We treat replies as a form of "technical peer review." When a high-influence contributor engages with your thread or responds to your post, your own centrality increases. This ensures that "signal" is prioritized over "noise."
- **In Simple Terms**: It is a digital reputation system. If the most respected engineers in Bitcoin are constantly reviewing, debating, or building on your ideas, you gain influence. It’s not about how much you talk—it’s about who listens and responds to you.

### �📈 Network Summary
- **Total Messages Parsed**: 27,800+
- **Unique Contributors**: 1,752
- **Primary Channels**: Bitcoin-dev Mailing List & Delving Bitcoin
- **Temporal Range**: June 2011 – February 2026

---

## 🏗️ Repository Structure

- **/scripts/ingest**: Automated data gathering from Public-Inbox archives and the Delving Bitcoin forum.
- **/data/viz**: Core JSON artifacts and graph schemas that power the interactive frontend.
- **/docs**: Documentation on project architecture and data schema.

*Note: The core identity resolution engine and high-fidelity mapping logic are currently in a "Staged Release" phase to ensure data quality before the full public audit.*

---

## 🚀 Interactive Visualization

The repo powers a live **Interactive Technical Graph** hosted via GitHub Pages:
👉 **[View the Orange Dev Network Map](https://sorukumar.github.io/orange-dev-network/)**
