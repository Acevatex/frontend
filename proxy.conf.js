const PROXY_CONFIG = [
    {
        context: ['*',
        '/api/**', '!/api/v1/ws',
        '/testnet/api/**',
        ],
        target: "https://litecoinspace.org",
        ws: true,
        secure: false,
        changeOrigin: true
    },
    {
        context: ['/api/v1/ws'],
        target: "https://litecoinspace.org",
        ws: true,
        secure: false,
        changeOrigin: true,
    },
    {
        context: ['/resources/mining-pools/**'],
        target: "https://litecoinspace.org",
        secure: false,
        changeOrigin: true,
    },
    {
        context: ['/resources/worldmap.json'],
        target: "https://litecoinspace.org",
        secure: false,
        changeOrigin: true,
    }
];

module.exports = PROXY_CONFIG;
