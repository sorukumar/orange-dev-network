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
let currentSort = { col: 'hybrid_score', dir: 'desc' };
let currentPage = 1;
const PAGE_SIZE = 100;

// Archetype colors — kept in sync with visualization.js for consistency across all three pages
// 4 roles + Creator — kept in sync with visualization.js and influence.py archetypes.
const ARCHETYPE_COLORS = {
    'Creator':           '#F7931A',  // Bitcoin orange — singular, foundational
    'Protocol Designer': '#A97D62',  // Warm bronze — softer and more in line with the network graph palette
    'Builder':           '#4ADE80',  // Green          — ships the code
    'Reviewer':          '#22D3EE',  // Cyan           — scrutinizes and validates
    'Participant':       '#94A3B8',  // Slate          — broad participation
};

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

async function initDirectory() {
    // Check URL for uuid param to support direct deep-linking from network graph
    const params = new URLSearchParams(window.location.search);
    const directUuid = params.get('uuid');
    try {
        const response = await fetch(REGISTRY_URL);
        const data = await response.json();
        allContributors = data.contributors.map(c => {
            return {
                ...c,
                ml_total: (c.ml_threads || 0) + (c.ml_responses || 0),
                delving_total: (c.delving_threads || 0) + (c.delving_responses || 0)
            };
        });

        // Initial filter & sort
        filteredContributors = [...allContributors];
        currentPage = 1;
        sortData();
        renderTable();

        setupListeners();
        updateSortIcons();

        if (directUuid) {
            setTimeout(() => showProfile(directUuid), 600);
        }
    } catch (error) {
        console.error("Failed to load directory data:", error);
        document.getElementById('contributor-list').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 12px;"></i>
                    <p>Failed to load the index. Please check your connection or try again later.</p>
                </td>
            </tr>
        `;
    }
}

function setupListeners() {
    // Search
    document.getElementById('directory-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredContributors = allContributors.filter(c => {
            const nameMatch = c.display_name.toLowerCase().includes(term);
            const loginMatch = (c.github && c.github.login) ? c.github.login.toLowerCase().includes(term) : false;
            const focusValue = c.technical_focus ? c.technical_focus.toLowerCase() : '';
            const focusMatch = focusValue.includes(term);
            return nameMatch || loginMatch || focusMatch;
        });
        currentPage = 1;
        sortData();
        renderTable();
    });

    // Sorting
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.col === col) {
                currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
            } else {
                currentSort.col = col;
                currentSort.dir = ['display_name', 'technical_focus'].includes(col) ? 'asc' : 'desc';
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
    };

    window.onclick = (event) => {
        const modal = document.getElementById('profile-modal');
        if (event.target == modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    };
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
        let valA = a[currentSort.col];
        let valB = b[currentSort.col];

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

    list.innerHTML = pageItems.map(c => {
        // Removed live GitHub avatar fetching based on user request to improve performance and reliability
        const avatarPlaceholder = `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`;

        const hybrid = c.hybrid_score || 0;
        const impactPct = Math.min(100, (hybrid / 4) * 100);

        const badges = (c.roles || []).map(r => `<span class="mini-badge ${r.toLowerCase()}">${r}</span>`).join('');
        const archetypeColor = getArchetypeColor(c.dev_type);
        const archetypeBadge = c.dev_type
            ? `<span class="mini-badge" style="background:${archetypeColor}22; color:${archetypeColor}; border:1px solid ${archetypeColor}44; font-size:10px;">${c.dev_type}</span>`
            : '';

        const ml_threads = c.ml_threads || 0;
        const ml_responses = c.ml_responses || 0;
        const delving_threads = c.delving_threads || 0;
        const delving_responses = c.delving_responses || 0;

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
                        <span class="impact-val">${c.hybrid_score ? c.hybrid_score.toFixed(2) : '-'}</span>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${impactPct}%"></div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center; font-weight: 600;">${c.authored_commits?.toLocaleString() || 0}</td>
                <td style="text-align: center; color: var(--text-secondary);">${c.bips_authored || 0}</td>
                <td style="text-align: center; color: var(--text-secondary); white-space: nowrap;">
                    <span style="color: #fff;">${ml_threads}</span><span style="opacity: 0.4; font-size: 0.8em; margin: 0 2px;">/</span><span>${ml_responses}</span>
                </td>
                <td style="text-align: center; color: var(--text-secondary); white-space: nowrap;">
                    <span style="color: #fff;">${delving_threads}</span><span style="opacity: 0.4; font-size: 0.8em; margin: 0 2px;">/</span><span>${delving_responses}</span>
                </td>
                <td>
                    <span class="focus-tag">${c.technical_focus}</span>
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

async function showProfile(uuid) {
    const contributor = allContributors.find(c => c.uuid === uuid);
    if (!contributor) return;

    const modal = document.getElementById('profile-modal');
    const modalBody = document.getElementById('modal-body');

    // Show spinner in modal while loading sharded profile
    modalBody.innerHTML = `
        <div style="padding: 100px; text-align: center;">
            <div class="loading-spinner"></div>
            <p>Loading deep profile...</p>
        </div>
    `;
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    // Detect if this contributor has a sharded profile based on "is_high_signal" logic
    // Or we check if the registry has the profile_filename
    const filename = contributor.profile_filename;

    if (filename) {
        try {
            const response = await fetch(PROFILE_BASE_URL + filename);
            const profile = await response.json();
            renderProfile(profile);
        } catch (error) {
            console.error("Error loading profile:", error);
            modalBody.innerHTML = `<div style="padding: 40px; text-align: center;">Error loading profile data.</div>`;
        }
    } else {
        // Fallback for low-signal contributors who don't have a shard
        // Render basic info from registry
        renderProfile(contributor, true);
    }
}

function renderProfile(p, isBasic = false) {
    const avatarPlaceholder = `<div class="avatar-placeholder profile-large"><i class="fas fa-user-circle"></i></div>`;
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

    document.getElementById('modal-body').innerHTML = `
        <div class="profile-header-strip" style="background: linear-gradient(90deg, var(--bitcoin-orange), #ff6b00); height: 80px; border-radius: 24px 24px 0 0;"></div>
        <div class="profile-content" style="padding: 0 40px 40px 40px; margin-top: -40px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
                ${avatarPlaceholder}
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
                        <span style="font-weight: 700; color: #fff;">${p.authored_commits?.toLocaleString() || p.total_commits?.toLocaleString() || 0}</span>
                    </div>
                    <div class="profile-info-row">
                        <span>Merge Commits (Maintainer)</span>
                        <span style="font-weight: 700; color: var(--text-secondary);">${p.merge_commits?.toLocaleString() || 0}</span>
                    </div>
                    <div class="profile-info-row">
                        <span>Impact Score</span>
                        <span style="font-weight: 700; color: var(--bitcoin-orange);">${p.hybrid_score ? p.hybrid_score.toFixed(3) : (p.authored_commits?.toLocaleString() || 0)}</span>
                    </div>
                    <div class="profile-info-row" style="border: none;">
                        <span>Technical Focus</span>
                        <span style="font-weight: 700; color: #fff;">${p.technical_focus}</span>
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
                color: #fff;
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
                background: rgba(255,255,255,0.1);
                color: #fff;
                border-color: rgba(255,255,255,0.2);
            }
        </style>
    `;
}

// Global initialization
document.addEventListener('DOMContentLoaded', initDirectory);
