/**
 * Contributor Directory - Logic for fetching and rendering the contributor index.
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const DATA_BASE_URL = isLocal 
    ? 'output/shared/contributors/' 
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/contributors/';
const REGISTRY_URL = DATA_BASE_URL + 'registry_index.json';
const PROFILE_BASE_URL = DATA_BASE_URL + 'profiles/';

let allContributors = [];
let filteredContributors = [];
let currentSort = { col: 'impact_score', dir: 'desc' };
let currentPage = 1;
let currentFilterView = 'all';
let currentSearchTerm = '';
let currentRoleFilter = 'all';
let currentFocusFilter = 'all';
let datasetLatestDate = 0;
const THREE_YEARS = 3 * 365 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;

// Archetype colors — kept in sync with visualization.js for consistency across all three pages
// 4 roles + Creator — kept in sync with visualization.js and influence.py archetypes.
const ARCHETYPE_COLORS = {
    'Creator':           '#E8916B',  // Bitcoin orange — matches theme accent
    'Protocol Designer': '#8a7a5f',  // Warm bronze — matches text-secondary
    'Builder':           '#f59e0b',  // Amber — matches script color
    'Reviewer':          '#10b981',  // Green — matches L2 color
    'Participant':       '#94A3B8',  // Slate — neutral gray
};

// Commit category colors — identical to orange-dev-tracker/js/theme.js categoryColors
const CATEGORY_COLORS = {
    'Consensus (Domain Logic)':      '#E07A5F',
    'Cryptography (Primitives)':     '#C53030',
    'Core Libs':                     '#F6AD55',
    'Node & RPC (App/Interface)':    '#ED8936',
    'GUI (Presentation Layer)':      '#F4A261',
    'Wallet (Client App)':           '#D69E2E',
    'P2P Network (Infrastructure)':  '#2B6CB0',
    'Database (Persistence)':        '#4A5568',
    'Utilities (Shared Libs)':       '#9F86C0',
    'Tests (QA)':                    '#81B29A',
    'Build & CI (DevOps)':           '#3D405B',
    'Documentation':                 '#F2CC8F',
    'Merge':                         '#94A3B8',
};

// Ghibli palette for social topic trends — matches orange-dev-tracker/js/theme.js fallback
const GHIBLI_PALETTE = [
    '#7BA9CC','#B9D4E7','#5B8266','#A2C5AC','#E07A5F','#F4A261',
    '#D4AF37','#E9C46A','#6D597A','#B5838D','#3E6073','#8BBEE8',
    '#89B449','#C5D86D','#E27396','#FFB3C1','#585123','#DDA15E',
    '#384D48','#ACD7EC'
];

// Domain labels are loaded from registry_index.json metadata.domains.
// Do NOT add hardcoded label maps here — edit metadata/expertise_domains.json instead.
let DOMAIN_COLOR_MAP = {};  // id → color
let DOMAIN_NAME_MAP  = {};  // id → name
function buildRegistryDomainMaps(domains) {
    DOMAIN_COLOR_MAP = {};
    DOMAIN_NAME_MAP = {};
    (domains || []).forEach(d => {
        DOMAIN_COLOR_MAP[d.id] = d.color;
        DOMAIN_NAME_MAP[d.id]  = d.name;
    });
}

// BIP status pill colors
const BIP_STATUS_COLORS = {
    'Final':     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Active':    { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Proposed':  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'Draft':     { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
    'Withdrawn': { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    'Rejected':  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    'Replaced':  { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
    'Obsolete':  { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
};

// ── ECharts lazy loader ────────────────────────────────────────────────────────
// Loads echarts@5 from CDN exactly once regardless of how many modals are opened.
let _echartsLoadPromise = null;
function loadECharts() {
    if (_echartsLoadPromise) return _echartsLoadPromise;
    if (window.echarts) { _echartsLoadPromise = Promise.resolve(); return _echartsLoadPromise; }
    _echartsLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
        s.onload = resolve;
        s.onerror = () => { _echartsLoadPromise = null; reject(new Error('ECharts CDN load failed')); };
        document.head.appendChild(s);
    });
    return _echartsLoadPromise;
}

// Hold active chart instances so they can be disposed when the modal closes
let _activeProfileCharts = [];
function disposeProfileCharts() {
    _activeProfileCharts.forEach(c => { try { c.dispose(); } catch(e) {} });
    _activeProfileCharts = [];
}

function getArchetypeColor(devType) {
    return ARCHETYPE_COLORS[devType] || '#475569';
}

// Returns { date, source } for First/Last Active labels
// Compares commit vs social dates so the UI can show where the person was first/last seen
function formatActiveDate(p, which) {
    const globalDate = which === 'first' ? p.global_first_active : p.global_last_active;
    const commitDate = which === 'first' ? p.first_commit    : p.last_commit;
    const socialDate = which === 'first' ? p.first_active    : p.last_active;

    if (!globalDate) return { date: '-', source: '' };

    const formatted = new Date(globalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    let source = '';
    const cd = commitDate ? new Date(commitDate) : null;
    const sd = socialDate ? new Date(socialDate) : null;
    if (cd && sd) {
        source = (which === 'first') ? (cd <= sd ? 'Commits' : 'Social') : (cd >= sd ? 'Commits' : 'Social');
    } else if (cd) {
        source = 'Commits';
    } else if (sd) {
        source = 'Social';
    }

    return { date: formatted, source };
}

// ── Profile chart rendering ────────────────────────────────────────────────────
// Called after renderProfile() injects HTML. Loads ECharts lazily then draws
// the commit-history and social-history stacked bar charts into their placeholder divs.
async function renderProfileCharts(p) {
    const hasCommitHistory = p.commit_history && Object.keys(p.commit_history).length > 0;
    const hasSocialHistory = p.social_history && Object.keys(p.social_history).length > 0;
    if (!hasCommitHistory && !hasSocialHistory) return;

    try { await loadECharts(); } catch (e) {
        console.warn('ECharts failed to load — chart sections hidden:', e);
        return;
    }

    disposeProfileCharts();

    const axisLabelStyle = { fontSize: 11, color: '#94A3B8' };
    const splitLineStyle  = { lineStyle: { color: 'rgba(148,163,184,0.12)' } };
    const gridPad = { left: 8, right: 8, top: 8, bottom: 40, containLabel: true };

    // ── Commit History by Category ────────────────────────────────────────────
    if (hasCommitHistory) {
        const el = document.getElementById('chart-commit-history');
        if (el) {
            const years = Object.keys(p.commit_history).sort();
            const allCats = new Set();
            years.forEach(y => Object.keys(p.commit_history[y]).forEach(c => allCats.add(c)));
            // Exclude Merge commits from authored view; keep all others
            const cats = Array.from(allCats).filter(c => c !== 'Merge');

            const series = cats.map(cat => ({
                name: cat,
                type: 'bar',
                stack: 'total',
                barMaxWidth: 40,
                emphasis: { focus: 'series' },
                itemStyle: { color: CATEGORY_COLORS[cat] || '#94A3B8', borderRadius: 0 },
                data: years.map(y => +(p.commit_history[y][cat] || 0).toFixed(2)),
            }));

            const chart = echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    formatter(params) {
                        const year = params[0].axisValue;
                        const rows = params.filter(p => p.value > 0)
                            .sort((a, b) => b.value - a.value)
                            .map(p => `<div style="display:flex;justify-content:space-between;gap:16px;">${p.marker}<span>${p.seriesName}</span><b>${p.value.toFixed(1)}</b></div>`)
                            .join('');
                        return `<div style="font:12px Inter,sans-serif;padding:4px;"><b style="display:block;margin-bottom:6px;">${year}</b>${rows}</div>`;
                    }
                },
                grid: gridPad,
                xAxis: { type: 'category', data: years, axisLabel: axisLabelStyle },
                yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
                series,
            });
            _activeProfileCharts.push(chart);
        }
    }

    // ── Social Activity by Topic ──────────────────────────────────────────────
    if (hasSocialHistory) {
        const el = document.getElementById('chart-social-history');
        if (el) {
            const years = Object.keys(p.social_history).sort();
            const allTopics = new Set();
            years.forEach(y => Object.keys(p.social_history[y]).forEach(t => allTopics.add(t)));
            const topics = Array.from(allTopics);

            const series = topics.map((topic, idx) => ({
                name: DOMAIN_NAME_MAP[topic] || topic,
                type: 'bar',
                stack: 'total',
                barMaxWidth: 40,
                emphasis: { focus: 'series' },
                itemStyle: { color: GHIBLI_PALETTE[idx % GHIBLI_PALETTE.length], borderRadius: 0 },
                data: years.map(y => p.social_history[y][topic] || 0),
            }));

            const chart = echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    formatter(params) {
                        const year = params[0].axisValue;
                        const rows = params.filter(p => p.value > 0)
                            .sort((a, b) => b.value - a.value)
                            .map(p => `<div style="display:flex;justify-content:space-between;gap:16px;">${p.marker}<span>${p.seriesName}</span><b>${p.value}</b></div>`)
                            .join('');
                        return `<div style="font:12px Inter,sans-serif;padding:4px;"><b style="display:block;margin-bottom:6px;">${year}</b>${rows}</div>`;
                    }
                },
                grid: gridPad,
                xAxis: { type: 'category', data: years, axisLabel: axisLabelStyle },
                yAxis: { type: 'value', axisLabel: axisLabelStyle, splitLine: splitLineStyle },
                series,
            });
            _activeProfileCharts.push(chart);
        }
    }
}

async function initDirectory() {
    // Check URL for uuid param to support direct deep-linking from network graph
    const params = new URLSearchParams(window.location.search);
    const directUuid = params.get('uuid');
    try {
        const response = await fetch(REGISTRY_URL);
        const data = await response.json();
        buildRegistryDomainMaps(data.metadata?.domains);
        allContributors = data.contributors.map(c => {
            if (c.global_last_active) {
                const d = new Date(c.global_last_active).getTime();
                if (d > datasetLatestDate) datasetLatestDate = d;
            }
            return {
                ...c,
                ml_total: (c.ml_threads || 0) + (c.ml_responses || 0),
                delving_total: (c.delving_threads || 0) + (c.delving_responses || 0)
            };
        });

        // Initial filter & sort
        filteredContributors = [...allContributors];
        currentPage = 1;
        populateDirectoryFilters();
        sortData();
        renderTable();

        setupListeners();
        updateSortIcons();

        if (directUuid) {
            window.location.href = 'profile.html?uuid=' + encodeURIComponent(directUuid);
        }
    } catch (error) {
        console.error("Failed to load directory data:", error);
        document.getElementById('contributor-list').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-consensus);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 12px;"></i>
                    <p>Failed to load the index. Please check your connection or try again later.</p>
                </td>
            </tr>
        `;
    }
}

function setupListeners() {
    // Active Filter Toggle
    document.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilterView = e.currentTarget.dataset.filter;
            // Retrigger filter
            document.getElementById('directory-search').dispatchEvent(new Event('input'));
        });
    });

    // Search
    document.getElementById('directory-search').addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        applyDirectoryFilters();
    });

    const roleFilter = document.getElementById('role-filter');
    if (roleFilter) {
        roleFilter.addEventListener('change', (e) => {
            currentRoleFilter = e.target.value;
            applyDirectoryFilters();
        });
    }

    const focusFilter = document.getElementById('focus-filter');
    if (focusFilter) {
        focusFilter.addEventListener('change', (e) => {
            currentFocusFilter = e.target.value;
            applyDirectoryFilters();
        });
    }

    // Sorting
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.col === col) {
                currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
            } else {
                currentSort.col = col;
                currentSort.dir = ['display_name'].includes(col) ? 'asc' : 'desc';
            }

            updateSortIcons();
            currentPage = 1;
            sortData();
            renderTable();
        });
    });

    // Modal close
    document.querySelector('.close-modal').onclick = () => {
        document.getElementById('profile-modal').style.display = "none";
        document.body.style.overflow = "auto";
        disposeProfileCharts();
    };

    window.onclick = (event) => {
        const modal = document.getElementById('profile-modal');
        if (event.target == modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
            disposeProfileCharts();
        }
    };
}

function populateDirectoryFilters() {
    const roleEl = document.getElementById('role-filter');
    const focusEl = document.getElementById('focus-filter');
    if (!roleEl || !focusEl) return;

    const roleSet = new Set();
    const focusSet = new Set();

    allContributors.forEach(c => {
        if (c.dev_type) roleSet.add(c.dev_type);
    });

    const roles = Array.from(roleSet).sort((a, b) => a.localeCompare(b));
    // Use registry metadata domains (DOMAIN_NAME_MAP) for focus options so all domains
    // are available with proper human-readable names, not just top-3 from contributor records.
    const domainEntries = Object.entries(DOMAIN_NAME_MAP).sort((a, b) => a[1].localeCompare(b[1]));

    roleEl.innerHTML = '<option value="all">All Roles</option>' + roles.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
    focusEl.innerHTML = '<option value="all">All Focus Areas</option>' + domainEntries.map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join('');
}

function applyDirectoryFilters() {
    filteredContributors = allContributors.filter(c => {
        const term = currentSearchTerm;
        const nameMatch = (c.display_name || '').toLowerCase().includes(term);
        const loginMatch = (c.github && c.github.login) ? c.github.login.toLowerCase().includes(term) : false;
        // Use expertise_domain_scores for text search — any domain with >1% score matches
        const domainMatchNames = Object.entries(c.expertise_domain_scores || {})
            .filter(([, v]) => v > 0.01)
            .map(([id]) => (DOMAIN_NAME_MAP[id] || id).toLowerCase());
        const focusMatch = domainMatchNames.some(n => n.includes(term));
        const textMatch = nameMatch || loginMatch || focusMatch;

        let activeMatch = true;
        if (currentFilterView === 'modern') {
            // "Last 3yr" era: limit to contributors active within the last 3 years
            if (!c.global_last_active) activeMatch = false;
            else {
                const cDate = new Date(c.global_last_active).getTime();
                if (datasetLatestDate - cDate > THREE_YEARS) activeMatch = false;
            }
        }

        const roleMatch = currentRoleFilter === 'all' || (c.dev_type || '') === currentRoleFilter;
        // Domain authority = era_hybrid_score × expertise_domain_scores[domain], computed on-the-fly.
        // Uses the era-appropriate hybrid score so p2016/modern views rank contributors correctly.
        const eraHybrid = currentFilterView === 'p2016' ? (c.p2016_hybrid_score || 0)
            : currentFilterView === 'modern' ? (c.modern_hybrid_score || 0)
            : (c.hybrid_score || 0);
        const focusSelectionMatch = currentFocusFilter === 'all' ||
            (eraHybrid * ((c.expertise_domain_scores || {})[currentFocusFilter] || 0)) > 0.01;

        return textMatch && activeMatch && roleMatch && focusSelectionMatch;
    });

    currentPage = 1;
    sortData();
    renderTable();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateSortIcons() {
    document.querySelectorAll('th.sortable').forEach(th => {
        const icon = th.querySelector('i');
        if (th.dataset.sort === currentSort.col) {
            icon.className = currentSort.dir === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
}

function sortData() {
    filteredContributors.sort((a, b) => {
        // When a domain filter is active, primary sort is by domain authority:
        // hybrid_score × expertise_domain_scores[domain], computed on-the-fly.
        // This weights Pieter Wuille's Mempool presence (3.79 × 0.112 = 0.42) above a
        // Mempool-only contributor with low overall influence (0.2 × 0.9 = 0.18).
        if (currentFocusFilter !== 'all') {
            const eraA = currentFilterView === 'p2016' ? (a.p2016_hybrid_score || 0)
                : currentFilterView === 'modern' ? (a.modern_hybrid_score || 0) : (a.hybrid_score || 0);
            const eraB = currentFilterView === 'p2016' ? (b.p2016_hybrid_score || 0)
                : currentFilterView === 'modern' ? (b.modern_hybrid_score || 0) : (b.hybrid_score || 0);
            const authA = eraA * ((a.expertise_domain_scores || {})[currentFocusFilter] || 0);
            const authB = eraB * ((b.expertise_domain_scores || {})[currentFocusFilter] || 0);
            if (authA !== authB) return authB - authA;
        }
        // For Impact/Commits columns, map to era-appropriate fields
        let valA = currentSort.col === 'impact_score' && currentFilterView === 'p2016' ? (a.p2016_impact_score || 0)
            : currentSort.col === 'impact_score' && currentFilterView === 'modern' ? (a.modern_impact_score || 0)
            : currentSort.col === 'authored_commits' && currentFilterView === 'p2016' ? (a.p2016_authored_commits || 0)
            : currentSort.col === 'authored_commits' && currentFilterView === 'modern' ? (a.modern_authored_commits || 0)
            : currentSort.col === 'bips_authored' && currentFilterView === 'p2016' ? (a.p2016_bips_authored || 0)
            : currentSort.col === 'bips_authored' && currentFilterView === 'modern' ? (a.modern_bips_authored || 0)
            : a[currentSort.col];
        let valB = currentSort.col === 'impact_score' && currentFilterView === 'p2016' ? (b.p2016_impact_score || 0)
            : currentSort.col === 'impact_score' && currentFilterView === 'modern' ? (b.modern_impact_score || 0)
            : currentSort.col === 'authored_commits' && currentFilterView === 'p2016' ? (b.p2016_authored_commits || 0)
            : currentSort.col === 'authored_commits' && currentFilterView === 'modern' ? (b.modern_authored_commits || 0)
            : currentSort.col === 'bips_authored' && currentFilterView === 'p2016' ? (b.p2016_bips_authored || 0)
            : currentSort.col === 'bips_authored' && currentFilterView === 'modern' ? (b.modern_bips_authored || 0)
            : b[currentSort.col];

        // Handle nested github login for display_name sort if needed, 
        // but display_name is already at top level

        // Handle nulls/NaNs
        if (valA === null || (typeof valA === 'number' && isNaN(valA))) valA = -1;
        if (valB === null || (typeof valB === 'number' && isNaN(valB))) valB = -1;

        if (typeof valA === 'string') {
            return currentSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return currentSort.dir === 'asc' ? valA - valB : valB - valA;
        }
    });
}

function renderTable() {
    const list = document.getElementById('contributor-list');
    const pagination = document.getElementById('pagination-controls');
    const total = filteredContributors.length;
    if (total === 0) {
        list.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-secondary);">No contributors match your search.</td></tr>`;
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredContributors.slice(startIndex, startIndex + PAGE_SIZE);

    // All three eras use the 0–100 saturation-curve impact score, so the bar
    // always fills relative to 100 (not relative to the filtered-set max).
    const maxEraScore = 100;

    // Update column headers to reflect current era
    const impactTh = document.querySelector('th[data-sort="impact_score"]');
    if (impactTh) impactTh.innerHTML = (currentFilterView === 'p2016' ? '2016+ Score'
        : currentFilterView === 'modern' ? '3yr Score' : 'Impact') + ' <i class="fas fa-sort"></i>';
    const commitsTh = document.querySelector('th[data-sort="authored_commits"]');
    if (commitsTh) {
        const eraLabel = currentFilterView === 'p2016' ? ' (2016+)' : currentFilterView === 'modern' ? ' (3yr)' : '';
        commitsTh.innerHTML = `Authored Commits${eraLabel} <i class="fas fa-sort"></i>`;
    }
    const mlTh = document.querySelector('th[data-sort="ml_total"]');
    if (mlTh) {
        if (currentFilterView === 'all') {
            mlTh.innerHTML = 'Mailing List <span style="font-size: 0.7em; opacity: 0.6; font-weight: 400;">(T/R)</span> <i class="fas fa-sort"></i>';
        } else {
            const eraLabel = currentFilterView === 'p2016' ? '2016+' : '3yr';
            mlTh.innerHTML = `Posts <span style="font-size: 0.7em; opacity: 0.6; font-weight: 400;">(${eraLabel})</span> <i class="fas fa-sort"></i>`;
        }
    }
    const delvingTh = document.querySelector('th[data-sort="delving_total"]');
    if (delvingTh) {
        if (currentFilterView === 'all') {
            delvingTh.innerHTML = 'Delving <span style="font-size: 0.7em; opacity: 0.6; font-weight: 400;">(T/R)</span> <i class="fas fa-sort"></i>';
        } else {
            const eraLabel = currentFilterView === 'p2016' ? '2016+' : '3yr';
            delvingTh.innerHTML = `Delving <span style="font-size: 0.7em; opacity: 0.6; font-weight: 400;">(${eraLabel})</span> <i class="fas fa-sort"></i>`;
        }
    }
    const bipsTh = document.querySelector('th[data-sort="bips_authored"]');
    if (bipsTh) {
        const eraLabel = currentFilterView === 'p2016' ? ' (2016+)' : currentFilterView === 'modern' ? ' (3yr)' : '';
        bipsTh.innerHTML = `BIPs${eraLabel} <i class="fas fa-sort"></i>`;
    }
    updateSortIcons();

    list.innerHTML = pageItems.map(c => {
        // Removed live GitHub avatar fetching based on user request to improve performance and reliability
        const avatarPlaceholder = `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`;

        let impactPct, impactDisplay;
        if (currentFilterView === 'p2016') {
            const eScore = c.p2016_impact_score != null ? Number(c.p2016_impact_score) : 0;
            impactPct = Math.min(100, eScore);
            impactDisplay = eScore > 0 ? eScore : '-';
        } else if (currentFilterView === 'modern') {
            const eScore = c.modern_impact_score != null ? Number(c.modern_impact_score) : 0;
            impactPct = Math.min(100, eScore);
            impactDisplay = eScore > 0 ? eScore : '-';
        } else {
            const impact = c.impact_score != null ? Number(c.impact_score) : 0;
            impactPct = Math.min(100, impact);
            impactDisplay = c.dev_type === 'Creator' ? 'Creator' : (impact > 0 ? impact : '-');
        }

        const badges = (c.roles || []).map(r => `<span class="mini-badge ${r.toLowerCase()}">${r}</span>`).join('');
        const archetypeColor = getArchetypeColor(c.dev_type);
        const archetypeBadge = c.dev_type
            ? `<span class="mini-badge" style="background:${archetypeColor}22; color:${archetypeColor}; border:1px solid ${archetypeColor}44; font-size:10px;">${c.dev_type}</span>`
            : '';

        // Social columns: era-specific source-split counts or all-time threads/responses
        let socialMlHtml, socialDelvingHtml;
        if (currentFilterView === 'p2016') {
            const mlPosts = c.p2016_ml_posts || 0;
            const delvingPosts = c.p2016_delving_posts || 0;
            socialMlHtml = `<span>${mlPosts}</span>`;
            socialDelvingHtml = `<span>${delvingPosts}</span>`;
        } else if (currentFilterView === 'modern') {
            const mlPosts = c.modern_ml_posts || 0;
            const delvingPosts = c.modern_delving_posts || 0;
            socialMlHtml = `<span>${mlPosts}</span>`;
            socialDelvingHtml = `<span>${delvingPosts}</span>`;
        } else {
            const ml_threads = c.ml_threads || 0;
            const ml_responses = c.ml_responses || 0;
            const delving_threads = c.delving_threads || 0;
            const delving_responses = c.delving_responses || 0;
            socialMlHtml = `<span>${ml_threads}</span><span style="opacity: 0.4; font-size: 0.8em; margin: 0 2px;">/</span><span>${ml_responses}</span>`;
            socialDelvingHtml = `<span>${delving_threads}</span><span style="opacity: 0.4; font-size: 0.8em; margin: 0 2px;">/</span><span>${delving_responses}</span>`;
        }

        return `
            <tr onclick="showProfile('${c.uuid}')">
                <td>
                    <div class="contributor-cell">
                        ${avatarPlaceholder}
                        <div class="contributor-info">
                            <span class="contributor-name">${c.display_name}</span>
                            <div class="badge-list">${badges}${archetypeBadge}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="impact-cell" style="width: 100%;">
                        <span class="impact-val">${impactDisplay}</span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${impactPct}%"></div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center; font-weight: 600;">${currentFilterView === 'p2016' ? (c.p2016_authored_commits?.toLocaleString() || 0) : currentFilterView === 'modern' ? (c.modern_authored_commits?.toLocaleString() || 0) : (c.authored_commits?.toLocaleString() || 0)}</td>
                <td style="text-align: center; color: var(--text-secondary);">${
                    currentFilterView === 'p2016' ? (c.p2016_bips_authored || 0)
                    : currentFilterView === 'modern' ? (c.modern_bips_authored || 0)
                    : (c.bips_authored || 0)
                }</td>
                <td style="text-align: center; color: var(--text-secondary); white-space: nowrap;">
                    ${socialMlHtml}
                </td>
                <td style="text-align: center; color: var(--text-secondary); white-space: nowrap;">
                    ${socialDelvingHtml}
                </td>
                <td>
                    ${Object.entries(c.expertise_domain_scores || {})
                        .filter(([, v]) => v >= 0.05)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([d]) => {
                            const color = DOMAIN_COLOR_MAP[d] || '#94A3B8';
                            const label = DOMAIN_NAME_MAP[d] || d;
                            return `<span class="focus-tag" style="background:${color}22;color:${color};border-color:${color}44">${label}</span>`;
                        }).join(' ')}
                </td>
            </tr>
        `;
    }).join('');

    if (pagination) {
        pagination.innerHTML = `
            <div class="pagination-info">Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, total)} of ${total} contributors</div>
            <div class="pagination-actions">
                <button class="pagination-button" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <button class="pagination-button" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
                <span class="pagination-page">Page ${currentPage} of ${totalPages}</span>
            </div>
        `;
        pagination.querySelectorAll('.pagination-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'prev' && currentPage > 1) currentPage -= 1;
                if (action === 'next' && currentPage < totalPages) currentPage += 1;
                renderTable();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }
}

function showProfile(uuid) {
    window.location.href = 'profile.html?uuid=' + encodeURIComponent(uuid);
}

function renderProfile(p, isBasic = false) {
    let avatarHtml = `<div class="avatar-placeholder profile-large"><i class="fas fa-user-circle"></i></div>`;
    if (p.github && p.github.login) {
        avatarHtml = `<img src="https://github.com/${p.github.login}.png?size=100" alt="${p.display_name}" class="avatar-placeholder profile-large" style="object-fit: cover; border: 4px solid var(--bg-secondary); background: var(--card-bg);" onerror="this.outerHTML='<div class=\\'avatar-placeholder profile-large\\'><i class=\\'fas fa-user-circle\\'></i></div>'"/>`;
    }
    const roles = (p.roles || []).map(r => `<span class="mini-badge ${r.toLowerCase()}" style="font-size: 12px; padding: 4px 10px;">${r}</span>`).join('');

    const githubLink = p.github_url ? `<a href="${p.github_url}" target="_blank" class="social-link"><i class="fab fa-github"></i> GitHub</a>` : '';
    const delvingLink = p.delving_url ? `<a href="${p.delving_url}" target="_blank" class="social-link"><i class="fas fa-comments"></i> Delving Bitcoin</a>` : '';
    const archetypeColor = getArchetypeColor(p.dev_type);
    const archetypeBadge = p.dev_type
        ? `<span style="background:${archetypeColor}22; color:${archetypeColor}; border:1px solid ${archetypeColor}44; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:600;">${p.dev_type}</span>`
        : '';

    let extraStats = '';
    if (!isBasic) {
        extraStats = `
            <div class="profile-stats-grid">
                <div class="profile-stat-item">
                    <span class="stat-label">Mailing List</span>
                    <span class="stat-value">${(p.ml_threads || 0) + (p.ml_responses || 0)}</span>
                </div>
                <div class="profile-stat-item">
                    <span class="stat-label">Delving Bitcoin</span>
                    <span class="stat-value">${(p.delving_threads || 0) + (p.delving_responses || 0)}</span>
                </div>
                <div class="profile-stat-item">
                    <span class="stat-label">Reviews</span>
                    <span class="stat-value">${p.reviews_count || 0}</span>
                </div>
                <div class="profile-stat-item">
                    <span class="stat-label">BIPs Authored</span>
                    <span class="stat-value">${p.bips_authored || 0}</span>
                </div>
            </div>
        `;
    }

    // ── BIPs Authored ─────────────────────────────────────────────────────────
    let bipsSection = '';
    if (!isBasic && p.bip_list && p.bip_list.length > 0) {
        const bipItems = p.bip_list.map(b => {
            const num = b.number ? String(b.number).padStart(4, '0') : '????';
            const sc  = BIP_STATUS_COLORS[b.status] || BIP_STATUS_COLORS['Draft'];
            const pill = `<span class="bip-status-pill" style="background:${sc.bg};color:${sc.color};border-color:${sc.border};">${b.status || 'Unknown'}</span>`;
            const link = b.link ? `<a href="${b.link}" target="_blank" class="bip-number">BIP-${num}</a>` : `<span class="bip-number">BIP-${num}</span>`;
            return `<li class="bip-item">${link}<span class="bip-title-text">${b.title}</span>${pill}</li>`;
        }).join('');
        bipsSection = `
            <div class="profile-section">
                <h4 class="section-label">BIPs Authored</h4>
                <ul class="bip-list">${bipItems}</ul>
            </div>`;
    }

    // ── First & Last Social Messages ───────────────────────────────────────────
    let messagesSection = '';
    if (!isBasic && (p.first_message || p.last_message)) {
        const msgCard = (msg, label) => {
            if (!msg) return '';
            const srcLabel = msg.source === 'mailing_list' ? 'Mailing List' : 'Delving Bitcoin';
            const srcCls   = msg.source === 'mailing_list' ? 'msg-src-ml' : 'msg-src-delving';
            const dateStr  = msg.date ? msg.date.slice(0, 10) : '';
            const subj     = msg.subject ? msg.subject.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '(no subject)';
            const linkEl   = msg.link
                ? `<a href="${msg.link}" target="_blank" class="msg-subject">${subj}</a>`
                : `<span class="msg-subject">${subj}</span>`;
            return `<div class="message-card">
                <div class="msg-meta"><span class="msg-label">${label}</span><span class="msg-src ${srcCls}">${srcLabel}</span><span class="msg-date">${dateStr}</span></div>
                ${linkEl}
            </div>`;
        };
        messagesSection = `
            <div class="profile-section">
                <h4 class="section-label">Social Footprint</h4>
                <div class="message-bookmarks">
                    ${msgCard(p.first_message, 'First Message')}
                    ${msgCard(p.last_message, 'Last Message')}
                </div>
            </div>`;
    }

    // ── Commit History by Category (chart placeholder) ────────────────────────
    let commitHistorySection = '';
    if (!isBasic && p.commit_history && Object.keys(p.commit_history).length > 0) {
        commitHistorySection = `
            <div class="profile-section">
                <h4 class="section-label">Commit History by Category</h4>
                <div id="chart-commit-history" style="height:260px; width:100%;"></div>
            </div>`;
    }

    // ── Social Activity by Topic (chart placeholder) ──────────────────────────
    let socialHistorySection = '';
    if (!isBasic && p.social_history && Object.keys(p.social_history).length > 0) {
        socialHistorySection = `
            <div class="profile-section">
                <h4 class="section-label">Social Activity by Topic</h4>
                <div id="chart-social-history" style="height:240px; width:100%;"></div>
            </div>`;
    }

    document.getElementById('modal-body').innerHTML = `
        <div class="profile-header-strip" style="background: linear-gradient(90deg, rgba(232, 145, 107, 0.15), rgba(232, 145, 107, 0.02)); height: 80px; border-radius: 24px 24px 0 0; border-bottom: 1px solid var(--border);"></div>
        <div class="profile-content" style="padding: 0 40px 40px 40px; margin-top: -40px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
                ${avatarHtml}
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    ${githubLink}
                    ${delvingLink}
                </div>
            </div>
            
            <h2 style="font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">${p.display_name}</h2>
            <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; align-items: center;">
                ${roles}
                ${archetypeBadge}
            </div>
            
            <div style="margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                <div>
                    <h4 style="color: var(--text-secondary); text-transform: uppercase; font-size: 11px; letter-spacing: 1px; margin-bottom: 16px;">Work & Impact</h4>
                    <div class="profile-info-row">
                        <span>Authored Commits</span>
                        <span style="font-weight: 700;">${p.authored_commits?.toLocaleString() || p.total_commits?.toLocaleString() || 0}</span>
                    </div>
                    <div class="profile-info-row">
                        <span>Merge Commits (Maintainer)</span>
                        <span style="font-weight: 700; color: var(--text-secondary);">${p.merge_commits?.toLocaleString() || 0}</span>
                    </div>
                    <div class="profile-info-row">
                        <span>Impact Score</span>
                        <span style="font-weight: 700; color: var(--bitcoin-orange);">${p.impact_score != null ? (p.dev_type === 'Creator' ? 'Creator' : Number(p.impact_score)) : '—'}</span>
                    </div>
                    <div class="profile-info-row" style="border: none;">
                        <span>Expertise Domains</span>
                        <span style="font-weight: 700;">${(p.expertise_domains || []).map(d => DOMAIN_NAME_MAP[d] || d).join(', ') || '—'}</span>
                    </div>
                </div>
                <div>
                    <h4 style="color: var(--text-secondary); text-transform: uppercase; font-size: 11px; letter-spacing: 1px; margin-bottom: 16px;">Core Stats & Efficiency</h4>
                    ${ (() => { const fa = formatActiveDate(p, 'first'); return `<div class="profile-info-row"><span>First Active</span><span style="color: var(--text-secondary);">${fa.date}${fa.source ? ` <span style="font-size:10px; opacity:0.5; margin-left:4px;">via ${fa.source}</span>` : ''}</span></div>`; })() }
                    ${ (() => { const la = formatActiveDate(p, 'last');  return `<div class="profile-info-row" style="border: none;"><span>Last Active</span><span style="color: var(--text-secondary);">${la.date}${la.source ? ` <span style="font-size:10px; opacity:0.5; margin-left:4px;">via ${la.source}</span>` : ''}</span></div>`; })() }
                    <!-- Review Reciprocity and Avg Approval Latency hidden pending further refinement -->
                </div>
            </div>
            
            ${extraStats}
            ${bipsSection}
            ${messagesSection}
            ${commitHistorySection}
            ${socialHistorySection}
        </div>
        <style>
            .profile-info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid var(--border);
                font-size: 14px;
            }
            .profile-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-top: 32px;
                background: rgba(255,255,255,0.03);
                padding: 24px;
                border-radius: 16px;
                border: 1px solid var(--border);
            }
            .profile-stat-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
                text-align: center;
            }
            .stat-label {
                font-size: 10px;
                text-transform: uppercase;
                color: var(--text-secondary);
                letter-spacing: 1px;
            }
            .stat-value {
                font-size: 18px;
                font-weight: 800;
                color: var(--text-primary);
            }
            .social-link {
                background: rgba(255,255,255,0.05);
                padding: 8px 16px;
                border-radius: 10px;
                color: var(--text-secondary);
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
                border: 1px solid var(--border);
            }
            .social-link:hover {
                background: rgba(232, 213, 176, 0.08);
                color: var(--text-primary);
                border-color: rgba(232, 213, 176, 0.2);
            }
            /* ── New enriched sections ─────────────────────────────── */
            .profile-section {
                margin-top: 28px;
                padding-top: 24px;
                border-top: 1px solid var(--border);
            }
            .section-label {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                color: var(--text-secondary);
                margin: 0 0 14px 0;
                font-weight: 600;
            }
            /* BIP list */
            .bip-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
            .bip-item { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .bip-number {
                font-size: 13px; font-weight: 700; color: #E8916B;
                text-decoration: none; white-space: nowrap;
            }
            .bip-number:hover { text-decoration: underline; }
            .bip-title-text { font-size: 13px; color: var(--text-secondary); flex: 1; min-width: 120px; }
            .bip-status-pill {
                font-size: 10px; font-weight: 700; padding: 2px 8px;
                border-radius: 6px; border: 1px solid; white-space: nowrap;
            }
            /* Message bookmarks */
            .message-bookmarks { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            @media (max-width: 640px) { .message-bookmarks { grid-template-columns: 1fr; } }
            .message-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .msg-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .msg-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); }
            .msg-src { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 5px; }
            .msg-src-ml      { background: rgba(245,158,11,0.15); color: #f59e0b; }
            .msg-src-delving { background: rgba(59,130,246,0.15);  color: #3b82f6; }
            .msg-date { font-size: 11px; color: var(--text-secondary); opacity: 0.7; margin-left: auto; }
            .msg-subject { font-size: 13px; color: var(--text-primary); text-decoration: none; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            a.msg-subject:hover { color: #E8916B; text-decoration: underline; }
        </style>
    `;

    // Kick off async chart rendering (fire-and-forget — fills placeholder divs after ECharts loads)
    renderProfileCharts(p);
}

// Global initialization
document.addEventListener('DOMContentLoaded', initDirectory);
