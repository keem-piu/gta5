const STATIC_STREAMERS = [
    "asepos", "limonvari", "x4te", "egemenfx", "chavohaze", "diorr35", "justwicky", "canarkhu", 
    "thekolpa", "aka", "gogo", "fjorgyn", "diana0035", "cjayhq", "dex0f", "liyantl", 
    "chicossberg", "rayz", "katasayf", "repkk", "pennia", "flavorr", "adamimlew", "rod4n", 
    "tacocan", "atillaberk", "burakg", "eduskaa", "qafsiiel", "fiorevelenoso", "timuty", 
    "quello00", "cero31", "zibrall", "ogibkg", "wasg0d", "gitartist", "liftof", "ertinayy", 
    "hakki34", "emrelax", "pumii", "egg4x", "bfly0", "liadona", "lmunchies", "odisnos", 
    "neocastro", "sapientum", "kamls", "rivxm0", "nadozp", "thxgqd", "anosx", "loudone", 
    "atapoze", "dexzyn", "ardafx", "bedo447", "icastra", "herayoo", "aqerion", "darkclef", 
    "flokzz", "hakanefe", "yonzef", "pyrox", "rrelia", "akaburaq", "costaan", "requsavage", 
    "reveneant", "owll6", "endeavorty", "prisioner", "frexrd", "elworry", "enzoomb", "gokhanhkn", 
    "armis618", "anshi666", "canerzodiac", "turkishtaco", "sweetycadi", "whatthemilqa", 
    "sakuraipek", "parlochef", "mralpkaan", "ammoarmen", "orumcekenver", "beratarsllan", 
    "orhunpaso", "mordredsly", "hudsoonn", "cagatayk", "phriksos"
];

let STREAMER_STATS = {};
const SPONSORED_STREAMER = "phriksos";
const updateIntervals = {};

function formatNumber(num) {
    if (!num) return "0";
    return num >= 1000 ? (num/1000).toFixed(1) + 'K' : num.toString();
}

function formatDate(dateString) {
    if (!dateString) return "Bilinmiyor";
    const now = new Date();
    const date = new Date(dateString);
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return "1 saatten az";
    if (diffHours < 24) return `${diffHours} saat önce`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
}

function formatDuration(startDate) {
    if (!startDate) return "0sn";
    
    try {
        const now = new Date();
        const start = new Date(startDate);
        
        if (isNaN(start.getTime())) {
            console.error("Geçersiz başlangıç tarihi:", startDate);
            return "0sn";
        }
        
        const diffSeconds = Math.floor((now - start) / 1000);
        
        if (diffSeconds < 0) return "0sn";

        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}sa`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes}dk`);
        parts.push(`${seconds}sn`);

        return parts.join(" ");
    } catch (e) {
        console.error("Süre hesaplama hatası:", e);
        return "0sn";
    }
}

async function fetchStreamerData(username) {
    try {
        const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
        if (response.ok) {
            const data = await response.json();
            
            let startTime = null;
            if (data.livestream?.created_at) {
                startTime = new Date(data.livestream.created_at).toISOString();
            }
            
            return {
                username: username,
                isLive: data.livestream?.is_live || false,
                viewers: data.livestream?.viewer_count || 0,
                followers: formatNumber(data.followers_count),
                lastStream: data.last_live_at ? formatDate(data.last_live_at) : "Bilinmiyor",
                title: data.livestream?.session_title || "Kick.com Canlı Yayın",
                thumbnail: data.livestream?.thumbnail?.url || null,
                startTime: startTime
            };
        }
    } catch (error) {
        console.error(`${username} veri alım hatası:`, error);
    }
    return {
        username: username,
        isLive: false,
        viewers: 0,
        followers: "N/A",
        lastStream: "Bilinmiyor",
        title: "Kick.com Canlı yayın",
        thumbnail: null,
        startTime: null
    };
}

