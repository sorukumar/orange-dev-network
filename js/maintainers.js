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
let selfMergeData = null;
let sankeyData = null;

async function initMaintainers() {
    try {
        window.nameToUuid = {};
        
        const registryUrl = DATA_URL.replace('maintainers/stats_maintainers.json', 'contributors/registry_index.json');
        const selfMergesUrl = isLocal
            ? 'output/network/stats_self_merges.json'
            : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/network/stats_self_merges.json';
        const sankeyUrl = isLocal
            ? 'output/network/sankey_maintainers.json'
            : 'https://raw.githubusercontent.com/sorukumar/orange-dev-data/main/output/network/sankey_maintainers.json';
        
        const [res, regRes, smRes, sankeyRes] = await Promise.all([
            fetch(DATA_URL + '?t=' + Date.now()),
            fetch(registryUrl).catch(() => null),
            fetch(selfMergesUrl + '?t=' + Date.now()).catch(() => null),
            fetch(sankeyUrl + '?t=' + Date.now()).catch(() => null)
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
        
        if (smRes && smRes.ok) {
            const smData = await smRes.json();
            selfMergeData = smData.self_merges || [];
        } else {
            selfMergeData = [];
        }
        
        if (sankeyRes && sankeyRes.ok) {
            sankeyData = await sankeyRes.json();
        }
        
        maintainerData = data.maintainers.filter(m => m.active_years && m.active_years.length > 0);
        
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

        renderPathChart();
        renderTimelineChart();
        renderMergesChart();
        renderSelfMergeChart('1yr');
        renderSankeyChart('1yr');
        renderMergeDistributionChart('1yr');
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
    
    const foundationalData = [];
    const scalingData = [];
    const modernData = [];

    data.forEach(m => {
        const committerSeg = m.segments ? m.segments.find(s => s.type === 'committer') : null;
        const appointmentYear = committerSeg 
            ? new Date(committerSeg.start).getFullYear()
            : (m.segments && m.segments.length > 0 
                ? new Date(m.segments[0].start).getFullYear() 
                : (m.role && m.role.appointed ? new Date(m.role.appointed).getFullYear() : Math.min(...m.active_years)));
        
        let yearsToAppoint = Math.max(0, appointmentYear - m.first_active_year);
        let priorCommits = m.prior_authored_commits;

        let displayCommits = Math.max(1, priorCommits);
        let plotX = yearsToAppoint + (Math.random() - 0.5) * 0.4;
        let plotY = displayCommits * (1 + (Math.random() - 0.5) * 0.3);

        const dataPoint = {
            name: m.name,
            value: [plotX, plotY, m.name, m.status, m.merge_authority, m.type, m.role ? m.role.title : 'Maintainer', priorCommits, Math.max(0, appointmentYear - m.first_active_year), m.prior_authored_bips || 0, m.prior_review_count || 0, m.sponsor || 'Independent', appointmentYear]
        };

        if (appointmentYear < 2015) {
            foundationalData.push(dataPoint);
        } else if (appointmentYear < 2020) {
            scalingData.push(dataPoint);
        } else {
            modernData.push(dataPoint);
        }
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
                    <div style="font-size:12px;color:#e2e8f0;display:flex;flex-direction:column;gap:4px;">
                        <div>First Active Year: <b>${m.first_active_year}</b> | Appointed: <b>${p[12]}</b></div>
                        <div>Sponsor at Appt: <b>${p[11]}</b></div>
                        <div style="color:#94a3b8; font-size:11px; margin-top:2px;">Prior Activity: Authored Commits: <b>${p[7]}</b> | Reviews: <b>${p[10]}</b> | BIPs: <b>${p[9]}</b></div>
                    </div>
                    ${segmentsHtml}
                </div>`;
            }
        },
        grid: { left: 60, right: 120, bottom: 40, top: 40 },
        legend: {
            show: true,
            top: 0,
            textStyle: { color: '#cbd5e0', fontSize: 11 },
            itemWidth: 12,
            itemHeight: 12
        },
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
        series: [
            {
                name: 'Foundational Era (<2015)',
                type: 'scatter',
                symbolSize: 20,
                data: foundationalData,
                itemStyle: { opacity: 0.8, color: '#E9C46A' },
                label: { show: true, formatter: '{b}', position: 'right', fontSize: 10, color: '#e2e8f0' },
                labelLayout: { hideOverlap: true },
                emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 2 } }
            },
            {
                name: 'Scaling Era (2015-2019)',
                type: 'scatter',
                symbolSize: 20,
                data: scalingData,
                itemStyle: { opacity: 0.8, color: '#7BA9CC' },
                label: { show: true, formatter: '{b}', position: 'right', fontSize: 10, color: '#e2e8f0' },
                labelLayout: { hideOverlap: true },
                emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 2 } }
            },
            {
                name: 'Modern Era (2020+)',
                type: 'scatter',
                symbolSize: 20,
                data: modernData,
                itemStyle: { opacity: 0.8, color: '#48BB78' },
                label: { show: true, formatter: '{b}', position: 'right', fontSize: 10, color: '#e2e8f0' },
                labelLayout: { hideOverlap: true },
                emphasis: { focus: 'series', itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 2 } }
            }
        ]
    };
    myChart.setOption(option);
}

function renderTimelineChart() {
    const chartDom = document.getElementById('chart-maintainers');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom, 'dark');

    // Include all core/subsystem maintainers for the Relay Race, except those explicitly excluded
    const excludeNames = ['Carl Dong', 'Cory Fields'];
    const chartMaintainers = maintainerData.filter(m => m.type === 'core' && !excludeNames.includes(m.name));
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

    // Combine both core and ecosystem maintainers if needed, but we decided to focus on core
    const allData = maintainerData.filter(m => m.type === 'core');
    
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
    
    // Ecosystem roster removed by HTML update
    
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

function renderSelfMergeChart(period = '1yr') {
    const chartDom = document.getElementById('chart-self-merge');
    if (!chartDom) return;
    
    let myChart = echarts.getInstanceByDom(chartDom);
    if (!myChart) {
        myChart = echarts.init(chartDom, 'dark');
        window.addEventListener('resize', () => myChart.resize());
        
        // Setup toggle listeners
        const toggles = document.querySelectorAll('.sm-time-toggles .sm-period-btn');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toggles.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.borderColor = 'transparent';
                    t.style.color = '#a0aec0';
                });
                const target = e.currentTarget;
                target.classList.add('active');
                target.style.background = 'rgba(255,255,255,0.1)';
                target.style.borderColor = 'rgba(255,255,255,0.2)';
                target.style.color = '#fff';
                
                const newPeriod = target.getAttribute('data-period');
                document.getElementById('self-merge-details').innerHTML = '';
                const instr = document.getElementById('sm-instruction');
                if(instr) instr.style.display = 'block';
                renderSelfMergeChart(newPeriod);
            });
        });

        // Setup click listener on chart to filter PRs
        myChart.on('click', function(params) {
            const maintainerName = params.name;
            renderSelfMergeDetails(maintainerName, myChart.currentPeriodData);
        });
    }

    // Time filtering logic
    const now = new Date();
    let cutoffDate = null;
    if (period === '1yr') cutoffDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
    else if (period === '3yr') cutoffDate = new Date(new Date().setFullYear(now.getFullYear() - 3));
    else if (period === '5yr') cutoffDate = new Date(new Date().setFullYear(now.getFullYear() - 5));
    
    // Only include main repo PRs for the Radical Transparency chart
    let filteredPRs = (selfMergeData || []).filter(pr => pr.repository === 'bitcoin/bitcoin');
    if (cutoffDate) {
        filteredPRs = filteredPRs.filter(pr => new Date(pr.merged_at) >= cutoffDate);
    }

    // Group PRs by maintainer and category
    const categorized = {};
    filteredPRs.forEach(pr => {
        const mName = pr.maintainer_name;
        if (!categorized[mName]) categorized[mName] = { "Ninja Merge": [], "Light Review": [], "Administrative Merge": [] };
        if (categorized[mName][pr.category]) {
            categorized[mName][pr.category].push(pr);
        }
    });

    // Find maintainers to show: any maintainer with > 0 self merges in the period.
    const chartMaintainers = Object.keys(categorized).map(name => {
        const m = maintainerData.find(x => x.name === name);
        return m || null;
    }).filter(m => m !== null);
    
    // Sort maintainers by total self-merges in this period (descending)
    chartMaintainers.sort((a, b) => {
        const totalA = Object.values(categorized[a.name]).reduce((sum, arr) => sum + arr.length, 0);
        const totalB = Object.values(categorized[b.name]).reduce((sum, arr) => sum + arr.length, 0);
        return totalB - totalA;
    });

    myChart.currentPeriodData = categorized; // store for click handler

    const names = chartMaintainers.map(m => m.name);
    
    // Calculate values for stacked bars
    const ninjaData = names.map(name => categorized[name]["Ninja Merge"].length);
    const lightData = names.map(name => categorized[name]["Light Review"].length);
    const adminData = names.map(name => categorized[name]["Administrative Merge"].length);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        grid: { left: 140, right: 40, bottom: 20, top: 20, containLabel: true },
        xAxis: {
            type: 'value',
            name: 'Number of PRs',
            axisLabel: { color: '#94A3B8' },
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.1 } }
        },
        yAxis: {
            type: 'category',
            data: names,
            inverse: true, // Largest at the top
            axisLabel: { color: '#e2e8f0', fontWeight: 'bold' },
            axisLine: { show: false }, axisTick: { show: false }
        },
        series: [
            {
                name: 'Ninja Merge',
                type: 'bar',
                stack: 'total',
                barWidth: '40%',
                itemStyle: { color: '#E53E3E' },
                data: ninjaData
            },
            {
                name: 'Light Review',
                type: 'bar',
                stack: 'total',
                itemStyle: { color: '#D69E2E' },
                data: lightData
            },
            {
                name: 'Administrative Merge',
                type: 'bar',
                stack: 'total',
                itemStyle: { color: '#48BB78' },
                data: adminData
            }
        ]
    };
    myChart.setOption(option, true);
}

function renderSelfMergeDetails(maintainerName, categorizedData) {
    const instr = document.getElementById('sm-instruction');
    if(instr) instr.style.display = 'none';
    
    const detailsContainer = document.getElementById('self-merge-details');
    const mData = categorizedData[maintainerName];
    if (!mData) {
        detailsContainer.innerHTML = '';
        return;
    }
    
    const ninjaCount = mData["Ninja Merge"].length;
    const lightCount = mData["Light Review"].length;
    const adminCount = mData["Administrative Merge"].length;
    
    let html = `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
            <h4 style="margin: 0 0 15px 0; color: #fff;">${maintainerName} <span style="font-size: 11px; color: #94a3b8; font-weight: normal;">(${ninjaCount + lightCount + adminCount} PRs)</span></h4>
            <div style="font-size: 12px; color: #cbd5e0; display: flex; flex-direction: column; gap: 8px;">
    `;
    
    if (ninjaCount > 0) {
        html += mData["Ninja Merge"].map(pr => {
            const dateStr = pr.merged_at ? pr.merged_at.split('T')[0] : 'Unknown';
            return `<div><span style="color:#E53E3E; font-weight:600; display:inline-block; width:65px;">[Ninja]</span> <a href="${pr.url}" target="_blank" style="color: #63b3ed; text-decoration: none;">#${pr.pr_number}</a> <span style="opacity:0.8">${pr.title}</span> <span style="color:#64748b;font-size:11px;">(${dateStr})</span></div>`;
        }).join('');
    }
    if (lightCount > 0) {
        html += mData["Light Review"].map(pr => {
            const dateStr = pr.merged_at ? pr.merged_at.split('T')[0] : 'Unknown';
            return `<div><span style="color:#D69E2E; font-weight:600; display:inline-block; width:65px;">[Light]</span> <a href="${pr.url}" target="_blank" style="color: #63b3ed; text-decoration: none;">#${pr.pr_number}</a> <span style="opacity:0.8">${pr.title}</span> <span style="color:#64748b;font-size:11px;">(${dateStr})</span></div>`;
        }).join('');
    }
    if (adminCount > 0) {
        html += mData["Administrative Merge"].map(pr => {
            const dateStr = pr.merged_at ? pr.merged_at.split('T')[0] : 'Unknown';
            return `<div><span style="color:#48BB78; font-weight:600; display:inline-block; width:65px;">[Admin]</span> <a href="${pr.url}" target="_blank" style="color: #63b3ed; text-decoration: none;">#${pr.pr_number}</a> <span style="opacity:0.8">${pr.title}</span> <span style="color:#64748b;font-size:11px;">(${dateStr})</span></div>`;
        }).join('');
    }
    
    html += `</div></div>`;
    detailsContainer.innerHTML = html;
}

function renderMergeDistributionChart(period = '1yr') {
    const chartDom = document.getElementById('chart-merge-distribution');
    if (!chartDom) return;
    
    let myChart = echarts.getInstanceByDom(chartDom);
    if (!myChart) {
        myChart = echarts.init(chartDom, 'dark');
        window.addEventListener('resize', () => myChart.resize());
        
        // Setup toggle listeners
        const toggles = document.querySelectorAll('.merge-time-toggles .period-btn');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toggles.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.borderColor = 'transparent';
                    t.style.color = '#a0aec0';
                });
                const target = e.currentTarget;
                target.classList.add('active');
                target.style.background = 'rgba(255,255,255,0.1)';
                target.style.borderColor = 'rgba(255,255,255,0.2)';
                target.style.color = '#fff';
                
                const newPeriod = target.getAttribute('data-period');
                renderMergeDistributionChart(newPeriod);
            });
        });
    }

    let valKey = 'merges_count';
    if (period === '1yr') valKey = 'merges_1_yr';
    else if (period === '3yr') valKey = 'merges_3_yr';
    else if (period === '5yr') valKey = 'merges_5_yr';

    const activeMaintainers = maintainerData.filter(m => m[valKey] > 0);
    
    const maintainerColors = {};
    maintainerData.forEach((m, i) => {
        maintainerColors[m.name] = GHIBLI_PALETTE[i % GHIBLI_PALETTE.length];
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            trigger: 'item',
            formatter: '{b}: {c} Merges ({d}%)'
        },
        legend: {
            bottom: 0,
            textStyle: { color: '#cbd5e0' },
            data: activeMaintainers.map(m => m.name)
        },
        series: [
            {
                name: 'Merge Distribution',
                type: 'pie',
                radius: ['40%', '70%'],
                minAngle: 5,
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#1A202C',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#fff'
                    }
                },
                labelLine: {
                    show: false
                },
                data: activeMaintainers.map(m => ({
                    name: m.name,
                    value: m[valKey],
                    itemStyle: { color: maintainerColors[m.name] }
                }))
            }
        ]
    };
    myChart.setOption(option, true);
}

