/**
 * Ecosystem Portal - Landing Page Logic
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SHARED_BASE = isLocal
    ? 'output/shared/'
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/';

const STATS_URL = SHARED_BASE + 'ecosystem_summary.json';
const SNAPSHOT_URL = SHARED_BASE + 'ecosystem_home_snapshot.json';

async function initLanding() {
    let stats = null;
    let snapshot = null;

    try {
        const [statsResp, snapshotResp] = await Promise.all([
            fetch(STATS_URL),
            fetch(SNAPSHOT_URL),
        ]);

        if (statsResp.ok) stats = await statsResp.json();
        if (snapshotResp.ok) snapshot = await snapshotResp.json();
    } catch (error) {
        console.error('Failed to load landing data:', error);
    }

    if (stats) {
        renderDomainSummary(stats);
    } else {
        const listEl = document.getElementById('domain-count-list');
        if (listEl) {
            listEl.innerHTML = '<li>Unable to load contributor counts at this time.</li>';
        }
    }

    renderFreshnessLine(stats, snapshot);

    if (snapshot) {
        renderBuildersSpotlight(snapshot);
    }

    initGlobalSearch();
}

let searchIndex = null;
let isSearchLoading = false;

function initGlobalSearch() {
    const input = document.getElementById('global-hero-search');
    const dropdown = document.getElementById('hero-search-dropdown');
    
    if (!input || !dropdown) return;

    input.addEventListener('focus', async () => {
        if (!searchIndex && !isSearchLoading) {
            isSearchLoading = true;
            try {
                const resp = await fetch(SHARED_BASE + 'contributors/registry_index.json');
                if (resp.ok) {
                    const data = await resp.json();
                    searchIndex = data.contributors || [];
                }
            } catch(e) {
                console.error("Failed to load search index", e);
            }
            isSearchLoading = false;
        }
    });

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) {
            dropdown.hidden = true;
            return;
        }

        if (!searchIndex) {
            dropdown.innerHTML = `<li style="padding: 16px; color: var(--text-secondary); text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading directory...</li>`;
            dropdown.hidden = false;
            return;
        }

        // Filter search index
        const results = searchIndex.filter(c => {
            // Filter out 0-activity profiles
            const code = (c.total_commits || 0);
            const bips = (c.bips_authored || 0);
            const hybrid = (c.hybrid_score || 0);
            const isActive = hybrid > 0 || code > 0 || bips > 0 || c.dev_type === 'Creator';
            
            if (!isActive) return false;

            const nameMatch = (c.display_name || '').toLowerCase().includes(term);
            const loginMatch = (c.github && c.github.login) ? c.github.login.toLowerCase().includes(term) : false;
            return nameMatch || loginMatch;
        });

        // Boost Satoshi if searched
        results.sort((a, b) => {
            if (term.includes('satoshi')) {
                if (a.dev_type === 'Creator') return -1;
                if (b.dev_type === 'Creator') return 1;
            }
            return (b.impact_score || 0) - (a.impact_score || 0);
        });

        const topResults = results.slice(0, 6);

        if (topResults.length === 0) {
            dropdown.innerHTML = `<li style="padding: 16px; color: var(--text-secondary); text-align: center;">No developers found matching "${escHtml(term)}"</li>`;
            dropdown.hidden = false;
            return;
        }

        dropdown.innerHTML = topResults.map(c => {
            const initial = (c.display_name || '?').trim().charAt(0).toUpperCase();
            let roleHtml = '';
            if (c.dev_type) {
                roleHtml = `<span style="font-size: 11px; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-subtle);">${escHtml(c.dev_type)}</span>`;
            }
            return `
                <li>
                    <a href="profile.html?uuid=${encodeURIComponent(c.uuid)}" class="search-dropdown-item" style="display: flex; align-items: center; gap: 16px; padding: 12px 20px; text-decoration: none; border-bottom: 1px solid var(--border-subtle); transition: background 0.2s;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 16px; font-weight: 600; flex-shrink: 0;">${initial}</div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="color: var(--text-primary); font-weight: 600; font-size: 14px;">${escHtml(c.display_name)}</span>
                            <div style="display: flex; gap: 6px;">${roleHtml}</div>
                        </div>
                    </a>
                </li>
            `;
        }).join('');
        
        dropdown.hidden = false;
    });

    // Hover effect dynamically via JS since we put inline styles
    dropdown.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.search-dropdown-item');
        if (item) item.style.background = 'rgba(232, 145, 107, 0.08)'; // Highlight using orange primary
    });
    dropdown.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.search-dropdown-item');
        if (item) item.style.background = 'transparent';
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.hidden = true;
        }
    });
}

function renderDomainSummary(stats) {
    const listEl = document.getElementById('domain-count-list');
    const insightEl = document.getElementById('summary-insight');
    if (!listEl) return;

    const groups = stats.groups || {};
    const vennSummary = stats.venn_summary || {};
    const values = [
        { label: 'Code contributors', icon: 'fas fa-laptop-code', value: groups.committers, note: 'Git committers and core PR participants' },
        { label: 'Review contributors', icon: 'fas fa-clipboard-check', value: groups.reviewers, note: 'Peer review and code feedback contributors' },
        { label: 'Research contributors', icon: 'fas fa-flask', value: groups.research, note: 'Mailing list and Delving discussion participants' },
        { label: 'BIP authors', icon: 'fas fa-file-signature', value: groups.standards, note: 'Standards authors and protocol specification contributors' },
        { label: 'All four domains', icon: 'fas fa-star', value: vennSummary.all_four, note: 'People active in Code, Review, Research, and Standards' }
    ];

    const allFourValue = vennSummary.all_four != null ? vennSummary.all_four.toLocaleString() : '—';
    const totalDevs = groups.total_registry || groups.total_active;
    const totalStr  = totalDevs ? totalDevs.toLocaleString() : null;
    const totalActive = groups.total_active ? groups.total_active.toLocaleString() : null;
    
    if (insightEl) {
        if (totalStr && totalActive) {
            insightEl.innerHTML = `We map ${totalStr} profiles across the Bitcoin ecosystem. Currently, ${totalActive} are actively contributing to code, peer review, research, or standards—with just ${allFourValue} extraordinary builders spanning all four domains. <span class="info-tooltip-container" style="margin-left: 4px;"><i class="fas fa-info-circle" style="color: var(--primary); opacity: 0.7;"></i><span class="tooltip-text">Active contributors have engaged directly in Code, Review, Research, or Standards.<br><br>The broader registry of mapped profiles includes ecosystem participants such as issue reporters, issue commenters, and individuals mentioned in discussions.</span></span>`;
        } else {
            insightEl.innerText = `Currently ${allFourValue} extraordinary builders span all four domains.`;
        }
    }

    listEl.innerHTML = values.map(item => {
        const value = item.value != null ? item.value.toLocaleString() : '–';
        return `<li style="display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start;">
            <div style="color: var(--primary); font-size: 15px; margin-top: 3px; width: 24px; text-align: center;"><i class="${item.icon}"></i></div>
            <div>
                <strong>${item.label}:</strong> ${value}
                <span style="display: block; margin-top: 2px; font-size: 12px; color: var(--text-secondary);">${item.note}</span>
            </div>
        </li>`;
    }).join('');

}

function renderFreshnessLine(stats, snapshot) {
    const el = document.getElementById('freshness-line');
    if (!el) return;

    const generated = (stats && stats.generated_at) || (snapshot && snapshot.generated_at);
    const stamp = generated ? formatMonthYear(generated) : 'Unknown date';
    
    el.innerHTML = `<span style="letter-spacing: 0.5px; text-transform: uppercase;">Updated ${stamp}</span>`;
}

let spotlightInterval = null;

async function renderBuildersSpotlight(snapshot) {
    const listEl = document.getElementById('widget-builders-list');
    if (!listEl) return;

    try {
        const reviewers = (snapshot.widgets.top_reviewers_30d.items || []).slice(0, 5).map(i => ({ ...i, role: 'reviewer' }));
        const legends = (snapshot.widgets.historical_legends ? snapshot.widgets.historical_legends.items : []).map(i => ({ ...i, role: 'legend' }));
        
        let combinedBuilders = [...reviewers, ...legends];
        // Deduplicate just in case someone is in both somehow
        const seenUuids = new Set();
        combinedBuilders = combinedBuilders.filter(b => {
            if (seenUuids.has(b.uuid)) return false;
            seenUuids.add(b.uuid);
            return true;
        });

        // Shuffle the combined array
        combinedBuilders = combinedBuilders.sort(() => Math.random() - 0.5);

        if (combinedBuilders.length === 0) {
            listEl.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px;">No data available for this month.</div>';
            return;
        }

        listEl.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px; text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading builder...</div>';
        
        const builderData = await Promise.all(combinedBuilders.map(async (builder) => {
            try {
                const resp = await fetch(`${SHARED_BASE}contributors/profiles/${encodeURIComponent(builder.uuid)}.json`);
                if (resp.ok) {
                    const profile = await resp.json();
                    const gh = profile.github_login_final || (profile.github && profile.github.login);
                    return { ...builder, github_login: gh };
                }
            } catch (e) {
                // ignore
            }
            return builder;
        }));

        let currentIndex = 0;
        
        function showBuilder(index) {
            const b = builderData[index];
            const avatarUrl = b.github_login 
                ? `https://github.com/${encodeURIComponent(b.github_login)}.png?size=120` 
                : 'https://bitcoindatalabs.org/images/default_avatar.png';
                
            const metricHtml = b.role === 'legend'
                ? `<i class="fas fa-award" style="margin-right: 4px;"></i>Ecosystem Veteran`
                : `<i class="fas fa-comment-dots" style="margin-right: 4px;"></i>${b.reviews_30d} reviews this month`;

            listEl.innerHTML = `
                <a href="profile.html?uuid=${encodeURIComponent(b.uuid)}" class="rotating-builder-card fade-transition">
                    <img src="${avatarUrl}" alt="${escHtml(b.display_name)}" class="builder-avatar" onerror="this.src='https://github.com/identicons/${escHtml(b.display_name)}.png'">
                    <div class="builder-info">
                        <div class="builder-name">${escHtml(b.display_name)}</div>
                        <div class="builder-metric">${metricHtml}</div>
                    </div>
                </a>
            `;
        }

        showBuilder(0);

        if (spotlightInterval) clearInterval(spotlightInterval);
        spotlightInterval = setInterval(() => {
            const card = listEl.querySelector('.rotating-builder-card');
            if (card) {
                card.style.opacity = '0';
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % builderData.length;
                    showBuilder(currentIndex);
                }, 300);
            }
        }, 5000);

    } catch (e) {
        console.error("Error rendering builders spotlight:", e);
        listEl.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px;">Error loading builders.</div>';
    }
}


function formatMonthYear(input) {
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDelta(n) {
    const val = Number(n || 0);
    if (val > 0) return `+${val.toLocaleString()}`;
    if (val < 0) return `${val.toLocaleString()}`;
    return '0';
}

document.addEventListener('DOMContentLoaded', initLanding);
