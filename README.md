# 🟠 Orange Dev Network | Bitcoin Technical Influence Map

Mapping the hidden structures of **Bitcoin R&D** through the lens of technical consensus.

This repository analyzes 15+ years of technical discussions (2011–Present) from the **Bitcoin-dev Mailing List** and **Delving Bitcoin** to visualize influence hubs, technical authority, and the evolution of the protocol.

---

## 📊 Project Insights

### 🌐 Network Stats
- **Total Messages Parsed**: 27,172
- **Unique Contributors**: 1,523
- **Primary Channels**: 
  - Bitcoin-dev Mailing List (Public-Inbox)
  - Delving Bitcoin (Discourse)
- **Temporal Range**: June 2011 – February 2026

### 🏆 Top 10 Influence Hubs
*Based on weighted pagerank and reply-graph centrality within technical threads.*

1. **Peter Todd**
2. **Mike Hearn**
3. **Gregory Maxwell**
4. **Luke Dashjr**
5. **Gavin Andresen**
6. **Pieter Wuille**
7. **ZmnSCPxj**
8. **Jeff Garzik**
9. **Matt Corallo**
10. **Mark Friedenbach**

### 🏷️ Technical Themes & Influence
Our analysis categorizes discussions into specific thematic silos to trace how different technical schools of thought have evolved.

| Category | Post Count | Definition |
| :--- | :--- | :--- |
| **Mining** | 2,221 | PoW, ASICs, pools, block templates, Stratum, selfish mining. |
| **Mempool & Fees** | 1,899 | RBF, CPFP, fee estimation, package relay, cluster mempool. |
| **Block Size & Forks** | 1,797 | The block size debate (2015-2017) and hard fork proposals. |
| **Covenants** | 1,405 | CTV, OP_CAT, OP_VAULT, anyprevout, and introspection. |
| **Wallet & Keys** | 1,111 | HD wallets, BIP39, descriptors, PSBTs, and key management. |
| **Payment Protocol** | 1,109 | BIP 70-75, bitcoin: URIs, and payment requests. |
| **Script & Opcodes** | 939 | Opcodes, Simplicity, Miniscript, and interpreter logic. |
| **Taproot / Schnorr** | 868 | Taproot activation, Schnorr signatures, and Tapscript. |
| **Soft Fork Activation** | 853 | BIP 9, BIP 8, Speedy Trial, UASF, and signaling. |

---

## 🏗️ Repository Structure

- **/scripts/ingest**: Data gathering from Public-Inbox and Delving API.
- **/scripts/analysis**: Influence hub calculation, thread categorization, and metric aggregation.
- **/config**: Identity mapping tables (`identity_mappings.json`) to resolve handles to canonical names.
- **/data/viz**: Output artifacts for the frontend (Graph JSON, stats).
- **/research**: Markdown notes on protocol evolution and findings.

---

## 🚀 Interactive Visualization

The repo powers a live **Interactive Technical Graph** hosted via GitHub Pages:
👉 **[View the Orange Dev Network Map](https://sorukumar.github.io/orange-dev-network/)**

---

## 🛠️ Infrastructure for LLMs & SEO
To make this repository and its hosted data discoverable by LLM agents and search engines:
- **[llms.txt](llms.txt)**: Pre-digested summary of project goals and top-level stats for AI agents.
- **[sitemap.xml](sitemap.xml)**: Optimized structure for search engine indexing.
- **[robots.txt](robots.txt)**: Standard crawler permissions.
- **Open Graph & schema.org**: Rich metadata embedded in `index.html` for social sharing and structured search results.

---

## 📬 Stay Updated
Interested in the raw data or contributing to the analysis?
- **Historical Archives**: [Bitcoin-dev Public-Inbox](https://lore.kernel.org/bitcoin-dev/)
- **Research Hub**: [Delving Bitcoin](https://delvingbitcoin.org)
