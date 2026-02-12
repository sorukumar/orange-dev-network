# 🟠 Orange Dev Network | Bitcoin Technical Influence Map

Mapping the hidden structures of **Bitcoin R&D** through the lens of technical consensus.

This repository analyzes 15+ years of technical discussions (2011–Present) from the **Bitcoin-dev Mailing List** and **Delving Bitcoin** to visualize influence hubs, technical authority, and the evolution of the protocol.

---

## 📊 Technical Insights

### 🗓️ Temporal Leadership (Top 5 Influencers)
*Ranked by message frequency and network centrality in specific eras.*

| Era | Top Contributors |
| :--- | :--- |
| **Foundation (All-Time)** | Peter Todd, Mike Hearn, Gregory Maxwell, Luke Dashjr, ZmnSCPxj |
| **Post-Segwit (2016+)** | ZmnSCPxj, Peter Todd, Antoine Riard, Luke Dashjr, Anthony Towns |
| **Modern R&D (2023+)** | Antoine Riard, Peter Todd, /dev /fd0, Anthony Towns, Antoine Poinsot |

### 📂 Technical Area Deep-Dive
- **Mempool & Fees**: Peak activity has shifted to the modern era (2024), driven by complex debates on cluster mempool and V3 transaction structures. **Peter Todd** remains the most prolific voice in this domain.
- **Covenants**: Currently the fastest-growing technical theme. Activity spiked in **2025**, marking a transition from abstract research to concrete proposal review, led by **ZmnSCPxj**.
- **Mining & PoW**: Historically peaked in **2015**, capturing the era of intense debate over block templates, ASICs, and the fundamental consensus rules.

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

---

## 🛠️ Setup & Usage

1. **Install Dependencies**: `pip install pandas pyarrow requests`
2. **Ingest Data**: `python scripts/ingest/run_all.py`
3. **Analyze**: `python scripts/analysis/influence_hubs.py`
