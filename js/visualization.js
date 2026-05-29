/**
 * Bitcoin Technical Influence Graph - Visualization Logic
 * Using D3.js Force-Directed Graph
 */

// Domain metadata is loaded from allData.metadata.domains (embedded in network_graph.json).
// Do NOT add hardcoded domain mapping dicts here — edit metadata/expertise_domains.json instead.

// Helpers populated after data load:
let domainColorMap = {};  // id → color
let domainNameMap = {};   // id → name

function buildDomainMaps(domains) {
    domainColorMap = {};
    domainNameMap = {};
    (domains || []).forEach(d => {
        domainColorMap[d.id] = d.color;
        domainNameMap[d.id] = d.name;
    });
}

// Archetype Color Mapping
const ARCHETYPE_COLORS = {
    'Creator':              '#FFB000',
    'Protocol Designer':    '#E8916B',
    'Builder':              '#D4A298',
    'Reviewer':             '#8293AB',
    'Participant':          '#2D3748'
};

function getNodeColor(d) {
    return ARCHETYPE_COLORS[d.dev_type] || '#475569';
}

const THEME_CLUSTER_ORDER = ['Consensus', 'Script', 'L2', 'Privacy', 'Wallet', 'Mempool', 'Network', 'Mining', 'Cryptography', 'Infrastructure', 'Ecosystem', 'other'];

// Community hull palette — distinct colours that read well on a dark background.
// Each entry is the RGB triplet used with variable alpha for fills vs. strokes.
const COMMUNITY_PALETTE = [
    '239,68,68',   // red
    '59,130,246',  // blue
    '16,185,129',  // green
    '245,158,11',  // amber
    '139,92,246',  // violet
    '236,72,153',  // pink
    '6,182,212',   // cyan
    '251,191,36',  // yellow
    '249,115,22',  // orange
    '20,184,166',  // teal
];
function getCommunityColor(cid, alpha) {
    const rgb = COMMUNITY_PALETTE[(cid >= 0 ? cid : 0) % COMMUNITY_PALETTE.length];
    return `rgba(${rgb},${alpha})`;
}

