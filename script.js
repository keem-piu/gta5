// script.js - Kick.com GTA Canlı Yayınları

// Sabitler
const STATIC_STREAMERS = [
    "burakg", "asepos", "limonvari", "x4te", "egemenfx", "chavohaze", "diorr35", "justwicky", "canarkhu", 
    "thekolpa", "aka", "keempiu", "gogo", "fjorgyn", "diana0035", "cjayhq", "dex0f", "liyantl", 
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
const SPONSORED_STREAMER = "keempiu";
const updateIntervals = {};
const PROFILE_IMAGE_CACHE = {};
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 dakika
const API_BASE_URL = "https://kick.com/api/v2/channels/";
const BATCH_SIZE = 5; // Aynı anda yapılacak maksimum istek sayısı

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
    return `${Math.floor(diffHours / 24)} gün önce`;
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
        
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
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
        const response = await fetch(`${API_BASE_URL}${username}`);
        if (!response.ok) throw new Error('Kullanıcı bulunamadı');
        
        const data = await response.json();
        const profileUrl = (data.user.profile_pic || `https://images.kick.com/channels/${username}/profile_small`).split('?')[0];
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
    const tryNextUrl = () => {
        if (currentIndex < urls.length) {
            img.src = urls[currentIndex++] + '?t=' + Date.now();
        } else {
            img.src = placeholderUrl;
        }
    };
    
    img.onerror = tryNextUrl;
    tryNextUrl();
    return img;
}

// API İşlemleri
async function fetchStreamerData(username) {
    try {
        const [profilePicUrls, apiData] = await Promise.all([
            getProfilePictureUrl(username),
            fetch(`${API_BASE_URL}${username}`).then(res => res.json())
        ]);

        const initials = username.slice(0, 2).toUpperCase();
        const livestream = apiData.livestream || {};
        
        return {
            username,
            isLive: livestream.is_live || false,
            viewers: livestream.viewer_count || 0,
            followers: formatNumber(apiData.followers_count || 0),
            lastStream: apiData.last_live_at ? formatDate(apiData.last_live_at) : "Hiç yayın yapmadı",
            title: livestream.session_title || `${username} Kanalı`,
            thumbnail: livestream.thumbnail?.url || null,
            startTime: livestream.created_at || null,
            category: livestream.categories?.[0]?.name || "GTA",
            profilePicUrls,
            initials
        };
    } catch (error) {
        console.error(`${username} veri alım hatası:`, error);
        return getFallbackData(username);
    }
}

function getFallbackData(username) {
    const initials = username.slice(0, 2).toUpperCase();
    return {
        username,
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
        initials
    };
}

async function fetchStreamerStats() {
    const stats = {};
    const results = [];
    
    try {
        // İstekleri gruplar halinde yap
        for (let i = 0; i < STATIC_STREAMERS.length; i += BATCH_SIZE) {
            const batch = STATIC_STREAMERS.slice(i, i + BATCH_SIZE);
            const batchRequests = batch.map(username => 
                fetchStreamerData(username).catch(e => {
                    console.error(`${username} veri alınamadı:`, e);
                    return getFallbackData(username);
                })
            );
            
            const batchResults = await Promise.all(batchRequests);
            results.push(...batchResults);
            
            // Bir sonraki batch öncesi bekle
            if (i + BATCH_SIZE < STATIC_STREAMERS.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        results.forEach(data => stats[data.username] = data);
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
        durationElement.textContent = formatDuration(startTime);
    }
}

function createEyeIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");
    
    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M9.75 12a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0");
    
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M2 12c0 1.64.425 2.191 1.275 3.296C4.972 17.5 7.818 20 12 20s7.028-2.5 8.725-4.704C21.575 14.192 22 13.639 22 12c0-1.64-.425-2.191-1.275-3.296C19.028 6.5 16.182 4 12 4S4.972 6.5 3.275 8.704C2.425 9.81 2 10.361 2 12m10-3.75a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5");
    path2.setAttribute("fill-rule", "evenodd");
    
    svg.append(path1, path2);
    return svg;
}

function createClockIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");
    
    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z");
    
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M13 7h-2v6h6v-2h-4z");
    
    svg.append(path1, path2);
    return svg;
}

function renderStreamers(streamersData) {
    const streamerList = document.getElementById('streamer-list');
    streamerList.innerHTML = '';

    // Önceki interval'leri temizle
    Object.values(updateIntervals).forEach(clearInterval);
    Object.keys(updateIntervals).forEach(key => delete updateIntervals[key]);

    streamersData.forEach(data => {
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
            
            const offlineStatus = document.createElement('div');
            offlineStatus.className = 'offline-status';
            offlineStatus.textContent = 'ÇEVRİMDIŞI';
            
            offlineDiv.append(profileImg, offlineStatus);
            mediaDiv.appendChild(offlineDiv);
        }

        if (data.username === SPONSORED_STREAMER) {
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
        
        nameContainer.append(nameDiv, titleDiv);
        headerDiv.append(avatarImg, nameContainer);
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
            viewerCount.append(eyeIcon, document.createTextNode(formatNumber(data.viewers)));
            metaDiv.appendChild(viewerCount);
            
            if (startTime) {
                const durationDiv = document.createElement('div');
                durationDiv.className = 'live-duration';
                
                const clockIcon = createClockIcon();
                clockIcon.classList.add('clock-icon');
                durationDiv.append(clockIcon, document.createElement('span'));
                metaDiv.appendChild(durationDiv);
                updateDurationForCard(streamerCard, startTime);
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
        streamerCard.append(mediaDiv, infoDiv);
        streamerList.appendChild(streamerCard);

        if (isLive && startTime) {
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
        console.log("Yayıncı verileri alınıyor...");
        const streamersData = await fetchStreamerStats();
        console.log("Alınan yayıncı verileri:", streamersData);
        
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
        console.log("Yükleme tamamlandı");
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
