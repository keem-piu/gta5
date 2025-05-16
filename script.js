// script.js - Kick.com GTA Canlı Yayınları

// Sabitler
const STATIC_STREAMERS = [
    "burakg", "asepos", "limonvari", "x4te", "egemenfx", "chavohaze", "diorr35", "justwicky", "canarkhu", 
    "thekolpa", "aka", "gogo", "fjorgyn", "diana0035", "cjayhq", "dex0f", "liyantl", 
    "chicossberg", "rayz", "katasayf", "repkk", "pennia", "flavorr", "adamimlew", "rod4n", 
    "tacocan", "atillaberk", "eduskaa", "qafsiiel", "fiorevelenoso", "timuty", 
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

// Global Değişkenler
let STREAMER_STATS = {};
const SPONSORED_STREAMER = "phriksos";
const updateIntervals = {};
const PROFILE_IMAGE_CACHE = {};
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 dakika (milisaniye cinsinden)

// Yardımcı Fonksiyonlar
function formatNumber(num) {
    if (!num) return "0";
    return num >= 1000 ? (num/1000).toFixed(1) + 'K' : num.toString();
}

function formatDate(dateString) {
    if (!dateString) return "Hiç yayın yapmadı";
    const now = new Date();
    const date = new Date(dateString);
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return "1 saatten az";
    if (diffHours < 24) return `${diffHours} saat önce`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
}

function parseKickDate(dateString) {
    return new Date(dateString.replace(' ', 'T') + 'Z');
}

function formatDuration(startDate) {
    if (!startDate) return "00:00:00";
    
    try {
        const start = parseKickDate(startDate);
        const now = new Date();
        
        const diffMs = Math.max(0, now - start);
        const totalSeconds = Math.floor(diffMs / 1000);
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    } catch (e) {
        console.error("Süre hesaplama hatası:", e);
        return "00:00:00";
    }
}

async function getProfilePictureUrl(username) {
    if (PROFILE_IMAGE_CACHE[username]) {
        return PROFILE_IMAGE_CACHE[username];
    }

    try {
        const response = await fetch(`https://kick.com/api/v2/channels/${username}`);
        if (!response.ok) throw new Error('Kullanıcı bulunamadı');
        
        const data = await response.json();
        let profileUrl = data.user.profile_pic || 
                        `https://images.kick.com/channels/${username}/profile_small`;
        
        profileUrl = profileUrl.split('?')[0];
        PROFILE_IMAGE_CACHE[username] = [profileUrl];
        return [profileUrl];
    } catch (error) {
        console.error(`${username} profil resmi alınamadı:`, error);
        const initials = username.slice(0, 2).toUpperCase();
        return [
            `https://ui-avatars.com/api/?name=${initials}&background=1a1a24&color=53fc18`,
            `https://via.placeholder.com/150/1a1a24/53fc18?text=${initials}`
        ];
    }
}

function createImageElement(urls, alt, className, placeholderUrl) {
    const img = document.createElement('img');
    img.className = className;
    img.alt = alt;
    img.loading = 'lazy';
    
    let currentIndex = 0;
    
    function tryNextUrl() {
        if (currentIndex < urls.length) {
            img.src = urls[currentIndex] + '?t=' + Date.now();
            currentIndex++;
        } else {
            img.src = placeholderUrl;
        }
    }
    
    img.onerror = tryNextUrl;
    tryNextUrl();
    
    return img;
}

// API İşlemleri
async function fetchStreamerData(username) {
    try {
        const [profilePicUrls, apiData] = await Promise.all([
            getProfilePictureUrl(username),
            fetch(`https://kick.com/api/v2/channels/${username}`).then(res => res.json())
        ]);

        const initials = username.slice(0, 2).toUpperCase();
        
        return {
            username: username,
            isLive: apiData.livestream?.is_live || false,
            viewers: apiData.livestream?.viewer_count || 0,
            followers: formatNumber(apiData.followers_count || 0),
            lastStream: apiData.last_live_at ? formatDate(apiData.last_live_at) : "Hiç yayın yapmadı",
            title: apiData.livestream?.session_title || `${username} Kanalı`,
            thumbnail: apiData.livestream?.thumbnail?.url || null,
            startTime: apiData.livestream?.created_at || null,
            category: apiData.livestream?.categories?.[0]?.name || "GTA",
            profilePicUrls: profilePicUrls,
            initials: initials
        };
    } catch (error) {
        console.error(`${username} veri alım hatası:`, error);
        const initials = username.slice(0, 2).toUpperCase();
        return {
            username: username,
            isLive: false,
            viewers: 0,
            followers: "0",
            lastStream: "Bilinmiyor",
            title: `${username} Kanalı`,
            thumbnail: null,
            startTime: null,
            category: "GTA",
            profilePicUrls: [
                `https://ui-avatars.com/api/?name=${initials}&background=1a1a24&color=53fc18`,
                `https://via.placeholder.com/150/1a1a24/53fc18?text=${initials}`
            ],
            initials: initials
        };
    }
}

async function fetchStreamerStats() {
    const stats = {};
    try {
        const requests = STATIC_STREAMERS.map(username => 
            fetchStreamerData(username).catch(e => {
                console.error(`${username} veri alınamadı:`, e);
                const initials = username.slice(0, 2).toUpperCase();
                return {
                    username: username,
                    isLive: false,
                    viewers: 0,
                    followers: "0",
                    lastStream: "Bilinmiyor",
                    title: `${username} Kanalı`,
                    thumbnail: null,
                    startTime: null,
                    category: "GTA",
                    profilePicUrls: [
                        `https://ui-avatars.com/api/?name=${initials}&background=1a1a24&color=53fc18`,
                        `https://via.placeholder.com/150/1a1a24/53fc18?text=${initials}`
                    ],
                    initials: initials
                };
            })
        );
        
        const results = await Promise.all(requests);
        
        results.forEach(data => {
            stats[data.username] = data;
        });

        STREAMER_STATS = stats;
        return results;
    } catch (error) {
        console.error('Streamer istatistikleri alınamadı:', error);
        throw error;
    }
}

// DOM İşlemleri
function updateDurationForCard(card, startTime) {
    if (!card || !startTime) return;
    const durationElement = card.querySelector('.live-duration span');
    if (durationElement) {
        const duration = formatDuration(startTime);
        durationElement.textContent = duration;
    }
}

function createEyeIcon() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");
    
    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute("d", "M9.75 12a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0");
    
    const path2 = document.createElementNS(svgNS, "path");
    path2.setAttribute("d", "M2 12c0 1.64.425 2.191 1.275 3.296C4.972 17.5 7.818 20 12 20s7.028-2.5 8.725-4.704C21.575 14.192 22 13.639 22 12c0-1.64-.425-2.191-1.275-3.296C19.028 6.5 16.182 4 12 4S4.972 6.5 3.275 8.704C2.425 9.81 2 10.361 2 12m10-3.75a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5");
    path2.setAttribute("fill-rule", "evenodd");
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    return svg;
}

