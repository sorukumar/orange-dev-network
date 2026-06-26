/**
 * profile.js — Developer Profile Page
 * Loads a contributor shard and renders a full-page deep-dive profile.
 * Also powers the developer search combobox in the top navigation bar.
 */

// ── Data URLs ──────────────────────────────────────────────────────────────────
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const DATA_BASE_URL = isLocal
    ? 'output/shared/contributors/'
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/contributors/';
const REGISTRY_URL   = DATA_BASE_URL + 'registry_index.json';
const PROFILE_BASE_URL = DATA_BASE_URL + 'profiles/';

// ── Category colors — identical to orange-dev-tracker/js/theme.js ─────────────
const CATEGORY_COLORS = {
    'Consensus':    '#E07A5F',
    'Script':       '#f59e0b',
    'Cryptography': '#C53030',
    'Mining':       '#F6AD55',
    'Node & RPC':   '#ED8936',
    'GUI':          '#F4A261',
    'Wallet':       '#D69E2E',
    'P2P Network':  '#2B6CB0',
    'Database':     '#4A5568',
    'Utilities':    '#9F86C0',
    'Mempool':      '#6366f1',
    'Tests':        '#81B29A',
    'Build & CI':   '#3D405B',
    'Documentation':'#F2CC8F',
    'Infrastructure':'#94A3B8',
    'Merge':        '#94A3B8',
};

const GHIBLI_PALETTE = [
    '#7BA9CC','#B9D4E7','#5B8266','#A2C5AC','#E07A5F','#F4A261',
    '#D4AF37','#E9C46A','#6D597A','#B5838D','#3E6073','#8BBEE8',
    '#89B449','#C5D86D','#E27396','#FFB3C1','#585123','#DDA15E',
    '#384D48','#ACD7EC'
];

// Domain labels are loaded from registry_index.json metadata.domains at init time.
// Do NOT add hardcoded label maps here — edit metadata/expertise_domains.json instead.
let DOMAIN_COLOR_MAP = {};  // id → color
let DOMAIN_NAME_MAP  = {};  // id → name
function buildProfileDomainMaps(domains) {
    DOMAIN_COLOR_MAP = {};
    DOMAIN_NAME_MAP = {};
    (domains || []).forEach(d => {
        DOMAIN_COLOR_MAP[d.id] = d.color;
        DOMAIN_NAME_MAP[d.id]  = d.name;
    });
}

