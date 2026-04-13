/**
 * Bitcoin Technical Influence Graph - Visualization Logic
 * Using D3.js Force-Directed Graph
 */

const THEME_MAPPING = {
    'soft-fork-activation': 'Consensus', 'hard-fork-block-size': 'Consensus', 'consensus-cleanup': 'Consensus', 'segwit': 'Consensus', 'taproot': 'Consensus',
    'covenants': 'Script', 'script-opcodes': 'Script', 'vaults': 'Script', 'dlc': 'Script',
    'lightning': 'L2', 'l2-bridges': 'L2', 'sidechains-drivechain': 'L2', 'bitvm': 'L2', 'atomic-swaps': 'L2',
    'privacy': 'Privacy', 'silent-payments': 'Privacy',
    'wallet-keys': 'Wallet', 'multisig-threshold': 'Wallet',
    'mining': 'Mining',
    'mempool-fees': 'Mempool', 'spam-filtering': 'Mempool',
    'p2p-network': 'Network',
    'signatures-sighash': 'Crypto', 'quantum': 'Crypto',
    'utxo-sync': 'Data', 'transaction-format': 'Data', 'data-structures': 'Data',
    'payment-protocol': 'Ecosystem', 'ecash': 'Ecosystem', 'nostr': 'Ecosystem', 'scaling': 'Ecosystem', 'testing-devtools': 'Ecosystem', 'core-dev': 'Ecosystem', 'bip-process': 'Ecosystem'
};

// Temporal Color Mapping (Recency)
const TEMPORAL_COLORS = {
    'active': '#E8916B',     // BDL Primary Orange: Last 6mo
    'recent': '#F4C2A1',     // BDL Warm Accent: 6mo - 2y
    'aged': '#94A3B8',       // Muted Steel: 2y - 5y
    'historical': '#475569', // Dark Slate: > 5y
    'legendary': '#1E293B'   // Deep Navy: Long inactive
};

function getTemporalColor(lastActiveDate) {
    const lastActive = new Date(lastActiveDate);
    const now = new Date();
    const diffDays = (now - lastActive) / (1000 * 60 * 60 * 24);

    if (diffDays < 180) return TEMPORAL_COLORS.active;
    if (diffDays < 730) return TEMPORAL_COLORS.recent;
    if (diffDays < 1825) return TEMPORAL_COLORS.aged;
    return TEMPORAL_COLORS.historical;
}

const THEME_COLORS = {
    'Consensus': 'var(--color-consensus)',
    'Script': 'var(--color-script)',
    'L2': 'var(--color-l2)',
    'Privacy': 'var(--color-privacy)',
    'Wallet': 'var(--color-wallet)',
    'Mempool': 'var(--color-mempool)',
    'Network': 'var(--color-network)',
    'Mining': 'var(--color-mining)',
    'Crypto': '#a855f7',
    'Data': '#6366f1',
    'Ecosystem': '#94a3b8',
    'other': 'var(--color-other)'
};

let allData, nodes, links, simulation;
let currentFilters = { view: 'all', theme: 'all', search: '', bip: '' };
let totalPopulation = 0;

const svg = d3.select("#viz");
const container = d3.select("#graph-container");
const tooltip = d3.select("#tooltip");
let width, height;

const g = svg.append("g");
const zoom = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (e) => g.attr("transform", e.transform));

svg.call(zoom);

function initViz() {
    updateDimensions();

    // Load data
    const DATA_PATH_PREFIX = 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/';
    d3.json(DATA_PATH_PREFIX + "data/viz/network_graph.json").then(data => {
        allData = data;
        totalPopulation = data.metadata.total_population || data.nodes.length;

        document.getElementById('total-pop').innerText = totalPopulation.toLocaleString();
        document.getElementById('viz-count').innerText = data.nodes.length.toLocaleString();

        allData.nodes.forEach(n => {
            n.theme = THEME_MAPPING[n.top_category] || 'other';
            n.expertise.forEach(e => { e.theme = THEME_MAPPING[e.topic] || 'other'; });
        });

        updateViz();
        setupEventListeners();
    }).catch(error => {
        console.error("Error loading graph data:", error);
    });
}

function updateDimensions() {
    width = container.node().getBoundingClientRect().width;
    height = container.node().getBoundingClientRect().height;
    svg.attr("width", width).attr("height", height);
}

