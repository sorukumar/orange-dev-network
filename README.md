# 🟠 Orange Dev Network | Bitcoin Technical Influence Map

Mapping the hidden structures of **Bitcoin R&D** through the lens of technical consensus.

This repository analyzes 15+ years of technical discussions (2011–Present) from the **Bitcoin-dev Mailing List** and **Delving Bitcoin** to visualize influence hubs, technical authority, and the evolution of the protocol.

---

## 📊 Technical Insights

The Interactive Technical Graph provides live insights into the Bitcoin development ecosystem, including:

- **Temporal Leadership**: Discover the top contributors and influence hubs across different eras (e.g., Foundation, Post-Segwit, Modern R&D).
- **Technical Area Deep-Dives**: Track the historical evolution of specific topics like Mempool & Fees, Covenants, Lightning Network, Privacy & Fungibility, and Soft Fork Activation.
- **Network Summary**: Explore thousands of technical messages and unique contributors parsed directly from the Bitcoin-dev Mailing List and Delving Bitcoin.

### 🧠 How Influence is Calculated
Influence in this network is not just about posting frequency; it is a measure of **technical weight** and **directed attention**.

- **For the Curious**: We use a **Temporal PageRank** algorithm (Eigenvector Centrality). We treat replies as a form of "technical peer review." When a high-influence contributor engages with your thread or responds to your post, your own centrality increases. This ensures that "signal" is prioritized over "noise."
- **In Simple Terms**: It is a digital reputation system. If the most respected engineers in Bitcoin are constantly reviewing, debating, or building on your ideas, you gain influence. It’s not about how much you talk—it’s about who listens and responds to you.

---

## 🏗️ Repository Structure

This repository is strictly the frontend visualization layer. All data processing and generation pipelines have been migrated to **[orange-dev-data](https://github.com/sorukumar/orange-dev-data)**.

- **/docs**: Documentation on the frontend architecture.
- **/assets**, **/js**, **/styles**: Static assets, JavaScript logic, and CSS for the UI.
- **index.html**, **network.html**, **profile.html**, etc.: Entry points for the interactive visualizations.



---

## 🚀 Interactive Visualization

The repo powers a live **Interactive Technical Graph** hosted via GitHub Pages:
👉 **[View the Orange Dev Network Map](https://sorukumar.github.io/orange-dev-network/)**
