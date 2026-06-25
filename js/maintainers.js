const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const DATA_URL = isLocal
    ? 'output/shared/maintainers/stats_maintainers.json'
    : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/shared/maintainers/stats_maintainers.json';

// Shared Colors
const GHIBLI_PALETTE = [
    '#7BA9CC', '#B9D4E7', '#5B8266', '#A2C5AC', '#E07A5F', '#F4A261',
    '#D4AF37', '#E9C46A', '#6D597A', '#B5838D', '#3E6073', '#8BBEE8'
];

const tooltipStyle = {
    backgroundColor: '#1A202C',
    borderColor: '#2D3748',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#F7FAFC', fontFamily: 'Inter', fontSize: 13 },
    shadowBlur: 10,
    shadowColor: 'rgba(0,0,0,0.5)',
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);'
};

let maintainerData = null;
let ecosystemData = null;

async function initMaintainers() {
    try {
        window.nameToUuid = {};
        
        const registryUrl = DATA_URL.replace('maintainers/stats_maintainers.json', 'contributors/registry_index.json');
        
        const [res, regRes] = await Promise.all([
            fetch(DATA_URL + '?t=' + Date.now()),
            fetch(registryUrl).catch(() => null)
        ]);
        
        const data = await res.json();
        
        if (regRes && regRes.ok) {
            const registryData = await regRes.json();
            const contributors = registryData.contributors || [];
            window.uuidToGithub = {};
            contributors.forEach(c => {
                if (c.display_name) window.nameToUuid[c.display_name] = c.uuid;
                if (c.github_login) window.uuidToGithub[c.uuid] = c.github_login;
            });
        }
        
        maintainerData = data.maintainers.filter(m => m.active_years && m.active_years.length > 0);
        ecosystemData = data.ecosystem_committers || [];
        
        // Sort core maintainers for timeline (oldest first)
        const sortByStart = (list) => {
            return list.sort((a, b) => {
                const aStart = a.segments && a.segments.length > 0
                    ? new Date(a.segments[0].start).getFullYear()
                    : Math.min(...a.active_years);
                const bStart = b.segments && b.segments.length > 0
                    ? new Date(b.segments[0].start).getFullYear()
                    : Math.min(...b.active_years);
                return aStart - bStart;
            });
        };

        maintainerData = sortByStart(maintainerData);
        ecosystemData = sortByStart(ecosystemData);

        renderPathChart();
        renderTimelineChart();
        renderMergesChart();
        renderRosters();
    } catch (e) {
        console.error("Failed to load maintainer data:", e);
    }
}

