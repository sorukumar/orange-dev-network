# 🟠 Orange Dev Network | The Human Layer of Bitcoin R&D

**[Enter the Network Dashboard](https://sorukumar.github.io/orange-dev-network/)**

Mapping the hidden structures of **Bitcoin R&D** through the lens of technical consensus.

---

## 🍊 The Orange Dev Suite

This project is part of the **Orange Dev Suite**, a comprehensive, open-source analytical ecosystem designed to provide forensic transparency into Bitcoin research and development. The suite consists of three complementary platforms powered by a unified data engine ([Orange Dev Data](https://github.com/sorukumar/orange-dev-data)):

1. **[Orange Dev Tracker](https://github.com/sorukumar/orange-dev-tracker)**: The "What" and "Where". A high-fidelity dashboard focused on the architectural evolution of the Bitcoin Core codebase, revealing the functional state of Bitcoin R&D.
2. **[Orange Dev Network](https://github.com/sorukumar/orange-dev-network)**: The "Who" and "How". A technical influence map visualizing the human layer of Bitcoin R&D. It analyzes discussions, reviews, and debates to map social authority and consensus dynamics.
3. **[This Week in Bitcoin (TWIB)](https://github.com/sorukumar/this-week-in-bitcoin)**: The "Now". An automated weekly executive summary distilling dense technical discussions and Pull Requests into a high-level briefing.

---

## 🕸️ About Orange Dev Network

Bitcoin's roadmap emerges from thousands of distributed technical decisions. The **Orange Dev Network** dashboard visualizes influence hubs, technical authority, and the evolution of the protocol by analyzing the entire ecosystem: **Code Commits, Pull Request Reviews, the Bitcoin-dev Mailing List, and Delving Bitcoin**. 

This platform helps researchers, builders, and capital allocators separate durable engineering signal from short-lived hype.

### 🧠 How Influence is Calculated

Influence in this network is not just based on who talks the most. We use a **Hybrid Scoring Model** that weights three key pillars of technical contribution:

1.  **Code Commits (40%)**: Proven capability to ship code into Bitcoin Core.
2.  **Social Consensus (35%)**: A Temporal PageRank algorithm (Eigenvector Centrality) based on technical peer review across the Mailing List and Delving Bitcoin. When highly influential developers respond to your ideas, your score increases.
3.  **Code Review (25%)**: Deep technical scrutiny through GitHub Pull Request reviews.

**Qualitative Bonuses**: Additional weight is granted for authoring **BIPs (Bitcoin Improvement Proposals)** and serving as an active Maintainer. 

This multi-faceted approach categorizes developers into clear archetypes (e.g., Protocol Designer, Builder, Reviewer, Participant) to map true technical authority.

### 📊 Available Charts & Dashboards

The frontend provides the following interactive views:

*   **Influence Map (`network.html`)**: A massive force-directed graph of the entire ecosystem. Nodes are developers, sized by their hybrid influence score, with edges representing technical dialogue and code review.
*   **Protocol Pulse (`pulse.html`)**: Live momentum trackers. Shows the most active topics, most discussed BIPs, and the influx of new developers over the last 90 days.
*   **Contributor Profiles (`profile.html` & `directory.html`)**: Deep-dive analytics on individuals, including:
    *   **Commit History Chart**: Timeline of a developer's code contributions by functional area.
    *   **Social History Chart**: Timeline of a developer's mailing list and research activity.
    *   **Expertise Fingerprint**: Visual breakdown of their technical domain (e.g., Consensus vs. P2P vs. Wallet).

---

## 🏗️ Repository Structure & Architecture

This repository is strictly the frontend visualization layer. All heavy-lifting data processing runs asynchronously and is hosted in **[Orange Dev Data](https://github.com/sorukumar/orange-dev-data)**. 

- **/docs**: Documentation on the frontend architecture.
- **/assets**, **/js**, **/styles**: Static assets, JavaScript logic, and modularized CSS for the UI.

---
*Created by [Bitcoin Data Labs](https://bitcoindatalabs.org) as a contribution to the transparency of the Bitcoin protocol.*
