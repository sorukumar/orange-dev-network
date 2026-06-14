/**
 * Ecosystem Portal - Landing Page Logic
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SHARED_BASE = isLocal
    ? 'output/shared/'
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/';

const STATS_URL = SHARED_BASE + 'ecosystem_summary.json';
const SNAPSHOT_URL = SHARED_BASE + 'network_home_snapshot.json';

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
}

function renderDomainSummary(stats) {
    const listEl = document.getElementById('domain-count-list');
    const insightEl = document.getElementById('summary-insight');
    if (!listEl) return;

    const groups = stats.groups || {};
    const vennSummary = stats.venn_summary || {};
    const values = [
        { label: 'Code contributors', value: groups.committers, note: 'Git committers and core PR participants' },
        { label: 'Review contributors', value: groups.reviewers, note: 'Peer review and code feedback contributors' },
        { label: 'Research contributors', value: groups.research, note: 'Mailing list and Delving discussion participants' },
        { label: 'BIP authors', value: groups.standards, note: 'Standards authors and protocol specification contributors' },
        { label: 'All four domains', value: vennSummary.all_four, note: 'People active in Code, Review, Research, and Standards' }
    ];

    const allFourValue = vennSummary.all_four != null ? vennSummary.all_four.toLocaleString() : '—';
    const totalDevs = groups.total_registry || groups.total_active;
    const totalStr  = totalDevs ? totalDevs.toLocaleString() : null;
    if (insightEl) {
        insightEl.innerText = totalStr
            ? `Out of ${totalStr} developers tracked, ${allFourValue} have contributed across all four domains.`
            : `Currently ${allFourValue} contributors span all four domains.`;
    }

    listEl.innerHTML = values.map(item => {
        const value = item.value != null ? item.value.toLocaleString() : '–';
        return `<li><strong>${item.label}:</strong> ${value}<span>${item.note}</span></li>`;
    }).join('');

}

function renderFreshnessLine(stats, snapshot) {
    const el = document.getElementById('freshness-line');
    if (!el) return;

    const generated = (stats && stats.generated_at) || (snapshot && snapshot.generated_at);
    const count = snapshot ? snapshot.contributors_tracked : null;

    const stamp = generated ? formatMonthYear(generated) : 'Unknown date';
    const countText = count != null ? count.toLocaleString() : 'N/A';
    el.textContent = `Updated ${stamp} | ${countText} contributors tracked`;
}



function formatMonthYear(input) {
    const d = new Date(input);
    if (!Number.isFinite(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
