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

// Archetype Color Mapping
const ARCHETYPE_COLORS = {
    'Protocol Architect': '#E8916B',    // BDL Primary Orange: Leaders
    'Core Engineer': '#4ADE80',         // Vibrant Green: Builders
    'Social Researcher': '#60A5FA',     // Sky Blue: Researchers
    'BIP Author': '#A855F7',            // Purple: Protocol Designers
    'Silent Contributor': '#94A3B8',    // Muted Slate: Code-only
    'Protocol Participant': '#475569',  // Dark Slate: Community
    'Specialist': '#FACC15'             // Yellow: Niche Experts
};

function getNodeColor(d) {
    return ARCHETYPE_COLORS[d.dev_type] || '#475569';
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
    d3.json(DATA_PATH_PREFIX + "output/network/network_graph.json").then(data => {
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
        // Allow anything with a positive score (Hybrid or Social)
        return score > 0;
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
    const rank = n.ranks[currentFilters.view] || 9999;
    const isHybrid = currentFilters.view === 'all';
    
    // If we're in 'all' view, use the index in the sorted array for rank if explicit rank is missing
    let displayRank = rank;
    if (isHybrid && rank === 9999) {
       // Find index in original allData.nodes which is already sorted by hybrid_score
       displayRank = allData.nodes.findIndex(node => node.id === n.id) + 1;
    }

    const pct = (displayRank / totalPopulation) * 100;
    if (pct <= 2.5) return `Top 2.5% (Rank #${displayRank})`;
    if (pct <= 10) return `Top 10%`;
    if (pct <= 25) return `Top 25%`;
    if (pct <= 50) return `Top 50%`;
    return n.dev_type === 'Silent Contributor' ? "Technical Contributor" : "Active Participant";
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
        .attr("fill", d => getNodeColor(d))
        .attr("stroke", "#000")
        .call(drag(simulation));

    const label = g.append("g")
        .selectAll("text")
        .data(nodes.filter(n => (getScore(n) > 0.005) || (n.hybrid_score > 3)))
        .join("text")
        .attr("class", "label")
        .text(d => d.id)
        .attr("dx", d => getRadius(d) + 3)
        .attr("dy", ".35em");

    node.on("mouseover", (e, d) => {
        tooltip.style("display", "block").html(`
            <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${d.id}</div>
            <div style="font-size:11px; font-weight:600; color:${getNodeColor(d)}; text-transform:uppercase; margin-bottom:4px;">${d.dev_type}</div>
            <div style="color:#94a3b8; font-size:10px;">Last Active: ${new Date(d.last_active).toLocaleDateString()}</div>
            <div style="margin-top:8px; font-size:11px; color:#ccc; border-top:1px solid #334155; padding-top:6px;">
                Focus: <span style="color:${THEME_COLORS[d.theme] || '#fff'}; font-weight:600;">${d.theme}</span><br>
                Code: <b>${d.code_stats.commits}</b> commits<br>
                Social: <b>${d.threads_started + d.replies_sent}</b> posts<br>
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
            <div style="display:flex; gap:6px;">
                <span class="tag ${srcClass}">${d.dominant_source.replace('_', ' ')}</span>
                <span class="tag" style="background:${getNodeColor(d)}22; color:${getNodeColor(d)}; border:1px solid ${getNodeColor(d)}55;">${d.dev_type}</span>
            </div>
            ${d.growth > 1.5 ? `<span class="tag" style="color:var(--bitcoin-orange); border:1px solid var(--bitcoin-orange); font-size: 9px;">↑ Rising</span>` : ''}
        </div>
        <div style="font-size:20px; font-weight:800; margin-bottom:4px; color: #fff; letter-spacing:-0.01em;">${d.id}</div>
        <div style="font-size:12px; color:${THEME_COLORS[d.theme]}; font-weight:700; text-transform:uppercase; margin-bottom:16px; letter-spacing:0.05em;">
            ${d.theme} Specialist
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
            <div class="stat-card" style="background:#1e293b; padding:10px; border-radius:8px; border:1px solid #334155;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Commits</div>
                <div style="font-size:16px; font-weight:700; color:#4ade80;">${d.code_stats.commits.toLocaleString()}</div>
            </div>
            <div class="stat-card" style="background:#1e293b; padding:10px; border-radius:8px; border:1px solid #334155;">
                <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Impact</div>
                <div style="font-size:16px; font-weight:700; color:var(--bitcoin-orange);">${d.code_stats.impact.toLocaleString()}</div>
            </div>
        </div>

        <div class="expertise-label">Technical Fingerprint</div>
        ${expertiseHtml}
        
        <div class="expertise-label" style="margin-top:20px;">Protocol Assets</div>
        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px;">
            ${bipsHtml}
            ${d.code_stats.is_maintainer ? '<span class="bip-chip" style="background:#4ade8022; color:#4ade80; border-color:#4ade8044;">CORE MAINTAINER</span>' : ''}
        </div>

        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px;">
            <div class="info-item"><span class="info-label">Threads / Replies</span><span class="info-val">${d.threads_started} / ${d.replies_sent}</span></div>
            <div class="info-item"><span class="info-label">Replies Received</span><span class="info-val">${d.replies_received}</span></div>
            <div class="info-item" style="margin-top:10px;"><span class="info-label">Network Authority</span><span class="info-val" style="color:var(--bitcoin-orange); font-weight:700;">${formatInfluence(d)}</span></div>
            <div class="info-item"><span class="info-label">Last Active</span><span class="info-val">${new Date(d.last_active).toLocaleDateString()}</span></div>
            <div class="info-item"><span class="info-label">Hybrid Score</span><span class="info-val" style="color:#94a3b8;">${d.hybrid_score}</span></div>
        </div>`;

    // Smooth scroll to selection info on mobile if needed
    if (window.innerWidth < 768) {
        document.getElementById('selection-panel').scrollIntoView({ behavior: 'smooth' });
    }
}

function getScore(d) { 
    if (currentFilters.view === 'all') return d.hybrid_score || 0;
    return d.scores[currentFilters.view] || 0; 
}

function getRadius(d) {
    // If backend provided a pre-scaled value, use it, otherwise fall back to legacy scaling
    if (currentFilters.view === 'all' && d.val) return d.val;
    
    const score = getScore(d);
    return Math.pow(score, 0.85) * 800 + 3;
}
function drag(simulation) {
    return d3.drag()
        .on("start", (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on("drag", (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on("end", (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; });
}

// Global initialization
document.addEventListener('DOMContentLoaded', initViz);
