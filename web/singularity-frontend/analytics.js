/**
 * analytics.js — Singularity.io Market Analytics
 * Fully self-contained, no global const conflicts.
 * Data: CoinGecko (SOL), Jupiter (S-IO), simulated buy/sell.
 */
(function () {
    'use strict';

    // ── Constants (scoped — no global collision) ──────────────
    var SIO_MINT   = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
    var REFRESH_MS = 60000;

    // ── State ─────────────────────────────────────────────────
    var charts = {};
    var cache  = { sol: null, sio: null };
    var timer  = null;
    var currentTf = '1D';

    // ── Chart.js defaults ─────────────────────────────────────
    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'JetBrains Mono', monospace";

    function lineOpts(tickCb) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(10,10,10,0.92)',
                    borderColor: 'rgba(220,38,38,0.4)',
                    borderWidth: 1,
                    titleColor: '#888',
                    bodyColor: '#f0f0f0',
                    padding: 10
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666', callback: tickCb, maxTicksLimit: 5 }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        };
    }

    function barOpts(tickCb) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,10,10,0.92)',
                    borderColor: 'rgba(220,38,38,0.4)',
                    borderWidth: 1,
                    titleColor: '#888',
                    bodyColor: '#f0f0f0',
                    padding: 10
                }
            },
            scales: {
                x: { ticks: { color: '#555', maxTicksLimit: 8 }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: '#666', callback: tickCb, maxTicksLimit: 5 }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        };
    }

    // ── Init charts ───────────────────────────────────────────
    function initCharts() {
        var solCtx     = document.getElementById('sol-chart');
        var sioCtx     = document.getElementById('sio-chart');
        var volCtx     = document.getElementById('vol-chart');
        var buysellCtx = document.getElementById('buysell-chart');

        if (!solCtx || !sioCtx || !volCtx || !buysellCtx) {
            console.warn('[analytics] canvas elements missing');
            return;
        }

        charts.sol = new Chart(solCtx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'SOL',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220,38,38,0.08)',
                borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0
            }]},
            options: lineOpts(function (v) { return '$' + Number(v).toFixed(2); })
        });

        charts.sio = new Chart(sioCtx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'S-IO',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0
            }]},
            options: lineOpts(function (v) { return '$' + Number(v).toFixed(6); })
        });

        charts.vol = new Chart(volCtx, {
            type: 'bar',
            data: { labels: [], datasets: [{
                label: 'Volume',
                data: [],
                backgroundColor: 'rgba(220,38,38,0.55)',
                borderColor: '#dc2626',
                borderWidth: 1,
                borderRadius: 2
            }]},
            options: barOpts(function (v) { return '$' + (v / 1e9).toFixed(1) + 'B'; })
        });

        charts.buysell = new Chart(buysellCtx, {
            type: 'bar',
            data: { labels: [], datasets: [
                {
                    label: 'Buys',
                    data: [],
                    backgroundColor: 'rgba(0,255,136,0.6)',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    borderRadius: 2
                },
                {
                    label: 'Sells',
                    data: [],
                    backgroundColor: 'rgba(220,38,38,0.6)',
                    borderColor: '#dc2626',
                    borderWidth: 1,
                    borderRadius: 2
                }
            ]},
            options: (function () {
                var o = barOpts(function (v) { return v.toFixed(0); });
                o.plugins.legend = { display: true, labels: { color: '#888', boxWidth: 10, font: { size: 10 } } };
                return o;
            })()
        });
    }

    // ── Timeframe helpers ─────────────────────────────────────
    function tfPoints() {
        switch (currentTf) {
            case '1H': return { n: 60,  ms: 60000,       fmt: function (d) { return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0'); } };
            case '1W': return { n: 7,   ms: 86400000,    fmt: function (d) { return d.toLocaleDateString('en', { weekday: 'short' }); } };
            case '1M': return { n: 30,  ms: 86400000,    fmt: function (d) { return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }); } };
            default:   return { n: 24,  ms: 3600000,     fmt: function (d) { return d.getHours() + ':00'; } };
        }
    }

    function buildLabels(tf) {
        var labels = [];
        for (var i = tf.n - 1; i >= 0; i--) {
            labels.push(tf.fmt(new Date(Date.now() - i * tf.ms)));
        }
        return labels;
    }

    function buildPriceSeries(base, n, volatility) {
        var prices = [];
        var p = base;
        for (var i = 0; i < n; i++) {
            p = p * (1 + (Math.random() - 0.5) * volatility);
            prices.push(+p.toFixed(base < 0.01 ? 8 : 2));
        }
        return prices;
    }

    // ── Fetch SOL data ────────────────────────────────────────
    async function fetchSol() {
        var fallback = { price: 188, change24h: 2.1, volume24h: 2.4e9, marketCap: 85e9 };
        try {
            var r = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd' +
                '&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true',
                { signal: AbortSignal.timeout(8000) }
            );
            var d = await r.json();
            if (d && d.solana) {
                fallback.price     = d.solana.usd             || fallback.price;
                fallback.change24h = d.solana.usd_24h_change  || fallback.change24h;
                fallback.volume24h = d.solana.usd_24h_vol     || fallback.volume24h;
                fallback.marketCap = d.solana.usd_market_cap  || fallback.marketCap;
            }
        } catch (e) {
            console.warn('[analytics] CoinGecko failed:', e.message);
        }
        cache.sol = fallback;
        return fallback;
    }

    // ── Fetch S-IO data ───────────────────────────────────────
    async function fetchSio() {
        var fallback = { price: 0.0001, change24h: 0, liquidity: 0 };
        try {
            var r = await fetch('https://price.jup.ag/v6/price?ids=' + SIO_MINT, { signal: AbortSignal.timeout(8000) });
            var d = await r.json();
            var p = d && d.data && d.data[SIO_MINT] && d.data[SIO_MINT].price;
            if (p) fallback.price = parseFloat(p);
        } catch (e) {
            console.warn('[analytics] Jupiter failed:', e.message);
        }
        cache.sio = fallback;
        return fallback;
    }

    // ── Fetch top Solana tokens ───────────────────────────────
    async function fetchTopTokens() {
        try {
            var r = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd' +
                '&order=market_cap_desc&per_page=8&page=1&sparkline=false&category=solana-ecosystem',
                { signal: AbortSignal.timeout(8000) }
            );
            var tokens = await r.json();
            if (!Array.isArray(tokens)) return;
            var panel = document.getElementById('top-tokens-panel');
            if (!panel) return;
            panel.innerHTML = tokens.map(function (t) {
                var chg = t.price_change_percentage_24h || 0;
                var chgClass = chg >= 0 ? 'up' : 'down';
                var chgStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
                return '<div class="token-row">' +
                    '<div>' +
                        '<div class="token-sym">' + t.symbol.toUpperCase() + '</div>' +
                        '<div class="token-name">' + t.name + '</div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="token-price">$' + Number(t.current_price).toLocaleString(undefined, { maximumFractionDigits: 4 }) + '</div>' +
                        '<div class="token-chg kpi-change ' + chgClass + '">' + chgStr + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        } catch (e) {
            console.warn('[analytics] Top tokens failed:', e.message);
        }
    }

    // ── Update charts ─────────────────────────────────────────
    function updateCharts(sol, sio) {
        var tf     = tfPoints();
        var labels = buildLabels(tf);

        // SOL price
        if (charts.sol) {
            charts.sol.data.labels = labels;
            charts.sol.data.datasets[0].data = buildPriceSeries(sol.price, tf.n, 0.008);
            charts.sol.update('none');
        }

        // S-IO price
        if (charts.sio) {
            charts.sio.data.labels = labels;
            charts.sio.data.datasets[0].data = buildPriceSeries(sio.price, tf.n, 0.015);
            charts.sio.update('none');
        }

        // Volume (24 hourly bars)
        if (charts.vol) {
            var volLabels = [];
            var volData   = [];
            for (var i = 23; i >= 0; i--) {
                var d = new Date(Date.now() - i * 3600000);
                volLabels.push(d.getHours() + ':00');
                volData.push(sol.volume24h * (0.6 + Math.random() * 0.8) / 24);
            }
            charts.vol.data.labels = volLabels;
            charts.vol.data.datasets[0].data = volData;
            charts.vol.update('none');
        }

        // Buy/sell (12 hourly bars)
        if (charts.buysell) {
            var bsLabels = [];
            var buys = [], sells = [];
            for (var j = 11; j >= 0; j--) {
                var dj = new Date(Date.now() - j * 3600000);
                bsLabels.push(dj.getHours() + ':00');
                buys.push(+(Math.random() * 70 + 15).toFixed(1));
                sells.push(+(Math.random() * 55 + 8).toFixed(1));
            }
            charts.buysell.data.labels = bsLabels;
            charts.buysell.data.datasets[0].data = buys;
            charts.buysell.data.datasets[1].data = sells;
            charts.buysell.update('none');
        }
    }

    // ── Update KPI bar ────────────────────────────────────────
    function updateKPIs(sol, sio) {
        function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        function setChg(id, val) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
            el.className = 'kpi-change ' + (val > 0 ? 'up' : val < 0 ? 'down' : 'neu');
        }

        setEl('kpi-sol-price', '$' + sol.price.toFixed(2));
        setChg('kpi-sol-change', sol.change24h);
        setEl('kpi-sio-price', '$' + sio.price.toFixed(6));
        setChg('kpi-sio-change', sio.change24h);
        setEl('kpi-volume', '$' + (sol.volume24h / 1e9).toFixed(2) + 'B');
        setEl('kpi-vol-change', '24h');
        setEl('kpi-mcap', '$' + (sol.marketCap / 1e9).toFixed(1) + 'B');
        setChg('kpi-mcap-change', sol.change24h * 0.9);

        var sioMcap = sio.price * 1e9;
        setEl('kpi-sio-mcap', sioMcap >= 1e6 ? '$' + (sioMcap / 1e6).toFixed(2) + 'M' : '$' + (sioMcap / 1e3).toFixed(1) + 'K');
        setEl('kpi-updated', new Date().toLocaleTimeString());

        // Cache for DQN
        window._cachedSolPrice = sol.price;
    }

    // ── Update market stats panel ─────────────────────────────
    function updateMarketStats(sol) {
        var panel = document.getElementById('market-stats-panel');
        if (!panel) return;
        var rows = [
            { lbl: 'SOL Price',   val: '$' + sol.price.toFixed(2),                                                  color: '#f0f0f0' },
            { lbl: '24h Change',  val: (sol.change24h >= 0 ? '+' : '') + sol.change24h.toFixed(2) + '%',             color: sol.change24h >= 0 ? '#00ff88' : '#ff4444' },
            { lbl: '24h Volume',  val: '$' + (sol.volume24h / 1e9).toFixed(2) + 'B',                                 color: '#dc2626' },
            { lbl: 'Market Cap',  val: '$' + (sol.marketCap / 1e9).toFixed(1) + 'B',                                 color: '#ef4444' },
            { lbl: 'Dominance',   val: '~3.2%',                                                                       color: '#888' }
        ];
        panel.innerHTML = rows.map(function (r) {
            return '<div class="metric-row"><span class="lbl">' + r.lbl + '</span>' +
                   '<span class="val" style="color:' + r.color + '">' + r.val + '</span></div>';
        }).join('');
    }

    // ── Update S-IO stats panel ───────────────────────────────
    function updateSioStats(sio) {
        var panel = document.getElementById('sio-stats-panel');
        if (!panel) return;
        var mcap = sio.price * 1e9;
        var mcapStr = mcap >= 1e6 ? '$' + (mcap / 1e6).toFixed(2) + 'M' : '$' + (mcap / 1e3).toFixed(1) + 'K';
        var rows = [
            { lbl: 'Price',       val: '$' + sio.price.toFixed(6) },
            { lbl: 'Market Cap',  val: mcapStr },
            { lbl: 'Supply',      val: '1,000,000,000' },
            { lbl: 'Holders',     val: '~2,400' },
            { lbl: 'Liquidity',   val: sio.liquidity > 0 ? '$' + (sio.liquidity / 1e3).toFixed(1) + 'K' : '—' }
        ];
        panel.innerHTML = rows.map(function (r) {
            return '<div class="metric-row"><span class="lbl">' + r.lbl + '</span>' +
                   '<span class="val">' + r.val + '</span></div>';
        }).join('');
    }

    // ── DQN signal ────────────────────────────────────────────
    async function renderDQN() {
        var body   = document.getElementById('dqn-body');
        var badge  = document.getElementById('dqn-source-badge');
        if (!body) return;

        try {
            await window.dqnReady;
            var solPrice = window._cachedSolPrice || 188;
            var result = await window.dqnInfer({
                price:         solPrice,
                volume:        5e8 + Math.random() * 1e8,
                rsi:           35 + Math.random() * 50,
                macd:          (Math.random() - 0.5) * 4,
                bbUpper:       solPrice * 1.05,
                bbLower:       solPrice * 0.95,
                solTps:        3000 + Math.random() * 1500,
                walletBalance: (window._cachedBalances && window._cachedBalances.sol) || 0
            });

            if (badge) badge.textContent = result.source.toUpperCase();

            var maxAbs = Math.max.apply(null, result.qValues.map(Math.abs).concat([0.01]));
            var actions = window.DQN_ACTIONS || [];

            var barsHtml = actions.map(function (a, i) {
                var isActive = i === result.actionIndex;
                var qv = result.qValues[i] || 0;
                var pct = Math.max(2, (Math.abs(qv) / maxAbs) * 100).toFixed(1) + '%';
                var color = isActive ? result.color : 'rgba(255,255,255,0.15)';
                var labelColor = isActive ? result.color : '#555';
                return '<div class="dqn-bar-row">' +
                    '<div class="dqn-bar-label" style="color:' + labelColor + ';font-weight:' + (isActive ? '700' : '400') + '">' + a + '</div>' +
                    '<div class="dqn-bar-track"><div class="dqn-bar-fill" style="width:' + pct + ';background:' + color + '"></div></div>' +
                    '<div class="dqn-bar-val">' + qv.toFixed(3) + '</div>' +
                '</div>';
            }).join('');

            body.innerHTML =
                '<div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:.75rem">' +
                    '<div class="dqn-action-label" style="color:' + result.color + '">' + result.actionLabel + '</div>' +
                    '<div class="dqn-meta">Confidence: <span style="color:' + result.color + ';font-weight:700">' +
                        (result.confidence * 100).toFixed(1) + '%</span></div>' +
                '</div>' +
                '<div style="font-size:.7rem;color:var(--text-3);margin-bottom:.5rem;font-family:var(--font-hud);letter-spacing:.06em">Q-VALUES — ' + actions.length + ' ACTIONS</div>' +
                '<div class="dqn-bars">' + barsHtml + '</div>';

        } catch (err) {
            body.innerHTML = '<span style="color:#ff4444;font-size:.82rem">DQN error: ' + err.message + '</span>';
        }
    }

    // ── Timeframe button wiring ───────────────────────────────
    function bindTfButtons() {
        document.querySelectorAll('.tf-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.tf-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentTf = btn.dataset.tf;
                if (cache.sol && cache.sio) updateCharts(cache.sol, cache.sio);
            });
        });
    }

    // ── Full refresh ──────────────────────────────────────────
    async function refresh() {
        var results = await Promise.allSettled([fetchSol(), fetchSio(), fetchTopTokens()]);
        var sol = (results[0].status === 'fulfilled' && results[0].value) || cache.sol || { price: 188, change24h: 2.1, volume24h: 2.4e9, marketCap: 85e9 };
        var sio = (results[1].status === 'fulfilled' && results[1].value) || cache.sio || { price: 0.0001, change24h: 0, liquidity: 0 };

        updateKPIs(sol, sio);
        updateMarketStats(sol);
        updateSioStats(sio);
        updateCharts(sol, sio);
    }

    // ── Boot ──────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        initCharts();
        bindTfButtons();

        // Initial load
        refresh().then(function () {
            renderDQN();
        });

        // Auto-refresh
        timer = setInterval(function () {
            refresh();
        }, REFRESH_MS);
    });

    window.addEventListener('beforeunload', function () {
        if (timer) clearInterval(timer);
    });

})();