function renderSponsorshipChart(data) {
    const chartDom = document.getElementById('chart-sponsorship');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom, 'dark');

    // Filter to last 5 years logic could be applied here if we had date-specific data.
    const activeMaintainers = maintainerData.filter(m => m.merges_count > 0);
    
    const nodes = [];
    const links = [];
    const nodeMap = new Set();
    
    // Add Sponsor Nodes
    const sponsors = {};
    activeMaintainers.forEach(m => {
        const s = m.sponsor || 'Independent';
        sponsors[s] = (sponsors[s] || 0) + m.merges_count;
    });
    
    Object.keys(sponsors).forEach(s => {
        nodes.push({ name: s, itemStyle: { color: '#7BA9CC' } });
        nodeMap.add(s);
    });
    
    // Add Maintainer Nodes & Links
    activeMaintainers.forEach(m => {
        const s = m.sponsor || 'Independent';
        const mName = m.name;
        
        if (!nodeMap.has(mName)) {
            nodes.push({ name: mName, itemStyle: { color: '#E9C46A' } });
            nodeMap.add(mName);
        }
        
        links.push({
            source: s,
            target: mName,
            value: m.merges_count
        });
        
        // Flow to Output
        const outputNode = 'Merges';
        if (!nodeMap.has(outputNode)) {
            nodes.push({ name: outputNode, itemStyle: { color: '#48BB78' } });
            nodeMap.add(outputNode);
        }
        
        links.push({
            source: mName,
            target: outputNode,
            value: m.merges_count
        });
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            trigger: 'item',
            triggerOn: 'mousemove'
        },
        series: {
            type: 'sankey',
            layout: 'none',
            emphasis: {
                focus: 'adjacency'
            },
            nodeAlign: 'left',
            data: nodes,
            links: links,
            lineStyle: {
                color: 'source',
                curveness: 0.5,
                opacity: 0.3
            },
            itemStyle: {
                borderWidth: 1,
                borderColor: '#1A202C'
            },
            label: {
                color: '#e2e8f0',
                fontFamily: 'Inter',
                fontSize: 12
            }
        }
    };
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}
function renderSankeyChart(period = '1yr') {
    const chartDom = document.getElementById('chart-sankey');
    if (!chartDom || !sankeyData) return;
    
    let myChart = echarts.getInstanceByDom(chartDom);
    if (!myChart) {
        myChart = echarts.init(chartDom, 'dark');
        window.addEventListener('resize', () => myChart.resize());
        
        const toggles = document.querySelectorAll('.sankey-time-toggles .sankey-period-btn');
        toggles.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toggles.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.borderColor = 'transparent';
                    t.style.color = '#a0aec0';
                });
                const target = e.target;
                target.classList.add('active');
                target.style.background = 'rgba(255,255,255,0.1)';
                target.style.borderColor = 'rgba(255,255,255,0.2)';
                target.style.color = '#fff';
                
                renderSankeyChart(target.dataset.period);
            });
        });
    }

    const dataObj = sankeyData.periods[period];
    if (!dataObj || !dataObj.nodes || dataObj.nodes.length === 0) {
        myChart.clear();
        return;
    }

    const nodes = dataObj.nodes.map(node => {
        let color = '#E8916B'; 
        if (node.category === 0) {
            color = node.name === 'Independent' ? '#718096' : '#4299E1';
        } else if (node.category === 2) {
            const idx = node.name.length % GHIBLI_PALETTE.length;
            color = GHIBLI_PALETTE[idx];
        }
        return {
            name: node.name,
            itemStyle: { color: color }
        };
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            ...tooltipStyle,
            trigger: 'item',
            formatter: function(params) {
                if (params.dataType === 'node') {
                    return `${params.name}: ${params.value} Influence Points`;
                } else {
                    return `${params.data.source} → ${params.data.target}<br/><b>${params.value}</b> Influence Points`;
                }
            }
        },
        series: [
            {
                type: 'sankey',
                layout: 'none',
                emphasis: { focus: 'adjacency' },
                nodeAlign: 'justify',
                data: nodes,
                links: dataObj.links,
                lineStyle: { color: 'source', curveness: 0.5, opacity: 0.3 },
                itemStyle: { borderWidth: 1, borderColor: '#1A202C' },
                label: { color: '#e2e8f0', fontFamily: 'Inter', fontSize: 12 }
            }
        ]
    };
    
    myChart.setOption(option, true);
}

document.addEventListener('DOMContentLoaded', initMaintainers);
