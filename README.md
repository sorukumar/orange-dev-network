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
- **Mempool & Fees**: Discourse reached a historical peak in **2024**, marking the most active period for fee policy research in Bitcoin's history. The data shows a shift from general fee estimation toward high-complexity topics like **v3 relay** and **cluster mempool**, as the network adapted to unprecedented congestion levels.
- **Covenants**: Currently the most explosive technical theme in the data. While research has been constant since 2022, activity doubled in **2025**, marking a transition from abstract research into a "concrete review" phase. This is currently the primary driver of incoming message volume in Delving Bitcoin.
- **Lightning Network**: Technical discourse reached an all-time high in **2025**. The data suggests a secondary "R&D wave" that is significantly larger than the initial post-SegWit period (2018), with a modern focus on protocol safety, **Channel Jamming** mitigations, and **BOLT 12**.
- **Privacy & Fungibility**: Although a constant concern, the data shows two distinct peaks. The first (**2015**) during early CoinJoin and Stealth Address research, and a modern resurgence (**2024-2025**) focusing on **Silent Payments** and **FROST** thresholds.
- **Soft Fork Activation**: Peak activity occurred during the **2017** SegWit era, but the data shows a secondary spike in **2021** (Taproot activation) and a sustained high-level of debate through **2023-2025** regarding BIP 8 vs BIP 9 logic for future upgrades.
- **Mining & PoW**: Historically peaked in **2015** (Block size debate and ASIC optimization), with a recent 2022-2024 resurgence focusing on **Stratum V2** and decentralized pool protocols.
- **Wallet & Keys**: Massive activity in **2014** (standardization of BIP 32/39/44), followed by a modern transition (2022+) toward **Output Descriptors** and **PSBT** refinements.
- **The BIP Paradox**: Our data reveals that only **14.6%** of technical threads actually mention an explicit BIP number. This highlights a crucial reality: the BIP process is a tool for *documentation*, not discovery. Technical consensus is forged in the "messy human conversations" of the social layer—often years before a formal proposal is numbered.

### � How Influence is Calculated
Influence in this network is not just about posting frequency; it is a measure of **technical weight** and **directed attention**.

- **For the Curious**: We use a **Temporal PageRank** algorithm (Eigenvector Centrality). We treat replies as a form of "technical peer review." When a high-influence contributor engages with your thread or responds to your post, your own centrality increases. This ensures that "signal" is prioritized over "noise."
- **In Simple Terms**: It is a digital reputation system. If the most respected engineers in Bitcoin are constantly reviewing, debating, or building on your ideas, you gain influence. It’s not about how much you talk—it’s about who listens and responds to you.


---

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



---

## 🚀 Interactive Visualization

The repo powers a live **Interactive Technical Graph** hosted via GitHub Pages:
👉 **[View the Orange Dev Network Map](https://sorukumar.github.io/orange-dev-network/)**