function renderPathChart() {
    const chartDom = document.getElementById('chart-path');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom, 'dark');

    // Filter to only Core Committers for Path to Trust
    const data = maintainerData.filter(m => m.first_active_year && m.prior_authored_commits !== undefined && m.merge_authority);
    
    const seriesData = data.map(m => {
        const committerSeg = m.segments ? m.segments.find(s => s.type === 'committer') : null;
        const appointmentYear = committerSeg 
            ? new Date(committerSeg.start).getFullYear()
            : (m.segments && m.segments.length > 0 
                ? new Date(m.segments[0].start).getFullYear() 
                : (m.role && m.role.appointed ? new Date(m.role.appointed).getFullYear() : Math.min(...m.active_years)));
        
        let yearsToAppoint = Math.max(0, appointmentYear - m.first_active_year);
        let priorCommits = m.prior_authored_commits;

        // For log scale, values must be >= 1. 
        let displayCommits = Math.max(1, priorCommits);
        
        // Jiggle slightly to avoid perfect overlap. For X (linear), additive. For Y (log), multiplicative.
        let plotX = yearsToAppoint + (Math.random() - 0.5) * 0.4;
        let plotY = displayCommits * (1 + (Math.random() - 0.5) * 0.3);

        let eraColor;
        if (appointmentYear < 2015) eraColor = '#E9C46A'; // Foundational
        else if (appointmentYear < 2020) eraColor = '#7BA9CC'; // Scaling
        else eraColor = '#48BB78'; // Modern
        
        return {
            name: m.name,
            value: [plotX, plotY, m.name, m.status, m.merge_authority, m.type, m.role ? m.role.title : 'Maintainer', priorCommits, Math.max(0, appointmentYear - m.first_active_year)],
            itemStyle: {
                color: m.type === 'ecosystem' ? '#5B8266' : eraColor
            }
        };
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            formatter: function (params) {
                const p = params.value;
                const name = p[2];
                const m = maintainerData.find(x => x.name === name);
                if (!m) return '';

                const roleType = p[5] === 'ecosystem' ? `🛡️ Ecosystem (${p[6].split(' ')[0]})` : (p[4] ? '🔑 Core Committer' : '🛡️ Build Maintainer');
                
                let mergesHtml = '';
                if (m.merges_count > 0) {
                    mergesHtml = `<div style="margin-top: 6px;">Total Merges: <b>${m.merges_count}</b>`;
                    if (m.merges_ecosystem > 0) {
                        mergesHtml += ` <span style="font-size:11px;color:#cbd5e0;">(Core: ${m.merges_core}, Eco: ${m.merges_ecosystem})</span>`;
                    }
                    mergesHtml += `</div>`;
                }

                let segmentsHtml = '';
                if (m.segments && m.segments.length > 1) {
                    segmentsHtml = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.2);">
                        <div style="font-size: 11px; color: #a0aec0; margin-bottom: 2px;">Progression:</div>`;
                    m.segments.forEach(seg => {
                        const start = seg.start.split('-')[0];
                        const end = seg.end ? seg.end.split('-')[0] : 'Present';
                        const typeLabel = seg.type === 'committer' ? '🔑 Committer' : '🛡️ Build System';
                        segmentsHtml += `<div>${typeLabel} <span style="font-size:10px;color:#cbd5e0;">(${start} - ${end})</span></div>`;
                    });
                    segmentsHtml += `</div>`;
                }

                return `<div style="font-family:Inter, sans-serif;">
                    <strong style="font-size:14px;color:#fff;display:block;margin-bottom:4px;">${name}</strong>
                    <span style="font-size:11px;color:#cbd5e0;display:block;margin-bottom:8px;">${roleType}</span>
                    <div style="font-size:12px;color:#e2e8f0;display:flex;flex-direction:column;gap:2px;">
                        <div>First Active Year (Ecosystem): <b>${m.first_active_year}</b></div>
                        <div>Years Active Before Appt: <b>${p[8]}</b></div>
                        <div>Authored Commits Before Appt: <b>${p[7]}</b></div>
                        ${mergesHtml}
                    </div>
                    ${segmentsHtml}
                </div>`;
            }
        },
        grid: { left: 60, right: 40, bottom: 40, top: 20 },
        xAxis: {
            type: 'value',
            name: 'Years Active Before Appointment',
            nameLocation: 'middle',
            nameGap: 25,
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.1 } },
            axisLabel: { color: '#94A3B8' }
        },
        yAxis: {
            type: 'log',
            logBase: 10,
            min: 1,
            name: 'Prior Authored Commits (Log Scale)',
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.1 } },
            axisLabel: { color: '#94A3B8', formatter: '{value}' }
        },
        series: [{
            type: 'scatter',
            symbolSize: function (data) {
                return Math.max(10, Math.min(40, Math.sqrt(data[1]) * 1.5));
            },
            data: seriesData,
            itemStyle: { opacity: 0.8 },
            label: {
                show: true,
                formatter: '{b}',
                position: 'right',
                fontSize: 10,
                color: '#e2e8f0'
            },
            labelLayout: {
                hideOverlap: true
            },
            emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 2 } }
        }]
    };
    myChart.setOption(option);
}

function renderTimelineChart() {
    const chartDom = document.getElementById('chart-maintainers');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom, 'dark');

    // Include all maintainers for the Relay Race (Committers and Build Maintainers)
    const chartMaintainers = maintainerData;
    const names = chartMaintainers.map(m => m.name);
    const seriesData = [];
    
    // Helper to get Era Color
    const getEraColor = (m) => {
        const committerSeg = m.segments ? m.segments.find(s => s.type === 'committer') : null;
        const aptYear = committerSeg 
            ? new Date(committerSeg.start).getFullYear()
            : (m.segments && m.segments.length > 0 
                ? new Date(m.segments[0].start).getFullYear() 
                : (m.role && m.role.appointed ? new Date(m.role.appointed).getFullYear() : Math.min(...m.active_years)));
        
        if (aptYear < 2015) return '#E9C46A'; // Foundational Era (Muted Gold)
        if (aptYear < 2020) return '#7BA9CC'; // Scaling Era (Muted Blue)
        return '#48BB78'; // Modern Era (Fresh Green)
    };

    chartMaintainers.forEach((m, idx) => {
        const isLatest = m.status === 'active';
        const eraColor = getEraColor(m);
        
        if (m.segments && m.segments.length > 0) {
            m.segments.forEach(seg => {
                const startTs = new Date(seg.start).getTime();
                const endTs = seg.end ? new Date(seg.end).getTime() : new Date(2026, 11, 31).getTime();
                const isCommitter = seg.type === 'committer';

                seriesData.push({
                    name: m.name,
                    value: [idx, startTs, endTs, m.status, m.sponsor, m.merges_count || 0, isCommitter, m.type, m.role ? m.role.title : 'Maintainer'],
                    itemStyle: {
                        color: isCommitter ? eraColor : 'transparent',
                        opacity: isLatest ? 0.9 : 0.6,
                        borderType: isCommitter ? 'solid' : 'dashed',
                        borderWidth: 1.5,
                        borderColor: isCommitter ? 'transparent' : eraColor
                    }
                });
            });
        } else {
            const start = Math.min(...m.active_years);
            const end = Math.max(...m.active_years);
            const holdsKeys = m.merge_authority;
            const endTs = isLatest ? new Date(2026, 11, 31).getTime() : new Date(end, 11, 31).getTime();

            seriesData.push({
                name: m.name,
                value: [idx, new Date(start, 0, 1).getTime(), endTs, m.status, m.sponsor, m.merges_count || 0, holdsKeys, m.type, m.role ? m.role.title : 'Maintainer'],
                itemStyle: {
                    color: holdsKeys ? eraColor : 'transparent',
                    opacity: isLatest ? 0.9 : 0.6,
                    borderType: holdsKeys ? 'solid' : 'dashed',
                    borderWidth: 1.5,
                    borderColor: holdsKeys ? 'transparent' : eraColor
                }
            });
        }
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            formatter: function (params) {
                const m = chartMaintainers[params.value[0]];
                if (!m) return '';
                const holdsKeys = m.merge_authority;
                const icon = m.type === 'ecosystem' ? '🛡️' : (holdsKeys ? '🔑' : '🛡️');
                const typeLabel = m.type === 'ecosystem' ? `Ecosystem Maintainer (${m.role.title.split(' ')[0]})` : (holdsKeys ? 'Core Committer' : 'Build Maintainer');
                const roleText = m.role ? `<div style="font-size:11px; color:#a0aec0; margin-bottom:4px;">${m.role.title}</div>` : '';
                
                return `<div style="font-family:Inter, sans-serif;">
                    <strong style="font-size:14px;color:#fff;display:block;margin-bottom:2px;">${m.name}</strong>
                    ${roleText}
                    <div style="margin-top:6px; margin-bottom:8px;">
                        <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.08); color:#f7fafc; border:1px solid rgba(255,255,255,0.1);">${icon} ${typeLabel}</span>
                    </div>
                    <div style="font-size:12px;color:#e2e8f0;display:flex;flex-direction:column;gap:2px;">
                        <div>Status: <b style="text-transform: capitalize;">${m.status}</b></div>
                        <div>Sponsor: <b>${m.sponsor}</b></div>
                        <div>Merge Commits: <b>${m.merges_count || 0}</b>${(m.merges_ecosystem || 0) > 0 ? ` <span style="font-size:11px;color:#cbd5e0;">(Core: ${m.merges_core || 0}, Eco: ${m.merges_ecosystem || 0})</span>` : ''}</div>
                    </div>
                </div>`;
            }
        },
        grid: { left: 150, right: 40, bottom: 40, top: 20 },
        xAxis: {
            type: 'time', min: new Date(2009, 0, 1).getTime(),
            axisLabel: { color: '#94A3B8', fontSize: 10 },
            axisLine: { show: false },
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.1 } }
        },
        yAxis: {
            type: 'category', data: names,
            axisLabel: { fontSize: 11, fontWeight: 500, color: '#e2e8f0' },
            axisLine: { show: false }, axisTick: { show: false }
        },
        series: [{
            type: 'custom',
            renderItem: function (params, api) {
                const categoryIndex = api.value(0);
                const start = api.coord([api.value(1), categoryIndex]), end = api.coord([api.value(2), categoryIndex]);
                const height = api.size([0, 1])[1] * 0.5;
                const holdsKeys = api.value(6);
                const isEcosystem = api.value(7) === 'ecosystem';

                return {
                    type: 'rect',
                    shape: { x: start[0], y: start[1] - height / 2, width: Math.max(end[0] - start[0], 4), height: height, r: 4 },
                    style: {
                        ...api.style(),
                        fill: api.style().fill,
                        stroke: api.style().stroke,
                        lineWidth: 1.5
                    }
                };
            },
            encode: { x: [1, 2], y: 0 },
            data: seriesData
        }]
    };
    myChart.setOption(option);
}

function renderMergesChart() {
    const chartDom = document.getElementById('chart-merges');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom, 'dark');

    // Combine both core and ecosystem maintainers
    const allData = [...maintainerData, ...ecosystemData];
    
    // Sort by merge count desc
    const sorted = [...allData].sort((a, b) => (b.merges_count || 0) - (a.merges_count || 0)).filter(m => (m.merges_count || 0) > 0);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                const name = params[0].name;
                const m = sorted.find(x => x.name === name);
                if(!m) return name;
                
                let html = `<div style="font-weight:700; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #334155">${name}</div>`;
                
                const preTotal = (m.prior_authored_commits||0) + (m.prior_review_count||0);
                if (preTotal > 0) {
                    html += `<div style="color:#94a3b8; font-size:11px; margin-top:4px;">PRE-APPOINTMENT</div>`;
                    html += `Authored: <b>${((m.prior_authored_commits||0)/preTotal*100).toFixed(1)}%</b> <span style="color:#64748b; font-size:11px;">(${m.prior_authored_commits||0})</span><br/>`;
                    html += `Reviews: <b>${((m.prior_review_count||0)/preTotal*100).toFixed(1)}%</b> <span style="color:#64748b; font-size:11px;">(${m.prior_review_count||0})</span><br/>`;
                } else {
                    html += `<div style="color:#94a3b8; font-size:11px; margin-top:4px;">PRE-APPOINTMENT</div>`;
                    html += `<span style="color:#64748b; font-size:11px;">No prior activity tracked</span><br/>`;
                }
                
                const postTotal = (m.post_authored_commits||0) + (m.post_review_count||0) + (m.merges_count||0);
                if (postTotal > 0) {
                    html += `<div style="color:#94a3b8; font-size:11px; margin-top:8px;">POST-APPOINTMENT</div>`;
                    html += `Authored: <b>${((m.post_authored_commits||0)/postTotal*100).toFixed(1)}%</b> <span style="color:#64748b; font-size:11px;">(${m.post_authored_commits||0})</span><br/>`;
                    html += `Reviews: <b>${((m.post_review_count||0)/postTotal*100).toFixed(1)}%</b> <span style="color:#64748b; font-size:11px;">(${m.post_review_count||0})</span><br/>`;
                    html += `Merges: <b>${((m.merges_count||0)/postTotal*100).toFixed(1)}%</b> <span style="color:#64748b; font-size:11px;">(${m.merges_count||0})</span><br/>`;
                }
                
                return html;
            }
        },
        legend: {
            data: ['Authored (Pre)', 'Reviews (Pre)', 'Authored (Post)', 'Reviews (Post)', 'Merges (Post)'],
            textStyle: { color: '#cbd5e0' },
            bottom: 0,
            itemWidth: 12,
            itemHeight: 12
        },
        grid: { left: 160, right: 40, bottom: 60, top: 20 },
        xAxis: {
            type: 'value',
            max: 100,
            axisLabel: { color: '#94A3B8', formatter: '{value}%' },
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.1 } }
        },
        yAxis: {
            type: 'category',
            data: sorted.map(m => m.name),
            axisLabel: { color: '#e2e8f0', fontWeight: 'bold' },
            axisLine: { show: false }, axisTick: { show: false }
        },
        series: [
            // --- PRE-APPOINTMENT BAR ---
            {
                name: 'Authored (Pre)',
                type: 'bar',
                stack: 'pre',
                barWidth: 10,
                itemStyle: { color: 'rgba(109, 89, 122, 0.7)' },
                data: sorted.map(m => {
                    const t = (m.prior_authored_commits||0) + (m.prior_review_count||0);
                    return t > 0 ? ((m.prior_authored_commits||0)/t*100).toFixed(2) : 0;
                })
            },
            {
                name: 'Reviews (Pre)',
                type: 'bar',
                stack: 'pre',
                barWidth: 10,
                itemStyle: { color: 'rgba(56, 161, 105, 0.4)' },
                data: sorted.map(m => {
                    const t = (m.prior_authored_commits||0) + (m.prior_review_count||0);
                    return t > 0 ? ((m.prior_review_count||0)/t*100).toFixed(2) : 0;
                })
            },
            // --- POST-APPOINTMENT BAR ---
            {
                name: 'Authored (Post)',
                type: 'bar',
                stack: 'post',
                barWidth: 10,
                itemStyle: { color: 'rgba(109, 89, 122, 1)' },
                data: sorted.map(m => {
                    const t = (m.post_authored_commits||0) + (m.post_review_count||0) + (m.merges_count||0);
                    return t > 0 ? ((m.post_authored_commits||0)/t*100).toFixed(2) : 0;
                })
            },
            {
                name: 'Reviews (Post)',
                type: 'bar',
                stack: 'post',
                barWidth: 10,
                itemStyle: { color: 'rgba(56, 161, 105, 0.8)' },
                data: sorted.map(m => {
                    const t = (m.post_authored_commits||0) + (m.post_review_count||0) + (m.merges_count||0);
                    return t > 0 ? ((m.post_review_count||0)/t*100).toFixed(2) : 0;
                })
            },
            {
                name: 'Merges (Post)',
                type: 'bar',
                stack: 'post',
                barWidth: 10,
                itemStyle: { color: '#E8916B' }, // distinct bright color for merges
                data: sorted.map(m => {
                    const t = (m.post_authored_commits||0) + (m.post_review_count||0) + (m.merges_count||0);
                    return t > 0 ? ((m.merges_count||0)/t*100).toFixed(2) : 0;
                })
            }
        ]
    };
    myChart.setOption(option);
    
    window.addEventListener('resize', () => {
        myChart.resize();
    });
}

function renderRosters() {
    // 1. Render Core Active Roster
    const coreGrid = document.getElementById('roster-grid');
    if (coreGrid) {
        const actives = maintainerData.filter(m => m.status === 'active' && m.merge_authority === true);
        coreGrid.innerHTML = buildRosterHtml(actives);
    }
    
    // 2. Render Ecosystem Roster
    const ecoGrid = document.getElementById('ecosystem-roster-grid');
    if (ecoGrid) {
        ecoGrid.innerHTML = buildRosterHtml(ecosystemData);
    }

    // 3. Render Build & Security Roster
    const buildGrid = document.getElementById('build-roster-grid');
    if (buildGrid) {
        const buildMaintainers = maintainerData.filter(m => !m.merge_authority && m.status === 'active');
        if (buildMaintainers.length > 0) {
            buildGrid.innerHTML = buildRosterHtml(buildMaintainers);
        } else {
            const container = document.getElementById('build-roster-container');
            if (container) container.style.display = 'none';
        }
    }


}

function buildRosterHtml(list) {
    let html = '';
    list.forEach(m => {
        const isEco = m.type === 'ecosystem';
        const authClass = isEco ? 'auth-ecosystem' : (m.merge_authority ? 'auth-committer' : 'auth-build');
        const authLabel = isEco ? `🛡️ Ecosystem (${m.role.title.split(' ')[0]})` : (m.merge_authority ? '🔑 Core Committer' : '🛡️ Build Maintainer');
        const uuid = window.nameToUuid && window.nameToUuid[m.name] ? window.nameToUuid[m.name] : (m.id || m.name);
        
        let githubLogin = window.uuidToGithub && window.uuidToGithub[uuid] ? window.uuidToGithub[uuid] : m.id;
        const avatarUrl = `https://github.com/${githubLogin}.png?size=80`;

        html += `
            <div class="maintainer-card glassman-card">
                <img src="${avatarUrl}" class="maintainer-avatar" onerror="this.outerHTML='<div class=\\'maintainer-avatar-placeholder\\'><i class=\\'fas fa-user-circle\\'></i></div>'" alt="${m.name}" />
                <div class="maintainer-info">
                    <div class="maintainer-header">
                        <h4 class="maintainer-name"><a href="profile.html?uuid=${encodeURIComponent(uuid)}" style="color: inherit; text-decoration: none;" class="hover-underline">${m.name}</a></h4>
                        <div class="maintainer-status status-${m.status}">${m.status}</div>
                    </div>
                    <div class="maintainer-role">${m.role ? m.role.title : 'Maintainer'}</div>
                    <div class="maintainer-meta">
                        <div class="maintainer-sponsor"><i class="fas fa-building"></i> ${m.sponsor}</div>
                        <div class="maintainer-authority ${authClass}">${authLabel}</div>
                    </div>
                </div>
            </div>
        `;
    });
    return html;
}

document.addEventListener('DOMContentLoaded', initMaintainers);