let allData, nodes, links, simulation, rankMap = new Map();
let currentFilters = { view: 'all', theme: 'all', archetype: 'all', search: '', bip: '' };
let totalPopulation = 0;
let selectedNode = null;
// 'social' = Louvain community clusters (who talks to whom)
// 'domain' = topic ring clusters (what they work on)
let clusterMode = 'social';
let communityPositions = {}; // community_id -> {x, y} centroid, computed from layout positions
let expertiseCommunityPositions = {}; // expertise_community_id -> {x, y} centroid

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

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const DATA_BASE = isLocal 
        ? "output/" 
        : "https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/";

    const graphPath = DATA_BASE + "network/network_graph.json";

    // network_graph.json is self-contained: n.id is the canonical uuid,
    // display_name is embedded. No second fetch needed.
    d3.json(graphPath).then((data) => {
        allData = data;
        totalPopulation = data.metadata?.total_population || data.nodes.length;
        buildDomainMaps(data.metadata?.domains);

        document.getElementById('total-pop').innerText = totalPopulation.toLocaleString();
        document.getElementById('viz-count').innerText = data.nodes.length.toLocaleString();

        allData.nodes.forEach(n => {
            // Use first expertise_domain as the node's theme; fall back to top_category slug.
            n.theme = (n.expertise_domains && n.expertise_domains[0]) || n.top_category || 'other';
            // n.id is already the canonical uuid — use it directly for directory deep-links
            n.uuid = n.id;
        });

        // Set initial positions from the pre-computed spring layout so D3 starts
        // from a topology-aware arrangement rather than random placement.
        updateDimensions();
        const layoutMargin = 0.12;
        const usableW = width * (1 - 2 * layoutMargin);
        const usableH = height * (1 - 2 * layoutMargin);
        allData.nodes.forEach(n => {
            if (n.layout_x !== undefined && n.layout_y !== undefined) {
                n.x = (n.layout_x + 1) / 2 * usableW + width * layoutMargin;
                n.y = (n.layout_y + 1) / 2 * usableH + height * layoutMargin;
            }
        });

        // Pre-compute community centroids from initial layout positions.
        // These are fixed reference points that the community cluster force pulls toward.
        communityPositions = {};
        allData.nodes.forEach(n => {
            const cid = n.community_id;
            if (cid === undefined || cid === null || cid < 0) return;
            if (!communityPositions[cid]) communityPositions[cid] = { x: 0, y: 0, count: 0 };
            communityPositions[cid].x += n.x || width / 2;
            communityPositions[cid].y += n.y || height / 2;
            communityPositions[cid].count++;
        });
        Object.keys(communityPositions).forEach(cid => {
            const c = communityPositions[cid];
            c.x /= c.count;
            c.y /= c.count;
        });

        // Pre-compute expertise community centroids.
        expertiseCommunityPositions = {};
        allData.nodes.forEach(n => {
            const ecid = n.expertise_community_id;
            if (ecid === undefined || ecid === null || ecid < 0) return;
            if (!expertiseCommunityPositions[ecid]) expertiseCommunityPositions[ecid] = { x: 0, y: 0, count: 0 };
            expertiseCommunityPositions[ecid].x += n.x || width / 2;
            expertiseCommunityPositions[ecid].y += n.y || height / 2;
            expertiseCommunityPositions[ecid].count++;
        });
        Object.keys(expertiseCommunityPositions).forEach(ecid => {
            const c = expertiseCommunityPositions[ecid];
            c.x /= c.count;
            c.y /= c.count;
        });

        updateViz();
        setupEventListeners();
    }).catch(error => {
        console.error("Error loading data:", error);
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
        if (btn.attr("data-archetype")) currentFilters.archetype = btn.attr("data-archetype");

        updateViz();
    });

    const unifiedInput = document.getElementById('unified-search');
    if (unifiedInput) {
        unifiedInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            
            // Check if value is a number or starts with bip/BIP and a number
            let bipMatch = val.match(/^(?:bip)?\s*-?\s*(\d+)$/i);
            
            if (bipMatch) {
                currentFilters.bip = bipMatch[1];
                currentFilters.search = '';
            } else {
                currentFilters.bip = '';
                currentFilters.search = val;
            }
            updateViz();
        });
    }

    document.getElementById('zoom-in').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 1.5);
    document.getElementById('zoom-out').onclick = () => svg.transition().duration(300).call(zoom.scaleBy, 0.6);
    document.getElementById('reset').onclick = () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);

    // Cluster mode toggle
    document.getElementById('cluster-social').onclick = () => {
        clusterMode = 'social';
        document.getElementById('cluster-social').classList.add('active');
        document.getElementById('cluster-expertise').classList.remove('active');
        document.getElementById('cluster-domain').classList.remove('active');
        updateViz();
    };
    document.getElementById('cluster-expertise').onclick = () => {
        clusterMode = 'expertise';
        document.getElementById('cluster-expertise').classList.add('active');
        document.getElementById('cluster-social').classList.remove('active');
        document.getElementById('cluster-domain').classList.remove('active');
        updateViz();
    };
    document.getElementById('cluster-domain').onclick = () => {
        clusterMode = 'domain';
        document.getElementById('cluster-domain').classList.add('active');
        document.getElementById('cluster-social').classList.remove('active');
        document.getElementById('cluster-expertise').classList.remove('active');
        updateViz();
    };

    // Clear selection on background click
    svg.on("click", (e) => {
        if (e.target.tagName !== 'circle') {
            selectedNode = null;
            document.getElementById('selection-panel').style.display = 'none';
            d3.selectAll(".node").style("opacity", 1);
            d3.selectAll(".link")
                .style("stroke-opacity", d => Math.min(0.4, 0.05 + d.weight * 0.05))
                .style("stroke-width", d => Math.sqrt(d.weight) * 0.5);
        }
    });

    window.onresize = () => {
        updateDimensions();
        if (simulation) {
            simulation.force("center", d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }
    };
}

