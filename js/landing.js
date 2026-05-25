/**
 * Ecosystem Portal - Landing Page Logic
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const STATS_URL = isLocal 
    ? 'output/shared/ecosystem_summary.json' 
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/ecosystem_summary.json';

async function initLanding() {
    try {
        const response = await fetch(STATS_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const stats = await response.json();
        
        renderDomainSummary(stats);
    } catch (error) {
        console.error("Failed to load ecosystem stats:", error);
        const listEl = document.getElementById('domain-count-list');
        if (listEl) {
            listEl.innerHTML = '<li>Unable to load contributor counts at this time.</li>';
        }
    }
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

    // Onboarding note — folded into this section, no separate card needed
    const noteEl = document.getElementById('onboarding-note');
    if (noteEl && stats.onboarding) {
        const ob = stats.onboarding;
        const coders = ob.new_coders_90d != null ? ob.new_coders_90d : 0;
        const discussants = ob.new_discussants_90d || 0;
        const total = coders + discussants;
        const days = ob.window_days || 90;
        const parts = [];
        if (coders > 0) parts.push(`${coders} new coders`);
        if (discussants > 0) parts.push(`${discussants} new researchers and discussants`);
        if (total > 0) {
            noteEl.innerHTML = `<i class="fas fa-arrow-up" style="color:#10B981; margin-right:6px;"></i>${parts.join(' and ')} joined in the last ${days} days.`;
        }
    }
}

document.addEventListener('DOMContentLoaded', initLanding);