async function fetchStreamerStats() {
    const stats = {};
    const requests = STATIC_STREAMERS.map(username => fetchStreamerData(username));
    const results = await Promise.all(requests);

    results.forEach(data => {
        stats[data.username] = data;
    });

    STREAMER_STATS = stats;
    return results;
}

function updateDurationForCard(card, startTime) {
    if (!card || !startTime) return;
    const durationElement = card.querySelector('.live-duration');
    if (durationElement) {
        const duration = formatDuration(startTime);
        durationElement.textContent = `(${duration})`;
    }
}

function renderStreamers(streamersData) {
    const streamerList = document.getElementById('streamer-list');
    streamerList.innerHTML = '';

    Object.values(updateIntervals).forEach(interval => clearInterval(interval));
    Object.keys(updateIntervals).forEach(key => delete updateIntervals[key]);

    streamersData.forEach(data => {
        const isSponsored = data.username === SPONSORED_STREAMER;
        const isLive = data.isLive;
        const startTime = data.startTime;

        const streamerCard = document.createElement('div');
        streamerCard.className = 'streamer-card';
        streamerCard.dataset.username = data.username;
        if (isLive && startTime) {
            streamerCard.dataset.startTime = startTime;
        }

        const mediaContent = `
            <div class="streamer-media">
                ${isLive ?
                    `<iframe src="https://player.kick.com/${data.username}"
                                    class="streamer-iframe"
                                    height="180"
                                    frameborder="0"
                                    scrolling="no"
                                    allowfullscreen="true"></iframe>
                                <div class="live-badge">CANLI</div>` :
                    `<div class="offline-placeholder">ÇEVRİMDIŞI</div>`}
                ${isSponsored ? '<div class="sponsored-badge">SPONSOR</div>' : ''}
            </div>
        `;

        const watchButtonContent = `
            <div class="watch-button-container">
                <a href="https://kick.com/${data.username}" class="watch-button" target="_blank">
                    ${isLive ? 'Şimdi İzle' : 'Kanalı Görüntüle'}
                </a>
                ${isLive ? `
                    <div class="viewer-count">
                        <span class="viewer-icon"></span>
                        ${formatNumber(data.viewers)}
                        ${startTime ? `<span class="live-duration">(${formatDuration(startTime)})</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        streamerCard.innerHTML = `
            ${mediaContent}
            <div class="streamer-info">
                <div class="streamer-name">${data.username}</div>
                <div class="streamer-title">${data.title}</div>
                <div class="streamer-stats">
                    <div>${data.followers} takipçi</div>
                    <div class="streamer-last-stream">${isLive ? "Şu anda yayında" : `Son yayın: ${data.lastStream}`}</div>
                </div>
                ${watchButtonContent}
            </div>
        `;

        streamerList.appendChild(streamerCard);

        if (isLive && startTime) {
            updateDurationForCard(streamerCard, startTime);
            
            updateIntervals[data.username] = setInterval(() => {
                if (streamerCard.isConnected) {
                    updateDurationForCard(streamerCard, startTime);
                } else {
                    clearInterval(updateIntervals[data.username]);
                    delete updateIntervals[data.username];
                }
            }, 1000);
        }
    });
}

async function fetchStreamers() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('streamer-list').innerHTML = '';

    try {
        const streamersData = await fetchStreamerStats();
        const sortedStreamers = streamersData.sort((a, b) => {
            if (a.isLive && !b.isLive) return -1;
            if (!a.isLive && b.isLive) return 1;
            return b.viewers - a.viewers;
        });
        renderStreamers(sortedStreamers);
        updateTime();
    } catch (error) {
        console.error('Hata:', error);
        showError(`Yayınlar yüklenirken bir hata oluştu: ${error.message}`);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function updateTime() {
    const now = new Date();
    document.getElementById('update-time').textContent =
        `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

document.addEventListener('DOMContentLoaded', function() {
    fetchStreamers();
    setInterval(fetchStreamers, 300000); // 5 dakikada bir güncelle
});