function updateViz() {
    if (!allData) return;

    nodes = allData.nodes.filter(n => {
        const score = getScore(n);
        if (currentFilters.theme !== 'all') {
            // Threshold-based: include contributor if they have ≥5% expertise share
            // in the selected domain, so secondary/tertiary specialists show up.
            if (((n.expertise_domain_scores || {})[currentFilters.theme] || 0) <= 0.05) return false;
        }
        if (currentFilters.archetype !== 'all' && n.dev_type !== currentFilters.archetype) return false;
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

    rankMap = buildRankMap(allData.nodes);

    document.getElementById('node-count').innerText = nodes.length;
    render();
    if (currentFilters.search) highlightSearch();
}

function highlightSearch() {
    const term = currentFilters.search;
    g.selectAll("circle")
        .style("stroke", n => n.id.toLowerCase().includes(term) && term !== '' ? "var(--text-primary)" : "var(--bg-secondary)")
        .style("stroke-width", n => n.id.toLowerCase().includes(term) && term !== '' ? 2 : 0.5)
        .attr("r", n => {
            const base = getRadius(n);
            return n.id.toLowerCase().includes(term) && term !== '' ? base * 1.5 : base;
        });
}

function formatInfluence(n) {
    const rank = rankMap.get(n.id) || 9999;
    return rank !== 9999
        ? `Rank #${rank}`
        : n.dev_type === 'Silent Contributor'
            ? "Technical Contributor"
            : "Active Participant";
}

function buildRankMap(nodesToRank) {
    const sorted = [...nodesToRank].sort((a, b) => {
        const diff = getScore(b) - getScore(a);
        if (diff !== 0) return diff;
        return (a.id || '').localeCompare(b.id || '');
    });
    const map = new Map();
    sorted.forEach((node, index) => {
        map.set(node.id, index + 1);
    });
    return map;
}

function render() {
    g.selectAll("*").remove();
    if (simulation) simulation.stop();

    const chargeStrength = -150 - Math.min(nodes.length, 200) * 0.25;

    // Cluster force target: community centroid (social/expertise mode) or topic ring (domain mode).
    function clusterTarget(d, axis) {
        if (clusterMode === 'social' && d.community_id >= 0) {
            const cp = communityPositions[d.community_id];
            if (cp) return axis === 'x' ? cp.x : cp.y;
        }
        if (clusterMode === 'expertise' && d.expertise_community_id >= 0) {
            const cp = expertiseCommunityPositions[d.expertise_community_id];
            if (cp) return axis === 'x' ? cp.x : cp.y;
        }
        const pos = getClusterPosition(d);
        return axis === 'x' ? pos.x : pos.y;
    }
    const clusterStrength = clusterMode === 'domain' ? 0.05 : 0.15;

    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(45))
        .force("charge", d3.forceManyBody().strength(chargeStrength))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(d => clusterTarget(d, 'x')).strength(clusterStrength))
        .force("y", d3.forceY(d => clusterTarget(d, 'y')).strength(clusterStrength))
        .force("collision", d3.forceCollide().radius(d => getRadius(d) + 2))
        .force("bound", forceBox(width, height));

    // --- Community hull layer (drawn first, behind links and nodes) ---
    // In social mode: group by who-talks-to-whom (time-decay Louvain).
    // In expertise mode: group by topic specialization (cosine-similarity Louvain).
    const communityField = clusterMode === 'expertise' ? 'expertise_community_id' : 'community_id';
    const communityLabelField = clusterMode === 'expertise' ? 'expertise_community_label' : 'community_label';
    const activeCommunityPositions = clusterMode === 'expertise' ? expertiseCommunityPositions : communityPositions;

    const communityIds = [...new Set(
        nodes.map(n => n[communityField]).filter(c => c !== undefined && c !== null && c >= 0)
    )];
    const hullGroup = g.append("g").attr("class", "community-hulls");
    // Show hulls in social and expertise modes; hide in domain mode (topic ring handles grouping there)
    hullGroup.attr("display", clusterMode === 'domain' ? "none" : null);

    const hullPaths = hullGroup.selectAll("path")
        .data(communityIds)
        .join("path")
        .attr("fill",         cid => getCommunityColor(cid, 0.07))
        .attr("stroke",       cid => getCommunityColor(cid, 0.30))
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5 3")
        .attr("stroke-linejoin", "round");

    const hullLabels = hullGroup.selectAll("text")
        .data(communityIds)
        .join("text")
        .style("font-size",       "9px")
        .style("font-weight",     "700")
        .style("fill",            cid => getCommunityColor(cid, 0.65))
        .style("text-anchor",     "middle")
        .style("pointer-events",  "none")
        .style("letter-spacing",  "0.08em");

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
        .text(d => d.display_name || d.id)
        .attr("dx", d => getRadius(d) + 3)
        .attr("dy", ".35em");

    function applyHighlight(activeNode) {
        if (!activeNode) return;
        const neighbors = new Set();
        links.forEach(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            if (sId === activeNode.id) neighbors.add(tId);
            if (tId === activeNode.id) neighbors.add(sId);
        });
        node.style("opacity", n => neighbors.has(n.id) || n.id === activeNode.id ? 1 : 0.05);
        link.style("stroke-opacity", l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === activeNode.id || tId === activeNode.id ? 0.8 : 0.02;
        })
        .style("stroke-width", l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return sId === activeNode.id || tId === activeNode.id ? 2 : 0.5;
        });
    }

    node.on("mouseover", (e, d) => {
        const _eraCommits = currentFilters.view === 'p2016' ? (d.code_stats.p2016_commits || 0)
            : currentFilters.view === 'modern' ? (d.code_stats.modern_commits || 0)
            : d.code_stats.commits;
        const _eraPosts = currentFilters.view === 'p2016' ? (d.p2016_posts || 0)
            : currentFilters.view === 'modern' ? (d.modern_posts || 0)
            : d.threads_started + d.replies_sent;
        tooltip.style("display", "block").html(`
            <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${d.display_name || d.id}</div>
            <div style="font-size:11px; font-weight:600; color:${getNodeColor(d)}; text-transform:uppercase; margin-bottom:4px;">${d.dev_type}</div>
            <div style="color:var(--text-secondary); font-size:10px;">Last Active: ${new Date(d.last_active).toLocaleDateString()}</div>
            <div style="margin-top:8px; font-size:11px; color:var(--text-secondary); border-top:1px solid var(--border); padding-top:6px;">
                Focus: <span style="color:${domainColorMap[d.theme] || 'var(--text-primary)'}; font-weight:600;">${domainNameMap[d.theme] || d.theme}</span><br>
                Code: <b>${_eraCommits}</b> commits<br>
                Social: <b>${_eraPosts}</b> posts<br>
                Influence: <span style="color:var(--bitcoin-orange); font-weight:600;">${formatInfluence(d)}</span>
            </div>
        `);

        if (!selectedNode) applyHighlight(d);
    })
        .on("mousemove", (e) => tooltip.style("left", (e.pageX + 15) + "px").style("top", (e.pageY - 15) + "px"))
        .on("mouseout", () => {
            tooltip.style("display", "none");
            if (!selectedNode) {
                node.style("opacity", 1);
                link.style("stroke-opacity", d => Math.min(0.4, 0.05 + d.weight * 0.05))
                    .style("stroke-width", d => Math.sqrt(d.weight) * 0.5);
            } else {
                applyHighlight(selectedNode);
            }
        })
        .on("click", (e, d) => {
            e.stopPropagation(); // prevent svg click
            selectedNode = d;
            showProfile(d);
            applyHighlight(d);
        });

    simulation.on("tick", () => {
        // Update community hulls (social and expertise modes)
        if (clusterMode !== 'domain') {
            hullPaths.attr("d", cid => {
                const pts = nodes.filter(n => n[communityField] === cid).map(n => [n.x, n.y]);
                if (pts.length < 3) return null;
                const hull = d3.polygonHull(pts);
                if (!hull) return null;
                // Compute centroid for outward padding
                const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
                const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
                const pad = 20;
                const padded = hull.map(p => {
                    const dx = p[0] - cx, dy = p[1] - cy;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    return [p[0] + dx / len * pad, p[1] + dy / len * pad];
                });
                return "M" + padded.join("L") + "Z";
            });
            hullLabels.each(function(cid) {
                const members = nodes.filter(n => n[communityField] === cid);
                if (!members.length) return;
                const cx = members.reduce((s, n) => s + n.x, 0) / members.length;
                const cy = members.reduce((s, n) => s + n.y, 0) / members.length;
                const lbl = members[0][communityLabelField] || '';
                d3.select(this).attr("x", cx).attr("y", cy).text(lbl.toUpperCase());
            });
        }
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
    });
}