function setupEventListeners() {
    d3.selectAll(".filter-btn").on("click", function () {
        const btn = d3.select(this);
        const parent = d3.select(this.parentNode);
        parent.selectAll(".filter-btn").classed("active", false);
        btn.classed("active", true);

        if (btn.attr("data-view")) currentFilters.view = btn.attr("data-view");
        if (btn.attr("data-theme")) currentFilters.theme = btn.attr("data-theme");

        updateViz();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        currentFilters.search = e.target.value.toLowerCase();
        highlightSearch();
    });

    document.getElementById('bip-search').addEventListener('input', (e) => {
        currentFilters.bip = e.target.value.trim();
        updateViz();
    });

    document.getElementById('zoom-in').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    document.getElementById('zoom-out').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 0.6);
    document.getElementById('reset').onclick = () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);

    window.onresize = () => {
        updateDimensions();
    };
}

function updateViz() {
    if (!allData) return;

    nodes = allData.nodes.filter(n => {
        const score = getScore(n);
        if (currentFilters.theme !== 'all' && n.theme !== currentFilters.theme) return false;
        if (currentFilters.bip !== '') {
            if (!n.bips.some(b => b.includes(currentFilters.bip))) return false;
        }
        return score > 0.00001;
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    links = allData.links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeIds.has(s) && nodeIds.has(t);
    });

    document.getElementById('node-count').innerText = nodes.length;
    render();
    if (currentFilters.search) highlightSearch();
}

function highlightSearch() {
    const term = currentFilters.search;
    g.selectAll("circle")
        .style("stroke", n => n.id.toLowerCase().includes(term) && term !== '' ? "#fff" : "#000")
        .style("stroke-width", n => n.id.toLowerCase().includes(term) && term !== '' ? 2 : 0.5)
        .attr("r", n => {
            const base = getRadius(n);
            return n.id.toLowerCase().includes(term) && term !== '' ? base * 1.5 : base;
        });
}

function formatInfluence(n) {
    const rank = n.ranks[currentFilters.view];
    const pct = (rank / totalPopulation) * 100;
    if (pct <= 2.5) return `Top 2.5% (Rank #${rank})`;
    if (pct <= 10) return `Top 10%`;
    if (pct <= 25) return `Top 25%`;
    if (pct <= 50) return `Top 50%`;
    return "Active Participant";
}

function render() {
    g.selectAll("*").remove();
    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(40))
        .force("charge", d3.forceManyBody().strength(-120))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => getRadius(d) + 1));

    const link = g.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("class", "link")
        .attr("stroke", "#555")
        .attr("stroke-width", d => Math.sqrt(d.weight) * 0.5)
        .attr("stroke-opacity", d => Math.min(0.4, 0.05 + d.weight * 0.05));

    const node = g.append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("class", "node")
        .attr("r", d => getRadius(d))
        .attr("fill", d => getTemporalColor(d.last_active))
        .attr("stroke", "#000")
        .call(drag(simulation));

    const label = g.append("g")
        .selectAll("text")
        .data(nodes.filter(n => getScore(n) > 0.005))
        .join("text")
        .attr("class", "label")
        .text(d => d.id)
        .attr("dx", d => getRadius(d) + 3)
        .attr("dy", ".35em");

    node.on("mouseover", (e, d) => {
        tooltip.style("display", "block").html(`
            <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${d.id}</div>
            <div style="color:${getTemporalColor(d.last_active)}">Last Active: ${new Date(d.last_active).toLocaleDateString()}</div>
            <div style="margin-top:8px; font-size:11px; color:#ccc;">
                Primary Focus: <span style="color:${THEME_COLORS[d.theme] || '#fff'}; font-weight:600;">${d.theme}</span><br>
                Posts: Threads (${d.threads_started}) | Replies (${d.replies_sent})<br>
                Influence: <span style="color:var(--bitcoin-orange); font-weight:600;">${formatInfluence(d)}</span>
            </div>
        `);

        const neighbors = new Set();
        links.forEach(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            if (sId === d.id) neighbors.add(tId);
            if (tId === d.id) neighbors.add(sId);
        });
        node.style("opacity", n => neighbors.has(n.id) || n.id === d.id ? 1 : 0.05);
        link.style("stroke-opacity", l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === d.id || tId === d.id ? 0.8 : 0.02;
        })
            .style("stroke-width", l => {
                const sId = typeof l.source === 'object' ? l.source.id : l.source;
                const tId = typeof l.target === 'object' ? l.target.id : l.target;
                return sId === d.id || tId === d.id ? 2 : 0.5;
            });
    })
        .on("mousemove", (e) => tooltip.style("left", (e.pageX + 15) + "px").style("top", (e.pageY - 15) + "px"))
        .on("mouseout", () => {
            tooltip.style("display", "none");
            node.style("opacity", 1);
            link.style("stroke-opacity", d => Math.min(0.4, 0.05 + d.weight * 0.05))
                .style("stroke-width", d => Math.sqrt(d.weight) * 0.5);
        })
        .on("click", (e, d) => {
            showProfile(d);
        });

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
    });
}

