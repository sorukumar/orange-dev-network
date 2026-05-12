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
        renderMetrics(stats);
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
    if (insightEl) {
        insightEl.innerText = `Currently ${allFourValue} contributors span all four domains.`;
    }

    listEl.innerHTML = values.map(item => {
        const value = item.value != null ? item.value.toLocaleString() : '–';
        return `<li><strong>${item.label}:</strong> ${value}<span>${item.note}</span></li>`;
    }).join('');
}

function renderMetrics(stats) {
    if (!stats.rd_focus || Object.keys(stats.rd_focus).length === 0) return;
    
    // 1. R&D Focus
    const focusContainer = document.getElementById('focus-metric');
    const rd = stats.rd_focus;
    // Skip unmapped / generic labels that pollute the chart
    const SKIP_FOCUS = new Set(['Other', 'General', 'None', 'none', 'code', 'other']);
    const sortedEntries = Object.entries(rd)
        .filter(e => !SKIP_FOCUS.has(e[0]))
        .sort((a, b) => b[1] - a[1]);
        
    const topFocus = sortedEntries.slice(0, 5);
    
    if (topFocus.length > 0) {
        document.getElementById('rd-focus-val').innerText = `${topFocus[0][0]}`;
        document.getElementById('rd-focus-sub').innerText = `Leading technical domain (${topFocus[0][1]}%)`;
        
        const bar = document.getElementById('focus-bar');
        bar.innerHTML = '';
        const colors = ['var(--primary)', 'var(--color-wallet)', 'var(--color-l2)', 'var(--color-privacy)', 'var(--color-script)'];
        topFocus.forEach((f, i) => {
            const seg = document.createElement('div');
            seg.className = 'focus-segment';
            seg.style.width = `${f[1]}%`;
            seg.style.background = colors[i] || 'var(--text-secondary)';
            seg.title = `${f[0]}: ${f[1]}%`;
            bar.appendChild(seg);
        });
    }

    // 2. Onboarding — show breakdown: new code contributors + new discussion voices
    if (stats.onboarding) {
        const ob = stats.onboarding;
        // Support both new field (new_coders_90d / new_discussants_90d) and old (new_last_30d)
        const coders = ob.new_coders_90d != null ? ob.new_coders_90d : (ob.new_last_30d || 0);
        const discussants = ob.new_discussants_90d || 0;
        const total = coders + discussants;
        document.getElementById('onboarding-val').innerText = total.toLocaleString();
        const parts = [];
        if (coders > 0) parts.push(`${coders} code`);
        if (discussants > 0) parts.push(`${discussants} discussion`);
        const detail = parts.length > 0
            ? parts.join(' · ') + ` · new contributors (${ob.window_days || 90} days)`
            : 'No new contributors in the last 90 days';
        document.getElementById('onboarding-sub').innerText = detail;
    }
    
    // 3. Discussion Pulse (replaces single hotspot)
    if (stats.discussion_pulse) {
        renderDiscussionPulse(stats.discussion_pulse);
    } else if (stats.hotspot && stats.hotspot.value) {
        // Fallback for older cached ecosystem_summary.json
        const el = document.getElementById('discussion-pulse-list');
        if (el) el.innerHTML = `<div class="metric-value">${stats.hotspot.value}</div>`;
    }
}

function renderDiscussionPulse(pulse) {
    // --- Topic bars ---
    const topicsEl = document.getElementById('discussion-pulse-list');
    if (topicsEl && pulse.topics && pulse.topics.length > 0) {
        const maxShare = pulse.topics[0].share;
        topicsEl.innerHTML = pulse.topics.map((t, i) => {
            const colors = ['var(--primary)', 'var(--color-l2)', 'var(--color-script)'];
            const color = colors[i] || 'var(--text-secondary)';
            const barWidth = maxShare > 0 ? Math.round((t.share / maxShare) * 100) : 0;
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:13px; font-weight:600;">${t.label}</span>
                        <span style="font-size:11px; color:var(--text-secondary);">${t.count.toLocaleString()} msgs &nbsp;<span style="color:${color}; font-weight:700;">${t.share}%</span></span>
                    </div>
                    <div style="background:rgba(255,255,255,0.06); border-radius:4px; height:5px; overflow:hidden;">
                        <div style="width:${barWidth}%; height:100%; background:${color}; border-radius:4px; transition: width 0.6s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Top BIPs mini-list ---
    const bipsEl = document.getElementById('discussion-bips');
    if (bipsEl && pulse.top_bips && pulse.top_bips.length > 0) {
        bipsEl.innerHTML = `
            <div style="font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary); margin-bottom:8px;">Most Referenced BIPs</div>
            ${pulse.top_bips.map(b => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px;">
                    <span style="color:var(--bitcoin-orange); font-weight:700; min-width:48px;">BIP ${b.bip_id}</span>
                    <span style="color:var(--text-secondary); flex:1; padding: 0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.title}</span>
                    <span style="color:var(--text-secondary); font-size:11px;">${b.mentions.toLocaleString()}</span>
                </div>
            `).join('')}
        `;
    }
}

document.addEventListener('DOMContentLoaded', initLanding);
