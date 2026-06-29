document.addEventListener('DOMContentLoaded', () => {
    if (typeof BitcoinLabsApp !== 'undefined') {
        BitcoinLabsApp.init({
            isApp: true,
            appName: 'orange-dev-network',
            appHomeUrl: 'index.html',
            navLinks: [
                { name: 'Home', url: 'index.html' },
                { name: 'Meet the Builders', url: 'directory.html' },
                { name: 'Maintainers', url: 'maintainers.html' },
                { name: 'Influence Map', url: 'network.html' },
                { name: 'Builder Galaxy', url: 'contributors.html' }
            ],
            footerLinks: [
                { name: 'Methodology & Definitions', url: 'https://sorukumar.github.io/orange-dev-tracker/methodology.html' }
            ],
            feedbackUrl: 'roadmap.html',
            suiteLinks: [
                { name: 'orange-dev-tracker', url: 'https://sorukumar.github.io/orange-dev-tracker', icon: 'fas fa-chart-line' },
                { name: 'this-week-in-bitcoin', url: 'https://sorukumar.github.io/this-week-in-bitcoin', icon: 'fas fa-newspaper' }
            ]
        });
    }
});
