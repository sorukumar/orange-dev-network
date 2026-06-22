document.addEventListener('DOMContentLoaded', () => {
    if (typeof BitcoinLabsApp !== 'undefined') {
        BitcoinLabsApp.init({
            isApp: true,
            appName: 'orange-dev-network',
            appHomeUrl: 'index.html',
            navLinks: [
                { name: 'Home', url: 'index.html' },
                { name: 'Meet the Builders', url: 'directory.html' },
                { name: 'Influence Map', url: 'network.html' },
                { name: 'Builder Galaxy', url: 'contributors.html' },
                { name: 'Roadmap & Feedback', url: 'roadmap.html' }
            ],
            suiteLinks: [
                { name: 'orange-dev-tracker', url: 'https://sorukumar.github.io/orange-dev-tracker', icon: 'fas fa-chart-line' },
                { name: 'this-week-in-bitcoin', url: 'https://sorukumar.github.io/this-week-in-bitcoin', icon: 'fas fa-newspaper' }
            ]
        });
    }
});