const BIP_STATUS_COLORS = {
    // Live / deployed
    'Final':     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Active':    { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Deployed':  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    'Complete':  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    // In progress
    'Proposed':  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'Draft':     { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
    // Closed / withdrawn
    'Closed':    { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    'Withdrawn': { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    'Rejected':  { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    'Replaced':  { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
    'Obsolete':  { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: 'rgba(148,163,184,0.3)' },
};

// BIP theme badge colors
const BIP_THEME_COLORS = {
    'Consensus & Soft Forks':    { bg: 'rgba(224,122,95,0.18)',  color: '#E07A5F', border: 'rgba(224,122,95,0.35)' },
    'Script & Smart Contracts':  { bg: 'rgba(107,189,158,0.18)', color: '#6BBDA2', border: 'rgba(107,189,158,0.35)' },
    'Wallet & Keys':             { bg: 'rgba(214,158,46,0.18)',  color: '#D69E2E', border: 'rgba(214,158,46,0.35)' },
    'Privacy':                   { bg: 'rgba(159,134,192,0.18)', color: '#9F86C0', border: 'rgba(159,134,192,0.35)' },
    'Scaling & Lightning':       { bg: 'rgba(123,169,204,0.18)', color: '#7BA9CC', border: 'rgba(123,169,204,0.35)' },
    'P2P Network':               { bg: 'rgba(43,108,176,0.18)',  color: '#4A90D9', border: 'rgba(43,108,176,0.35)' },
    'Mining':                    { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
    'Other':                     { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8', border: 'rgba(148,163,184,0.25)' },
};

const ARCHETYPE_COLORS = {
    'Creator':           '#E8916B',
    'Protocol Designer': '#8a7a5f',
    'Builder':           '#f59e0b',
    'Reviewer':          '#10b981',
    'Participant':       '#94A3B8',
};

// ── ECharts lazy loader ────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(val) {
    if (!val) return '—';
    const s = String(val);
    let d;
    if (s.includes('T')) {
        // Full ISO datetime without timezone → JS treats as local time → no offset risk
        d = new Date(s);
    } else {
        // Date-only string: new Date('YYYY-MM-DD') is parsed as UTC midnight, which
        // shifts to the previous day in western timezones. Parse components instead.
        const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return s.slice(0, 10);
        d = new Date(+m[1], +m[2] - 1, +m[3]);
    }
    return isNaN(d) ? s.slice(0, 10) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateRange(first, last) {
    const firstDate = fmtDate(first);
    const lastDate = fmtDate(last);
    if (firstDate === '—' && lastDate === '—') return '—';
    if (firstDate === lastDate) return firstDate;
    if (firstDate === '—') return lastDate;
    if (lastDate === '—') return firstDate;
    return `${firstDate} – ${lastDate}`;
}

function parseDateOnly(val) {
    if (!val) return null;
    const s = String(val).slice(0, 10);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function formatDuration(start, end) {
    const startDate = parseDateOnly(start);
    if (!startDate) return '—';
    const endDate = end ? parseDateOnly(end) : new Date();
    if (!endDate || isNaN(endDate)) return '—';

    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    if (days < 0) {
        months -= 1;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    if (years < 0) {
        years = 0;
        months = 0;
    }

    if (years > 1) return `${years} yrs${months ? ` ${months} mos` : ''}`;
    if (years === 1) return `1 yr${months ? ` ${months} mos` : ''}`;
    if (months > 1) return `${months} mos`;
    if (months === 1) return `1 mo`;
    return '≤ 1 mo';
}

function fmtNum(v, fallback = '—') {
    const n = Number(v);
    if (isNaN(n)) return fallback;
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));
}

function githubLogin(p) {
    if (p.github_login_final) return p.github_login_final;
    if (p.github && p.github.login) return p.github.login;
    return null;
}

function getArchetypeStyle(devType) {
    const color = ARCHETYPE_COLORS[devType] || '#94A3B8';
    return `background:${color}22; color:${color}; border-color:${color}44;`;
}

function firstActive(p) {
    const candidates = [p.first_commit, p.first_active, p.global_first_active].filter(Boolean).map(v => String(v).slice(0, 10)).filter(v => /^\d{4}/.test(v)).sort();
    return candidates[0] || null;
}

function lastActive(p) {
    const candidates = [p.last_commit, p.last_active, p.global_last_active].filter(Boolean).map(v => String(v).slice(0, 10)).filter(v => /^\d{4}/.test(v)).sort();
    return candidates[candidates.length - 1] || null;
}

// ── Section renderers ──────────────────────────────────────────────────────────

function renderHero(p) {
    const login = githubLogin(p);
    const avatarEl = login
        ? `<img class="hero-avatar" src="https://github.com/${login}.png?size=120" alt="${esc(p.display_name)}" onerror="this.outerHTML='<div class=hero-avatar-placeholder><i class=\\'fas fa-user-circle\\'></i></div>'">`
        : `<div class="hero-avatar-placeholder"><i class="fas fa-user-circle"></i></div>`;

    const roles = (p.roles || []).map(r => {
        const lower = r.toLowerCase();
        let classes = ['mini-badge'];
        if (lower.includes('maintainer')) {
            classes.push('maintainer');
            classes.push(lower.includes('former') ? 'retired' : 'current');
        } else {
            classes.push(lower.replace(/\s+/g, '-'));
        }
        return `<span class="${classes.join(' ')}">${esc(r)}</span>`;
    }).join('');
    
    // Hide ecosystem badge if they are active in core
    const isCoreActive = (p.tier1_authored_commits > 0) || p.badges?.is_maintainer;
    const ecosystemBadge = (p.badges?.ecosystem_contributor && !isCoreActive)
        ? `<span class="mini-badge ecosystem">🌐 Ecosystem</span>`
        : '';

    const archetypeBadge = p.dev_type
        ? `<span class="archetype-badge" style="${getArchetypeStyle(p.dev_type)}">${esc(p.dev_type)}</span>`
        : '';

    const fa = firstActive(p);
    const la = lastActive(p);
    let period = '';
    if (fa && la) {
        const faYear = fa.slice(0, 4);
        const laYear = la.slice(0, 4);
        const yrs = Number(laYear) - Number(faYear) + 1;
        period = faYear === laYear
            ? `${faYear} (1 yr)`
            : `${faYear} – ${laYear} (${yrs} yrs)`;
    } else if (fa) {
        period = fa.slice(0, 4);
    }

    const ghLink = login
        ? `<a href="https://github.com/${login}" target="_blank" class="link-action"><i class="fab fa-github"></i> ${esc(login)}</a>`
        : '';
    const dlUser = p.delving_username_final || p.delving_username;
    const dlLink = dlUser
        ? `<a href="https://delvingbitcoin.org/u/${dlUser}" target="_blank" class="link-action"><i class="fas fa-comments"></i> Delving</a>`
        : '';
    const xLink = p.github_twitter
        ? `<a href="https://x.com/${esc(p.github_twitter)}" target="_blank" class="link-action"><i class="fab fa-x-twitter"></i> @${esc(p.github_twitter)}</a>`
        : '';
    const blogLink = p.github_blog
        ? `<a href="${esc(p.github_blog.startsWith('http') ? p.github_blog : 'https://' + p.github_blog)}" target="_blank" class="link-action"><i class="fas fa-link"></i> Website</a>`
        : '';

    const maintainerTimeline = p.badges?.is_maintainer && p.badges.maintainer_appointed
        ? `<div class="hero-maintainer-timeline">Maintainer: ${fmtDate(p.badges.maintainer_appointed)} – ${p.badges.maintainer_stepped_down ? fmtDate(p.badges.maintainer_stepped_down) : 'Present'} (${formatDuration(p.badges.maintainer_appointed, p.badges.maintainer_stepped_down)})</div>`
        : '';

    document.getElementById('profile-hero-slot').innerHTML = `
        <div class="profile-hero">
            <div class="hero-strip"></div>
            <div class="hero-body">
                ${avatarEl}
                <div class="hero-meta">
                    <h1 class="hero-name">${esc(p.display_name || 'Unknown Developer')}</h1>
                    <div class="hero-badges-row">
                        ${archetypeBadge}
                        ${roles}
                        ${ecosystemBadge}
                    </div>
                    ${period ? `<div class="hero-period">${period}</div>` : ''}
                    ${maintainerTimeline}
                </div>
                <div class="hero-links">
                    ${ghLink}
                    ${dlLink}
                    ${xLink}
                    ${blogLink}
                </div>
            </div>
        </div>`;
}

function renderStatBar(p) {
    const mlTotal = (p.ml_threads || 0) + (p.ml_responses || 0);
    const dlTotal = (p.delving_threads || 0) + (p.delving_responses || 0);
    const isCreator = p.dev_type === 'Creator';
    const impactRaw = p.impact_score != null ? Number(p.impact_score) : null;
    const impactDisplay = isCreator ? 'Creator' : (impactRaw == null || isNaN(impactRaw) ? '—' : String(impactRaw));

    const stats = [
        { label: 'Impact Score',     value: impactDisplay,              sub: isCreator ? '' : 'out of 100' },
        { label: 'Authored Commits', value: fmtNum(p.authored_commits), sub: `${fmtNum(p.merge_commits)} merges` },
        { label: 'Code Reviews',     value: fmtNum(p.reviews_count),    sub: 'PRs reviewed' },
        { label: 'BIPs Authored',    value: fmtNum(p.bips_authored, '0'), sub: 'proposals' },
        { label: 'Mailing List',     value: fmtNum(mlTotal, '0'),       sub: `${fmtNum(p.ml_threads,'0')}T / ${fmtNum(p.ml_responses,'0')}R` },
        { label: 'Delving Bitcoin',  value: fmtNum(dlTotal, '0'),       sub: `${fmtNum(p.delving_threads,'0')}T / ${fmtNum(p.delving_responses,'0')}R` },
    ];

    document.getElementById('profile-stat-bar-slot').innerHTML = `
        <div class="stat-bar">
            ${stats.map(s => `
            <div class="stat-bar-item">
                <span class="stat-bar-label">${s.label}</span>
                <span class="stat-bar-value">${s.value}</span>
                ${s.sub ? `<span class="stat-bar-sub">${s.sub}</span>` : ''}
            </div>`).join('')}
        </div>`;
}

function renderWorkDetail(p) {
    // Derive top-3 focus areas from expertise_domain_scores (sorted by score desc).
    // Fall back to legacy expertise_domains list if scores not available.
    const focusAreas = (() => {
        if (p.expertise_domain_scores && Object.keys(p.expertise_domain_scores).length) {
            return Object.entries(p.expertise_domain_scores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => DOMAIN_NAME_MAP[id] || id);
        }
        if (Array.isArray(p.expertise_domains) && p.expertise_domains.length) {
            return p.expertise_domains.map(d => DOMAIN_NAME_MAP[d] || d);
        }
        return Array.isArray(p.technical_focus) ? p.technical_focus
             : (p.technical_focus ? [p.technical_focus] : []);
    })();
    const focusDisplay = focusAreas.slice(0, 3).join(', ') || p.primary_category || '—';

    const reciprocity = Number(p.review_reciprocity);
    const reciprocityNote = (!isNaN(reciprocity) && reciprocity > 0)
        ? `<span style="font-size:11px;color:var(--text-secondary);">${reciprocity.toFixed(1)}× reviews per PR authored</span>`
        : '';

    const approvalsCount = Number(p.approvals_count);
    const approvalsRow = (!isNaN(approvalsCount) && approvalsCount > 0)
        ? `<div class="info-row"><span class="info-row-label">PRs Approved</span><span class="info-row-value">${fmtNum(approvalsCount, '—')}</span></div>`
        : '';

    const tierSplitRows = (p.tier2_authored_commits > 0)
        ? `<div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Core repos</span><span class="info-row-value">${fmtNum(p.tier1_authored_commits, '0')} <span style="font-weight: normal; opacity: 0.7; margin-left: 4px;">(secp256k1, bitcoin/bitcoin, gui)</span></span></div>
           <div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Ecosystem</span><span class="info-row-value">${fmtNum(p.tier2_authored_commits, '0')} <span style="font-weight: normal; opacity: 0.7; margin-left: 4px;">(guix.sigs, HWI, qa-assets)</span></span></div>`
        : '';

    const mergeTierSplitRows = (p.tier2_merge_commits > 0)
        ? `<div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Core repos</span><span class="info-row-value">${fmtNum(p.tier1_merge_commits, '0')}</span></div>
           <div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Ecosystem</span><span class="info-row-value">${fmtNum(p.tier2_merge_commits, '0')}</span></div>`
        : '';

    const prAuthoredTierSplitRows = (p.tier2_prs_authored > 0)
        ? `<div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Core repos</span><span class="info-row-value">${fmtNum(p.tier1_prs_authored, '0')}</span></div>
           <div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Ecosystem</span><span class="info-row-value">${fmtNum(p.tier2_prs_authored, '0')}</span></div>`
        : '';

    const reviewTierSplitRows = (p.tier2_reviews_count > 0)
        ? `<div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Core repos</span><span class="info-row-value">${fmtNum(p.tier1_reviews_count, '0')}</span></div>
           <div class="info-row" style="padding-left: 12px; font-size: 12px; border-left: 2px solid var(--border-color); margin-left: 8px;"><span class="info-row-label">↳ Ecosystem</span><span class="info-row-value">${fmtNum(p.tier2_reviews_count, '0')}</span></div>`
        : '';

    document.getElementById('profile-work-slot').innerHTML = `
        <div class="profile-section">
            <p class="section-title">Work Profile</p>
            <div class="work-grid">
                <div>
                    <p class="work-col-title">Codebase Activity</p>
                    <div class="info-row"><span class="info-row-label">Total Commits</span><span class="info-row-value">${fmtNum(p.total_commits, '—')}</span></div>
                    <div class="info-row"><span class="info-row-label">Authored Commits</span><span class="info-row-value">${fmtNum(p.authored_commits, '—')}</span></div>
                    ${tierSplitRows}
                    <div class="info-row"><span class="info-row-label">Merge Commits</span><span class="info-row-value">${fmtNum(p.merge_commits, '—')}</span></div>
                    ${mergeTierSplitRows}
                    <div class="info-row"><span class="info-row-label">PRs Authored</span><span class="info-row-value">${fmtNum(p.prs_authored, '—')}</span></div>
                    ${prAuthoredTierSplitRows}
                    <div class="info-row"><span class="info-row-label">PRs Reviewed</span><span class="info-row-value" style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">${fmtNum(p.reviews_count, '—')}${reciprocityNote}</span></div>
                    ${reviewTierSplitRows}
                    ${approvalsRow}
                    <div class="info-row"><span class="info-row-label">Primary Focus</span><span class="info-row-value" style="font-size:12px;">${esc(focusDisplay)}</span></div>
                </div>
                <div>
                    <p class="work-col-title">Timeline</p>
                    ${p.tier2_authored_commits > 0 ? `
                        <div class="info-row"><span class="info-row-label">Commits (Core)</span><span class="info-row-value">${fmtDateRange(p.first_core_commit, p.last_core_commit)}</span></div>
                        <div class="info-row"><span class="info-row-label">Commits (Ecosystem)</span><span class="info-row-value">${fmtDateRange(p.first_ecosystem_commit, p.last_ecosystem_commit)}</span></div>
                    ` : `
                        <div class="info-row"><span class="info-row-label">Commits</span><span class="info-row-value" title="Tenure based on first Core PR merge" style="cursor: help; border-bottom: 1px dotted var(--text-secondary);">${fmtDateRange(p.first_commit, p.last_commit)}</span></div>
                    `}
                    <div class="info-row"><span class="info-row-label">Reviews</span><span class="info-row-value">${fmtDateRange(p.first_review_date, p.last_review_date)}</span></div>
                    <div class="info-row"><span class="info-row-label">Social Activity</span><span class="info-row-value">${fmtDateRange(p.first_message ? p.first_message.date : null, p.last_message ? p.last_message.date : null)}</span></div>
                </div>
            </div>
        </div>`;
}

function renderBips(p) {
    if (!p.bip_list || p.bip_list.length === 0) {
        document.getElementById('profile-bips-slot').innerHTML = '';
        return;
    }
    const rows = p.bip_list.map(b => {
        const num = b.number ? String(b.number).padStart(4, '0') : '????';
        const sc = BIP_STATUS_COLORS[b.status] || BIP_STATUS_COLORS['Draft'];
        const statusPill = `<span class="bip-status-pill" style="background:${sc.bg};color:${sc.color};border-color:${sc.border};">${esc(b.status || 'Unknown')}</span>`;
        const numLink = b.link
            ? `<a href="${esc(b.link)}" target="_blank" class="bip-number-link">BIP-${num}</a>`
            : `<span class="bip-number-link" style="cursor:default;">BIP-${num}</span>`;
        const tc = (b.theme && BIP_THEME_COLORS[b.theme]) ? BIP_THEME_COLORS[b.theme] : null;
        const themeTag = b.theme && b.theme !== 'nan' && b.theme !== 'None'
            ? `<span class="bip-theme-tag" ${tc ? `style="background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};"` : ''}>${esc(b.theme)}</span>` : '';
        return `<div class="bip-row">${numLink}<span class="bip-title-col">${esc(b.title)}</span>${themeTag}${statusPill}</div>`;
    }).join('');

    document.getElementById('profile-bips-slot').innerHTML = `
        <div class="profile-section">
            <p class="section-title">BIPs Authored (${p.bip_list.length})</p>
            <div class="bip-rows">${rows}</div>
        </div>`;
}

function renderSocialFootprint(p) {
    const hasFirst = Boolean(p.first_message);
    const hasLast  = Boolean(p.last_message);
    if (!hasFirst && !hasLast) {
        document.getElementById('profile-social-footprint-slot').innerHTML = '';
        return;
    }

    const buildCard = (msg, label) => {
        if (!msg) return '';
        const srcCls   = msg.source === 'mailing_list' ? 'msg-src-ml' : 'msg-src-delving';
        const srcLabel = msg.source === 'mailing_list' ? 'Mailing List' : 'Delving Bitcoin';
        const dateStr  = msg.date ? String(msg.date).slice(0, 10) : '';
        const subj     = esc(msg.subject || '(no subject)');
        const linkEl   = msg.link
            ? `<a href="${esc(msg.link)}" target="_blank" class="msg-subject">${subj}</a>`
            : `<span class="msg-subject">${subj}</span>`;
        return `<div class="message-card">
            <div class="msg-top-row">
                <span class="msg-label">${label}</span>
                <span class="msg-src ${srcCls}">${srcLabel}</span>
                <span class="msg-date">${dateStr}</span>
            </div>
            ${linkEl}
        </div>`;
    };

    document.getElementById('profile-social-footprint-slot').innerHTML = `
        <div class="profile-section">
            <p class="section-title">Social Footprint</p>
            <div class="message-grid">
                ${buildCard(p.first_message, 'First Message')}
                ${buildCard(p.last_message,  'Last Message')}
            </div>
        </div>`;
}

function renderJumpNav(p) {
    const hasCode   = Boolean(p.commit_history && Object.keys(p.commit_history).length) ||
                      Boolean(p.bip_list && p.bip_list.length);
    const hasSocial = Boolean(p.first_message || p.last_message ||
                              (p.social_history && Object.keys(p.social_history).length));
    if (!hasCode && !hasSocial) { document.getElementById('profile-jump-nav-slot').innerHTML = ''; return; }

    const codeBtn = hasCode
        ? `<a href="#profile-commits-chart-slot" class="jump-btn"><i class="fas fa-code-commit"></i> Code &amp; BIPs</a>`
        : '';
    const socialBtn = hasSocial
        ? `<a href="#profile-social-footprint-slot" class="jump-btn"><i class="fas fa-comments"></i> Social Activity</a>`
        : '';

    document.getElementById('profile-jump-nav-slot').innerHTML =
        `<div class="section-jumps">${codeBtn}${socialBtn}</div>`;
}

function renderCommitChartSlot(p) {
    if (!p.commit_history || Object.keys(p.commit_history).length === 0) {
        document.getElementById('profile-commits-chart-slot').innerHTML = '';
        return;
    }
    document.getElementById('profile-commits-chart-slot').innerHTML = `
        <div class="profile-section hide-on-mobile">
            <p class="section-title">Commit History by Category</p>
            <div class="chart-container" id="chart-commit-history"></div>
        </div>`;
}

function renderSocialChartSlot(p) {
    if (!p.social_history || Object.keys(p.social_history).length === 0) {
        document.getElementById('profile-social-chart-slot').innerHTML = '';
        return;
    }
    document.getElementById('profile-social-chart-slot').innerHTML = `
        <div class="profile-section hide-on-mobile">
            <p class="section-title">Social Activity by Topic</p>
            <div class="chart-container-sm" id="chart-social-history"></div>
        </div>`;
}

// ── ECharts rendering ──────────────────────────────────────────────────────────
async function renderCharts(p) {
    const hasCommit = p.commit_history && Object.keys(p.commit_history).length > 0;
    const hasSocial = p.social_history && Object.keys(p.social_history).length > 0;
    if (!hasCommit && !hasSocial) return;

    try { await loadECharts(); } catch (e) {
        console.warn('ECharts load failed — charts unavailable:', e);
        return;
    }

    const axisLabel   = { fontSize: 11, color: '#94A3B8' };
    const splitLine   = { lineStyle: { color: 'rgba(148,163,184,0.12)' } };
    const gridPad     = { left: 8, right: 8, top: 8, bottom: 40, containLabel: true };

    if (hasCommit) {
        const el = document.getElementById('chart-commit-history');
        if (el) {
            const years = Object.keys(p.commit_history).sort();
            const allCats = new Set();
            years.forEach(y => Object.keys(p.commit_history[y]).forEach(c => allCats.add(c)));
            const cats = Array.from(allCats).filter(c => c !== 'Merge');

            const chart = echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    formatter(params) {
                        const rows = params.filter(p => p.value > 0)
                            .sort((a, b) => b.value - a.value)
                            .map(p => `<div style="display:flex;justify-content:space-between;gap:16px;">${p.marker}<span>${p.seriesName}</span><b>${p.value.toFixed(1)}</b></div>`)
                            .join('');
                        return `<div style="font:12px Inter,sans-serif;padding:4px;"><b style="display:block;margin-bottom:6px;">${params[0].axisValue}</b>${rows}</div>`;
                    }
                },
                legend: {
                    type: 'scroll',
                    bottom: 0,
                    textStyle: { color: '#94A3B8', fontSize: 11 },
                    pageIconColor: '#94A3B8',
                    pageTextStyle: { color: '#94A3B8' },
                },
                grid: { ...gridPad, bottom: 60 },
                xAxis: { type: 'category', data: years, axisLabel },
                yAxis: { type: 'value', axisLabel, splitLine },
                series: cats.map(cat => ({
                    name: cat,
                    type: 'bar', stack: 'total', barMaxWidth: 48,
                    emphasis: { focus: 'series' },
                    itemStyle: { color: CATEGORY_COLORS[cat] || '#94A3B8' },
                    data: years.map(y => +(p.commit_history[y][cat] || 0).toFixed(2)),
                })),
            });
        }
    }

    if (hasSocial) {
        const el = document.getElementById('chart-social-history');
        if (el) {
            const years = Object.keys(p.social_history).sort();
            const allTopics = new Set();
            years.forEach(y => Object.keys(p.social_history[y]).forEach(t => allTopics.add(t)));
            const topics = Array.from(allTopics);

            const chart = echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    formatter(params) {
                        const rows = params.filter(p => p.value > 0)
                            .sort((a, b) => b.value - a.value)
                            .map(p => `<div style="display:flex;justify-content:space-between;gap:16px;">${p.marker}<span>${p.seriesName}</span><b>${p.value}</b></div>`)
                            .join('');
                        return `<div style="font:12px Inter,sans-serif;padding:4px;"><b style="display:block;margin-bottom:6px;">${params[0].axisValue}</b>${rows}</div>`;
                    }
                },
                legend: {
                    type: 'scroll',
                    bottom: 0,
                    textStyle: { color: '#94A3B8', fontSize: 11 },
                    pageIconColor: '#94A3B8',
                    pageTextStyle: { color: '#94A3B8' },
                },
                grid: { ...gridPad, bottom: 60 },
                xAxis: { type: 'category', data: years, axisLabel },
                yAxis: { type: 'value', axisLabel, splitLine },
                series: topics.map((topic, idx) => ({
                    name: DOMAIN_NAME_MAP[topic] || topic,
                    type: 'bar', stack: 'total', barMaxWidth: 48,
                    emphasis: { focus: 'series' },
                    itemStyle: { color: GHIBLI_PALETTE[idx % GHIBLI_PALETTE.length] },
                    data: years.map(y => p.social_history[y][topic] || 0),
                })),
            });
        }
    }
}

// ── Influence scores (temporal: all-time / since-2016 / last-3-years) ─────────
function renderInfluenceScores(p) {
    const all    = p.hybrid_score        != null ? Number(p.hybrid_score).toFixed(2) : null;
    const p2016  = p.p2016_hybrid_score  != null ? Number(p.p2016_hybrid_score).toFixed(2) : null;
    const modern = p.modern_hybrid_score != null ? Number(p.modern_hybrid_score).toFixed(2) : null;

    if (!all && !p2016 && !modern) {
        document.getElementById('profile-influence-slot').innerHTML = '';
        return;
    }

    const items = [
        { label: 'All-time',     value: all    || '—', context: 'incl. BIP &amp; maintainer bonuses' },
        { label: 'Since 2016',   value: p2016  || '—', context: 'post-2016 commits &amp; PageRank' },
        { label: 'Last 3 Years', value: modern || '—', context: 'recent activity &amp; influence' },
    ];

    document.getElementById('profile-influence-slot').innerHTML = `
        <div class="profile-section">
            <p class="section-title">Influence Scores</p>
            <div class="temporal-scores">
                ${items.map(it => `
                <div class="temporal-score-item">
                    <div class="temporal-score-label">${it.label}</div>
                    <div class="temporal-score-value">${it.value}</div>
                    <div class="temporal-score-context">${it.context}</div>
                </div>`).join('')}
            </div>
        </div>`;
}

// ── Expertise domains section ─────────────────────────────────────────────────
function renderExpertiseSection(p) {
    const domainScores = p.expertise_domain_scores;
    const bySource = p.expertise_by_source || {};

    if (!domainScores || Object.keys(domainScores).length === 0) {
        document.getElementById('profile-expertise-slot').innerHTML = '';
        return;
    }

    const sorted = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
    const maxScore = sorted[0][1] || 1;

    function makeBar(domainId, score, maxVal) {
        const pct = Math.round(score * 100);
        const barWidth = Math.round((score / maxVal) * 100);
        const color = DOMAIN_COLOR_MAP[domainId] || '#7BA9CC';
        const name = DOMAIN_NAME_MAP[domainId] || domainId;
        return `<div class="expertise-bar-row">
            <span class="expertise-bar-label">${esc(name)}</span>
            <div class="expertise-bar-track">
                <div class="expertise-bar-fill" style="width:${barWidth}%;background:${color};"></div>
            </div>
            <span class="expertise-bar-pct">${pct}%</span>
        </div>`;
    }

    function makeSourceCol(label, icon, sourceData) {
        if (!sourceData || Object.keys(sourceData).length === 0) return '';
        const entries = Object.entries(sourceData).sort((a, b) => b[1] - a[1]);
        const rows = entries.map(([domainId, score]) => {
            const pct = Math.round(score * 100);
            const color = DOMAIN_COLOR_MAP[domainId] || '#7BA9CC';
            const name = DOMAIN_NAME_MAP[domainId] || domainId;
            return `<div class="source-domain-row">
                <span class="source-domain-dot" style="background:${color};"></span>
                <span class="source-domain-name">${esc(name)}</span>
                <span class="source-domain-pct">${pct}%</span>
            </div>`;
        }).join('');
        return `<div class="expertise-source-col">
            <p class="work-col-title"><i class="${icon}"></i> ${label}</p>
            ${rows}
        </div>`;
    }

    const primaryBars = sorted.map(([id, score]) => makeBar(id, score, maxScore)).join('');
    const codeCol       = makeSourceCol('Code',       'fas fa-code',     bySource.code);
    const bipsCol       = makeSourceCol('BIPs',       'fas fa-scroll',   bySource.bips);
    const discussionCol = makeSourceCol('Discussion', 'fas fa-comments', bySource.discussion);
    const hasSources = codeCol || bipsCol || discussionCol;

    document.getElementById('profile-expertise-slot').innerHTML = `
        <div class="profile-section">
            <p class="section-title">Expertise Domains</p>
            <div class="expertise-grid">
                <div class="expertise-primary">
                    ${primaryBars}
                </div>
                ${hasSources ? `<div class="expertise-sources">
                    ${codeCol}
                    ${bipsCol}
                    ${discussionCol}
                </div>` : ''}
            </div>
        </div>`;
}

// ── Full profile render orchestration ─────────────────────────────────────────
function renderProfile(p) {
    document.getElementById('profile-loading').hidden = true;

    // Update page title
    document.title = `${p.display_name || 'Developer'} | Orange Dev Network`;

    renderHero(p);
    renderStatBar(p);
    renderWorkDetail(p);
    renderExpertiseSection(p);
    renderJumpNav(p);
    renderCommitChartSlot(p);
    renderBips(p);
    renderSocialFootprint(p);
    renderSocialChartSlot(p);

    // Fire-and-forget chart rendering after ECharts loads
    renderCharts(p);
}

// ── Profile loading ────────────────────────────────────────────────────────────
async function loadProfile(uuid, registryContributors) {
    // Try to find the contributor in the registry for their profile filename
    const registryEntry = registryContributors.find(c => c.uuid === uuid);
    const filename = registryEntry && registryEntry.profile_filename;

    if (filename) {
        // Try local first (symlinked output/), then CDN fallback
        try {
            const res = await fetch(PROFILE_BASE_URL + filename);
            if (!res.ok) throw new Error('local fetch failed');
            return await res.json();
        } catch (_) {
            const cdnUrl = 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/contributors/profiles/' + filename;
            const res = await fetch(cdnUrl);
            if (!res.ok) throw new Error('CDN fetch failed');
            return await res.json();
        }
    }

    // No shard: render from registry entry alone (basic profile)
    if (registryEntry) return registryEntry;

    return null;
}

// ── Developer search combobox ──────────────────────────────────────────────────
function initSearch(contributors) {
    const input    = document.getElementById('profile-search');
    const dropdown = document.getElementById('search-dropdown');
    let activeIdx  = -1;
    let matches    = [];

    function showDropdown(items) {
        matches = items;
        activeIdx = -1;
        if (!items.length) { dropdown.hidden = true; return; }
        dropdown.innerHTML = items.map((c, i) => {
            const login = (c.github && c.github.login) || c.github_login_final || '';
            const avatarSrc = login ? `https://github.com/${login}.png?size=40` : '';
            const avatarEl = avatarSrc
                ? `<img class="dd-avatar" src="${avatarSrc}" onerror="this.style.display='none'" loading="lazy">`
                : `<span class="dd-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:#94A3B8;">👤</span>`;
            return `<li data-uuid="${c.uuid}" data-idx="${i}" role="option">
                ${avatarEl}
                <span class="dd-name">${esc(c.display_name || c.uuid)}</span>
                ${login ? `<span class="dd-login">@${esc(login)}</span>` : ''}
            </li>`;
        }).join('');
        dropdown.hidden = false;
    }

    function hideDropdown() {
        dropdown.hidden = true;
        activeIdx = -1;
    }

    function setActive(idx) {
        const items = dropdown.querySelectorAll('li');
        items.forEach((el, i) => el.classList.toggle('active', i === idx));
        activeIdx = idx;
    }

    function navigate(uuid) {
        window.location.href = `profile.html?uuid=${uuid}`;
    }

    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) { hideDropdown(); return; }
        const filtered = contributors.filter(c => {
            const name  = (c.display_name || '').toLowerCase();
            const login = ((c.github && c.github.login) || c.github_login_final || '').toLowerCase();
            return name.includes(q) || login.includes(q);
        }).slice(0, 8);
        showDropdown(filtered);
    });

    input.addEventListener('keydown', e => {
        if (dropdown.hidden) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, matches.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
        else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); navigate(matches[activeIdx].uuid); }
        else if (e.key === 'Escape') hideDropdown();
    });

    dropdown.addEventListener('mousedown', e => {
        const li = e.target.closest('li[data-uuid]');
        if (li) { e.preventDefault(); navigate(li.dataset.uuid); }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-combobox')) hideDropdown();
    });
}