function getClusterPosition(d) {
    const index = THEME_CLUSTER_ORDER.indexOf(d.theme);
    const angle = (index >= 0 ? index : THEME_CLUSTER_ORDER.length - 1) / THEME_CLUSTER_ORDER.length * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(width, height) * 0.28;
    return {
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius
    };
}

function forceBox(width, height) {
    let nodes;
    function force(alpha) {
        if (!nodes) return;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.min(width, height) * 0.48;
        nodes.forEach(d => {
            const dx = d.x - centerX;
            const dy = d.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist > maxDist) {
                const push = (dist - maxDist) * 0.003 * alpha;
                d.vx -= (dx / dist) * push;
                d.vy -= (dy / dist) * push;
            }
        });
    }
    force.initialize = function(_) { nodes = _; };
    return force;
}

function showProfile(d) {
    document.getElementById('selection-panel').style.display = 'block';
    const srcClass = d.dominant_source === 'delving' ? 'tag-delving' : (d.dominant_source === 'mailing_list' ? 'tag-ml' : 'tag-mixed');
    // Expertise chips from synthesized expertise_domains
    const domains = d.expertise_domains || [];
    let expertiseHtml = domains.map(domId => {
        const color = domainColorMap[domId] || '#444';
        const label = domainNameMap[domId] || domId;
        return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44;margin:2px 2px 2px 0;">${label}</span>`;
    }).join('');

    let bipsHtml = d.bips.length > 0 ? d.bips.map(b => `<span class="bip-chip">BIP ${b}</span>`).join('') : '<span style="color:var(--text-secondary); font-size:11px;">None cited</span>';
    const rank = rankMap.get(d.id) || 'N/A';
    const color = getNodeColor(d);

    document.getElementById('selection-content').innerHTML = `
        <div style="border-left: 3px solid ${color}; padding-left: 16px; margin-left: -4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; gap:6px;">
                    <span class="tag ${srcClass}">${d.dominant_source.replace('_', ' ')}</span>
                    ${d.growth > 1.5 ? `<span class="tag" style="color:var(--primary); border:1px solid var(--primary); font-size: 9px; background: rgba(232, 145, 107, 0.05);">↑ Rising</span>` : ''}
                </div>
                <div style="font-size:10px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">
                    Authority #${rank}
                </div>
            </div>

            <div style="font-size:22px; font-weight:800; margin-bottom:2px; letter-spacing:-0.01em; color:var(--text-primary);">${d.display_name || d.id}</div>
            <div style="font-size:11px; color:var(--text-secondary); font-weight:500; margin-bottom:18px;">
                <span style="color:${color}; font-weight:700;">${d.dev_type}</span> • ${d.theme} Specialist
            </div>

            <div style="display:flex; gap:20px; margin-bottom:20px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border-subtle);">
                ${(() => {
                    const eraLabel = currentFilters.view === 'p2016' ? ' 2016+' : currentFilters.view === 'modern' ? ' 3yr' : '';
                    const eraCommits = currentFilters.view === 'p2016' ? (d.code_stats.p2016_commits || 0)
                        : currentFilters.view === 'modern' ? (d.code_stats.modern_commits || 0)
                        : d.code_stats.commits;
                    const eraReviews = currentFilters.view === 'p2016' ? (d.p2016_reviews_count || 0)
                        : currentFilters.view === 'modern' ? (d.modern_reviews_count || 0)
                        : (d.reviews_count || 0);
                    const eraLabelHtml = eraLabel ? `<span style="font-size:7px; opacity:0.65; display:block;">(${eraLabel.trim()})</span>` : '';
                    return `
                    <div>
                        <div style="font-size:9px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Commits${eraLabelHtml}</div>
                        <div style="font-size:15px; font-weight:700; color:var(--primary);">${eraCommits.toLocaleString()}</div>
                    </div>
                    <div style="border-left: 1px solid var(--border-subtle);"></div>
                    <div>
                        <div style="font-size:9px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Reviews${eraLabelHtml}</div>
                        <div style="font-size:15px; font-weight:700; color:var(--text-primary);">${eraReviews.toLocaleString()}</div>
                    </div>
                    <div style="border-left: 1px solid var(--border-subtle);"></div>
                    <div>
                        <div style="font-size:9px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Auth Score</div>
                        <div style="font-size:15px; font-weight:700; color:var(--text-primary);">${formatInfluence(d)}</div>
                    </div>`;
                })()}
            </div>

            ${d.uuid ? `
            <div style="margin-bottom: 20px;">
                <a href="directory.html?uuid=${d.uuid}" class="btn-primary" style="display: block; width: 100%; text-align: center; padding: 10px; font-weight: 700; text-decoration: none; font-size: 12px; letter-spacing: 0.5px;">
                    <i class="fas fa-user-circle"></i> VIEW FULL PROFILE
                </a>
            </div>
            ` : ''}

            <div class="expertise-label" style="font-size:10px; margin-bottom:8px;">Technical Fingerprint</div>
            <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--border-subtle); margin-bottom:20px;">
                ${expertiseHtml}
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <div class="expertise-label" style="font-size:10px; margin-bottom:6px;">Protocol Assets</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${bipsHtml}
                        ${d.code_stats.is_maintainer ? '<span class="bip-chip" style="background:rgba(16, 185, 129, 0.1); color:#10b981; border-color:rgba(16, 185, 129, 0.2); font-size:9px;">MAINTAINER</span>' : ''}
                    </div>
                </div>
                <div style="font-size:10px; color:var(--text-secondary); text-align:right;">
                    Active ${new Date(d.last_active).toLocaleDateString(undefined, {month:'short', year:'2-digit'})}
                </div>
            </div>
        </div>`;

    // Smooth scroll to selection info on mobile if needed
    if (window.innerWidth < 768) {
        document.getElementById('selection-panel').scrollIntoView({ behavior: 'smooth' });
    }
}

function getScore(d) {
    let base;
    if (currentFilters.view === 'all') {
        base = d.hybrid_score;
    } else if (currentFilters.view === 'p2016') {
        base = d.p2016_hybrid_score;
    } else if (currentFilters.view === 'modern') {
        base = d.modern_hybrid_score;
    } else {
        base = 0;
    }
    // When filtering by domain, weight by domain share so rankings reflect
    // authority within that domain rather than global influence.
    if (currentFilters.theme !== 'all') {
        return base * (d.expertise_domain_scores[currentFilters.theme] || 0.01);
    }
    return base;
}

function getRadius(d) {
    if (currentFilters.view === 'all') return d.val;
    if (currentFilters.view === 'p2016') return (d.p2016_hybrid_score * 10) + 2;
    if (currentFilters.view === 'modern') return (d.modern_hybrid_score * 10) + 2;
    return 2;
}
function drag(simulation) {
    return d3.drag()
        .on("start", (e) => { if (!e.active) simulation.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on("drag", (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on("end", (e) => { if (!e.active) simulation.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; });
}

// Global initialization
document.addEventListener('DOMContentLoaded', initViz);