function createClockIcon() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");
    
    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute("d", "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z");
    
    const path2 = document.createElementNS(svgNS, "path");
    path2.setAttribute("d", "M13 7h-2v6h6v-2h-4z");
    
    svg.appendChild(path1);
    svg.appendChild(path2);
    return svg;
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
        const placeholderUrl = `https://via.placeholder.com/150/1a1a24/00ff00?text=${data.initials}`;
        const smallPlaceholderUrl = `https://via.placeholder.com/50/1a1a24/00ff00?text=${data.initials}`;

        const streamerCard = document.createElement('div');
        streamerCard.className = 'streamer-card';
        streamerCard.dataset.username = data.username;
        if (isLive && startTime) {
            streamerCard.dataset.startTime = startTime;
        }

        // Media content
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'streamer-media';
        
        if (isLive) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.kick.com/${data.username}?autoplay=true&muted=true`;
            iframe.className = 'streamer-iframe';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', 'true');
            mediaDiv.appendChild(iframe);
            
            const liveBadge = document.createElement('div');
            liveBadge.className = 'live-badge';
            liveBadge.textContent = 'CANLI';
            mediaDiv.appendChild(liveBadge);

            const gameTag = document.createElement('div');
            gameTag.className = 'streamer-tag';
            gameTag.textContent = 'GTAV';
            mediaDiv.appendChild(gameTag);
        } else {
            const offlineDiv = document.createElement('div');
            offlineDiv.className = 'offline-placeholder';
            
            const profileImg = createImageElement(
                data.profilePicUrls,
                data.username,
                'profile-image',
                placeholderUrl
            );
            
            offlineDiv.appendChild(profileImg);
            
            const offlineStatus = document.createElement('div');
            offlineStatus.className = 'offline-status';
            offlineStatus.textContent = 'ÇEVRİMDIŞI';
            offlineDiv.appendChild(offlineStatus);
            
            mediaDiv.appendChild(offlineDiv);
        }

        if (isSponsored) {
            const sponsoredBadge = document.createElement('div');
            sponsoredBadge.className = 'sponsored-badge';
            sponsoredBadge.textContent = 'SPONSOR';
            mediaDiv.appendChild(sponsoredBadge);
        }

        // Info content
        const infoDiv = document.createElement('div');
        infoDiv.className = 'streamer-info';
        
        // Header section
        const headerDiv = document.createElement('div');
        headerDiv.className = 'streamer-header';
        
        const avatarImg = createImageElement(
            data.profilePicUrls,
            data.username,
            'streamer-avatar',
            smallPlaceholderUrl
        );
        
        const nameContainer = document.createElement('div');
        nameContainer.className = 'streamer-name-container';
        
        const nameDiv = document.createElement('span');
        nameDiv.className = 'streamer-name';
        nameDiv.textContent = data.username;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'streamer-title';
        titleDiv.textContent = data.title;
        
        nameContainer.appendChild(nameDiv);
        nameContainer.appendChild(titleDiv);
        
        headerDiv.appendChild(avatarImg);
        headerDiv.appendChild(nameContainer);
        
        infoDiv.appendChild(headerDiv);
        
        // Meta section
        const metaDiv = document.createElement('div');
        metaDiv.className = 'streamer-meta';
        
        if (isLive) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'streamer-category';
            categoryDiv.textContent = data.category;
            metaDiv.appendChild(categoryDiv);
            
            const viewerCount = document.createElement('div');
            viewerCount.className = 'viewer-count';
            
            const eyeIcon = createEyeIcon();
            eyeIcon.classList.add('viewer-icon');
            viewerCount.appendChild(eyeIcon);
            
            viewerCount.appendChild(document.createTextNode(formatNumber(data.viewers)));
            metaDiv.appendChild(viewerCount);
            
            if (startTime) {
                const durationDiv = document.createElement('div');
                durationDiv.className = 'live-duration';
                
                const clockIcon = createClockIcon();
                clockIcon.classList.add('clock-icon');
                durationDiv.appendChild(clockIcon);
                
                const durationText = document.createElement('span');
                durationText.textContent = formatDuration(startTime);
                durationDiv.appendChild(durationText);
                
                metaDiv.appendChild(durationDiv);
            }
        }
        
        infoDiv.appendChild(metaDiv);
        
        // Watch button
        const watchButton = document.createElement('a');
        watchButton.href = `https://kick.com/${data.username}`;
        watchButton.className = 'watch-button';
        watchButton.textContent = isLive ? 'İZLE' : 'KANAL';
        watchButton.target = '_blank';
        infoDiv.appendChild(watchButton);
        
        // Assemble the card
        streamerCard.appendChild(mediaDiv);
        streamerCard.appendChild(infoDiv);
        
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

// Ana Fonksiyonlar
async function fetchStreamers() {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const streamerList = document.getElementById('streamer-list');
    
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    streamerList.innerHTML = '';
    errorElement.textContent = '';

    try {
        const streamersData = await fetchStreamerStats();
        if (streamersData.length === 0) {
            throw new Error('Hiç yayıncı verisi alınamadı');
        }
        
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
        loadingElement.style.display = 'none';
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
        `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR')}`;
}

// Sayfa Yüklendiğinde Çalışacak Kod
document.addEventListener('DOMContentLoaded', function() {
    fetchStreamers();
    setInterval(fetchStreamers, REFRESH_INTERVAL);
});

// Yenile Butonu İçin Global Fonksiyon
window.fetchStreamers = fetchStreamers;