// ── Main entry point ───────────────────────────────────────────────────────────
async function initProfilePage() {
    const params = new URLSearchParams(window.location.search);
    const uuid   = params.get('uuid');

    const loadingEl   = document.getElementById('profile-loading');
    const notFoundEl  = document.getElementById('profile-not-found');

    if (!uuid) {
        loadingEl.hidden = true;
        notFoundEl.hidden = false;
        return;
    }

    // Fetch registry (needed for profile lookup + search autocomplete)
    let contributors = [];
    try {
        const res = await fetch(REGISTRY_URL);
        if (!res.ok) throw new Error('registry fetch failed');
        const data = await res.json();
        buildProfileDomainMaps(data.metadata?.domains);
        contributors = data.contributors || [];
    } catch (e) {
        console.warn('Registry fetch failed:', e);
    }

    // Init search immediately once registry is available
    if (contributors.length) initSearch(contributors);

    // Load and render profile
    try {
        const profile = await loadProfile(uuid, contributors);
        if (!profile) {
            loadingEl.hidden = true;
            notFoundEl.hidden = false;
            return;
        }
        renderProfile(profile);
    } catch (e) {
        console.error('Profile load error:', e);
        loadingEl.hidden = true;
        notFoundEl.hidden = false;
    }
}

document.addEventListener('DOMContentLoaded', initProfilePage);