function showProfile(d) {
    document.getElementById('selection-panel').style.display = 'block';
    const srcClass = d.dominant_source === 'delving' ? 'tag-delving' : (d.dominant_source === 'mailing_list' ? 'tag-ml' : 'tag-mixed');
    let expertiseHtml = d.expertise.map(exp => `
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
            <span>${exp.topic}</span>
            <span>${Math.round(exp.share * 100)}%</span>
        </div>
        <div class="expertise-meter">
            <div class="expertise-segment" style="width:${exp.share * 100}%; background:${THEME_COLORS[exp.theme] || '#444'}"></div>
        </div>
    `).join('');

    let bipsHtml = d.bips.length > 0 ? d.bips.map(b => `<span class="bip-chip">BIP ${b}</span>`).join('') : '<span style="color:#666; font-size:11px;">None cited</span>';
    const mlCount = d.source_breakdown.mailing_list || 0;
    const dvCount = d.source_breakdown.delving || 0;

    document.getElementById('selection-content').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="tag ${srcClass}">${d.dominant_source.replace('_', ' ')}</span>
            ${d.growth > 1.5 ? `<span class="tag" style="color:var(--bitcoin-orange); border:1px solid var(--bitcoin-orange); font-size: 9px;">↑ Rising</span>` : ''}
        </div>
        <div style="font-size:18px; font-weight:700; margin-bottom:4px; color: #fff;">${d.id}</div>
        <div style="font-size:12px; color:${THEME_COLORS[d.theme]}; font-weight:600; text-transform:uppercase; margin-bottom:16px;">
            ${d.theme} Expert
        </div>
        <div class="expertise-label">Technical Fingerprint</div>
        ${expertiseHtml}
        <div class="expertise-label">BIP Association</div>
        <div style="margin-top:8px;">${bipsHtml}</div>
        <div class="expertise-label">Platform Breakdown</div>
        <div style="margin-top:10px;">
            <div class="info-item"><span class="info-label">Mailing List</span><span class="info-val">${mlCount} posts</span></div>
            <div class="info-item"><span class="info-label">Delving Bitcoin</span><span class="info-val">${dvCount} posts</span></div>
        </div>
        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px;">
            <div class="info-item"><span class="info-label">Threads Started</span><span class="info-val">${d.threads_started}</span></div>
            <div class="info-item"><span class="info-label">Replies Sent</span><span class="info-val">${d.replies_sent}</span></div>
            <div class="info-item"><span class="info-label">Replies Received</span><span class="info-val">${d.replies_received}</span></div>
            <div class="info-item" style="margin-top:10px;"><span class="info-label">Influence Rank</span><span class="info-val" style="color:var(--bitcoin-orange); font-weight:700;">${formatInfluence(d)}</span></div>
            <div class="info-item"><span class="info-label">Last Active</span><span class="info-val">${new Date(d.last_active).toLocaleDateString()}</span></div>
        </div>`;

    // Smooth scroll to selection info on mobile if needed
    if (window.innerWidth < 768) {
        document.getElementById('selection-panel').scrollIntoView({ behavior: 'smooth' });
    }
}

function getScore(d) { return d.scores[currentFilters.view] || 0; }
function getRadius(d) {
    // Starker scaling: Higher power (0.75 vs 0.5) to separate top influencers from the mid-tier
    return Math.pow(getScore(d), 0.85) * 800 + 3;
}
function drag(simulation) {
    return d3.drag()
        .on("start", (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on("drag", (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on("end", (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; });
}

// Global initialization
document.addEventListener('DOMContentLoaded', initViz);
