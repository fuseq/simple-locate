"use strict";

// ========== DİNAMİK GEOFENCE SEÇİCİ ==========
const GeofenceSelector = {
    isActive: false,
    corners: [],
    markers: [],
    polygon: null,
    minCorners: 3,  // Minimum 3 köşe gerekli (üçgen)
    finishButton: null,
    
    // Seçiciyi başlat
    start: function(map) {
        this.isActive = true;
        this.corners = [];
        this.clearVisuals(map);
        
        // Harita cursor'unu değiştir
        map.getContainer().style.cursor = 'crosshair';
        
        // Bilgi mesajı göster
        this.showMessage('📍 Alan belirlemek için köşelere tıklayın (min. 3 köşe)');
        
        // Tıklama event'i ekle
        map.on('click', this.onMapClick, this);
        
        // "Tamamla" butonunu göster
        this.showFinishButton(map);
    },
    
    // Haritaya tıklandığında
    onMapClick: function(e) {
        if (!this.isActive) return;
        
        const latlng = e.latlng;
        this.corners.push(latlng);
        
        // Marker ekle
        const marker = L.circleMarker(latlng, {
            radius: 8,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.8,
            weight: 2
        }).addTo(map);
        
        // Köşe numarasını göster
        marker.bindTooltip(`Köşe ${this.corners.length}`, {
            permanent: true,
            direction: 'top',
            className: 'corner-tooltip'
        }).openTooltip();
        
        this.markers.push(marker);
        
        // Polygon güncelle
        this.updatePolygon(map);
        
        // Mesaj güncelle
        if (this.corners.length < this.minCorners) {
            this.showMessage(`📍 En az ${this.minCorners - this.corners.length} köşe daha seçin (${this.corners.length}/${this.minCorners}+)`);
        } else {
            this.showMessage(`📍 ${this.corners.length} köşe seçildi - "Tamamla" butonuna basın veya köşe eklemeye devam edin`);
        }
        
        // "Tamamla" butonunu güncelle
        this.updateFinishButton();
    },
    
    // Polygon'u güncelle
    updatePolygon: function(map) {
        if (this.polygon) {
            map.removeLayer(this.polygon);
        }
        
        if (this.corners.length >= 2) {
            // Köşeleri seçim sırasına göre kullan (sortCorners'ı KALDIRDIK)
            // Leaflet polygon otomatik olarak son köşeyi ilk köşeye bağlar
            const cornerLatLngs = this.corners.map(c => [c.lat, c.lng]);
            
            this.polygon = L.polygon(cornerLatLngs, {
                color: '#2196F3',
                fillColor: '#2196F3',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(map);
        }
    },
    
    // "Tamamla" butonunu göster
    showFinishButton: function(map) {
        if (this.finishButton) return;
        
        this.finishButton = document.createElement('button');
        this.finishButton.id = 'geofence-finish-btn';
        this.finishButton.innerHTML = '✅ Tamamla (min. 3 köşe)';
        this.finishButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            background: #4CAF50;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0.5;
            pointer-events: none;
            transition: all 0.2s ease;
        `;
        this.finishButton.onclick = () => {
            if (this.corners.length >= this.minCorners) {
                this.finish(map);
            }
        };
        document.body.appendChild(this.finishButton);
    },
    
    // "Tamamla" butonunu güncelle
    updateFinishButton: function() {
        if (!this.finishButton) return;
        
        if (this.corners.length >= this.minCorners) {
            this.finishButton.style.opacity = '1';
            this.finishButton.style.pointerEvents = 'auto';
            this.finishButton.style.background = '#4CAF50';
            this.finishButton.innerHTML = `✅ Tamamla (${this.corners.length} köşe)`;
        } else {
            this.finishButton.style.opacity = '0.5';
            this.finishButton.style.pointerEvents = 'none';
            this.finishButton.style.background = '#9E9E9E';
            this.finishButton.innerHTML = `✅ Tamamla (min. ${this.minCorners - this.corners.length} köşe daha)`;
        }
    },
    
    // Köşeleri saat yönünde sırala
    sortCorners: function(corners) {
        if (corners.length < 3) return corners;
        
        // Merkez noktayı bul
        const centerLat = corners.reduce((sum, c) => sum + c.lat, 0) / corners.length;
        const centerLng = corners.reduce((sum, c) => sum + c.lng, 0) / corners.length;
        
        // Açıya göre sırala
        return [...corners].sort((a, b) => {
            const angleA = Math.atan2(a.lat - centerLat, a.lng - centerLng);
            const angleB = Math.atan2(b.lat - centerLat, b.lng - centerLng);
            return angleA - angleB;
        });
    },
    
    // Seçimi tamamla
    finish: function(map) {
        // Minimum köşe kontrolü
        if (this.corners.length < this.minCorners) {
            this.showMessage(`⚠️ En az ${this.minCorners} köşe seçmelisiniz (şu an: ${this.corners.length})`, 'warning');
            return;
        }
        
        this.isActive = false;
        map.getContainer().style.cursor = '';
        map.off('click', this.onMapClick, this);
        
        // "Tamamla" butonunu gizle
        if (this.finishButton) {
            this.finishButton.style.display = 'none';
        }
        
        // Bounds hesapla
        const bounds = this.calculateBounds();
        
        // Köşeleri seçim sırasına göre kullan (sortCorners KALDIRILDI)
        // Leaflet polygon otomatik olarak son köşeyi ilk köşeye bağlar
        const polygonArray = this.corners.map(c => ({ lat: c.lat, lng: c.lng }));
        
        // BUILDING_CONFIG'i güncelle
        BUILDING_CONFIG.bounds = bounds.array;
        BUILDING_CONFIG.center = bounds.center;
        BUILDING_CONFIG.polygon = polygonArray;  // Polygon köşelerini kaydet
        
        // Control'ü güncelle (eğer varsa) - POLYGON DAHİL
        if (typeof control !== 'undefined' && control.setGeofence) {
            control.setGeofence({
                bounds: bounds.array,
                center: bounds.center,
                radius: bounds.radius,
                polygon: polygonArray  // ÖNEMLİ: Polygon köşelerini gönder
            });
            console.log('✅ Geofence polygon control\'e aktarıldı');
            
            // ========== YENİ ALAN İÇİN MEVCUT KONUM KONTROLÜ ==========
            // Mevcut marker konumunu yeni polygon ile kontrol et
            if (control._latitude && control._longitude) {
                const currentLat = control._latitude;
                const currentLng = control._longitude;
                
                // Yeni polygon içinde mi kontrol et
                const isInsideNewArea = control._isInsideGeofence(currentLat, currentLng);
                
                if (!isInsideNewArea.inside) {
                    console.log('🚫 Mevcut konum yeni alanın dışında - marker gizleniyor');
                    
                    // Marker'ı gizle
                    if (control._marker) {
                        map.removeLayer(control._marker);
                        control._marker = undefined;
                    }
                    
                    // Circle'ı gizle
                    if (control._circle) {
                        map.removeLayer(control._circle);
                        control._circle = undefined;
                    }
                    
                    // Son iyi konumu sıfırla (artık geçersiz)
                    control._lastGoodLocation = {
                        latitude: null,
                        longitude: null,
                        accuracy: null,
                        timestamp: null,
                        confidence: 0
                    };
                    
                    // Konum değerlerini sıfırla
                    control._latitude = undefined;
                    control._longitude = undefined;
                    control._accuracy = undefined;
                    
                    // İstatistikleri sıfırla
                    control._locationStats = {
                        totalLocations: 0,
                        rejectedLocations: 0,
                        geofenceRejections: 0,
                        speedRejections: 0,
                        accuracyRejections: 0,
                        fallbackUsed: 0
                    };
                    
                    // UI'ı güncelle
                    weiYeInfoControl.updateStats({
                        accuracy: 0,
                        altitude: NaN,
                        isJump: false,
                        initializing: true,
                        confidence: 0,
                        locationStats: control._locationStats,
                        isFallback: false,
                        isIndoorMode: true,
                        isRejected: true,
                        consecutiveBadLocations: 0
                    });
                    
                    this.showMessage('⚠️ Mevcut konum yeni alanın dışında - yeni konum bekleniyor', 'warning');
                } else {
                    console.log('✅ Mevcut konum yeni alanın içinde');
                }
            }
        }
        
        // Varsayılan polygon'u kaldır (eğer varsa)
        if (typeof defaultPolygonLayer !== 'undefined' && defaultPolygonLayer) {
            map.removeLayer(defaultPolygonLayer);
            defaultPolygonLayer = null;
        }
        
        // Polygon'u kalıcı yap (yeşil renk)
        if (this.polygon) {
            this.polygon.setStyle({
                color: '#4CAF50',
                fillColor: '#4CAF50',
                fillOpacity: 0.15,
                dashArray: ''
            });
        }
        
        // Marker'ları kaldır
        this.markers.forEach(m => map.removeLayer(m));
        this.markers = [];
        
        this.showMessage(`✅ Alan belirlendi! Artık konum butonuna basabilirsiniz.`, 'success');
        
        // Koordinatları konsola yazdır
        console.log('📍 Geofence Koordinatları:', {
            bounds: bounds.array,
            center: bounds.center,
            polygon: polygonArray,
            corners: this.corners.map(c => ({ lat: c.lat, lng: c.lng }))
        });
        
        // Seçimi sıfırlama butonu göster
        this.showResetButton(map);
    },
    
    // Bounds hesapla
    calculateBounds: function() {
        const lats = this.corners.map(c => c.lat);
        const lngs = this.corners.map(c => c.lng);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        
        // Yarıçap hesapla (metre cinsinden, yaklaşık)
        const latDiff = (maxLat - minLat) * 111000; // 1 derece ≈ 111km
        const lngDiff = (maxLng - minLng) * 111000 * Math.cos(centerLat * Math.PI / 180);
        const radius = Math.max(latDiff, lngDiff) / 2;
        
        return {
            array: [[minLat, minLng], [maxLat, maxLng]],
            center: [centerLat, centerLng],
            radius: radius
        };
    },
    
    // Görselleri temizle
    clearVisuals: function(map) {
        this.markers.forEach(m => map.removeLayer(m));
        this.markers = [];
        if (this.polygon) {
            map.removeLayer(this.polygon);
            this.polygon = null;
        }
    },
    
    // Mesaj göster
    showMessage: function(text, type = 'info') {
        let msgEl = document.getElementById('geofence-message');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'geofence-message';
            msgEl.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(msgEl);
        }
        
        if (type === 'success') {
            msgEl.style.backgroundColor = '#4CAF50';
            msgEl.style.color = 'white';
        } else if (type === 'warning') {
            msgEl.style.backgroundColor = '#FF9800';
            msgEl.style.color = 'white';
        } else if (type === 'error') {
            msgEl.style.backgroundColor = '#F44336';
            msgEl.style.color = 'white';
        } else {
            msgEl.style.backgroundColor = '#2196F3';
            msgEl.style.color = 'white';
        }
        
        msgEl.textContent = text;
        msgEl.style.display = 'block';
        
        // Success ve warning mesajları 3 saniye sonra kaybol
        if (type === 'success' || type === 'warning') {
            setTimeout(() => {
                msgEl.style.display = 'none';
            }, 3000);
        }
    },
    
    // Sıfırlama butonu göster
    showResetButton: function(map) {
        let resetBtn = document.getElementById('geofence-reset-btn');
        if (!resetBtn) {
            resetBtn = document.createElement('button');
            resetBtn.id = 'geofence-reset-btn';
            resetBtn.innerHTML = '🔄 Alanı Yeniden Belirle';
            resetBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                background: #FF9800;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            resetBtn.onclick = () => {
                this.reset(map);
            };
            document.body.appendChild(resetBtn);
        }
        resetBtn.style.display = 'block';
    },
    
    // Sıfırla
    reset: function(map) {
        this.corners = [];
        this.clearVisuals(map);
        
        const resetBtn = document.getElementById('geofence-reset-btn');
        if (resetBtn) resetBtn.style.display = 'none';
        
        const msgEl = document.getElementById('geofence-message');
        if (msgEl) msgEl.style.display = 'none';
        
        // "Tamamla" butonunu temizle
        if (this.finishButton) {
            this.finishButton.style.display = 'none';
            this.finishButton = null;
        }
        
        // Yeniden başlat
        this.start(map);
    }
};

// ========== BİNA KONFİGÜRASYONU ==========
const BUILDING_CONFIG = {
    // Bina merkez koordinatları
    center: [41.261075737827085, 28.742390871047977],
    
    // Bina sınırları (geofence bounds)
    bounds: [
        [41.259553469375234, 28.73830854892731],  // minLat, minLng
        [41.26259800627894, 28.746473193168644]   // maxLat, maxLng
    ],
    
    // Polygon köşeleri (8 köşe)
    polygon: [
        {lat: 41.262509293303935, lng: 28.73833537101746},
        {lat: 41.26132778628279, lng: 28.73830854892731},
        {lat: 41.26132375379901, lng: 28.739236593246464},
        {lat: 41.259553469375234, lng: 28.739279508590702},
        {lat: 41.2596139582453, lng: 28.745630979537967},
        {lat: 41.26140037094814, lng: 28.74560415744782},
        {lat: 41.261420533340846, lng: 28.746473193168644},
        {lat: 41.26259800627894, lng: 28.746451735496525}
    ],
    
    // Alternatif: Merkez + yarıçap (metre cinsinden)
    radius: 250,  // Bina boyutuna uygun
    
    // İç mekan ayarları
    indoor: {
        maxAccuracy: 50,         // İç mekanda kabul edilebilir max accuracy (metre) - küçük bina için daha düşük
        maxSpeed: 2.0,           // İç mekanda max yürüyüş hızı (m/s) - ~7 km/h
        medianWindow: 7,         // Daha büyük median penceresi
        kalmanR: 0.7,            // Ölçüme daha az güven (küçük bina için daha yüksek)
        lowPassTau: 1.5,         // Daha agresif yumuşatma
        fallbackTimeout: 30000,  // Son iyi konum 30 saniye geçerli (küçük bina için daha kısa)
        maxBadLocations: 5       // 5 kötü konum sonrası zorla güncelle
    }
};

// 1. Map oluşturma
const map = new L.Map("map", {
    center: BUILDING_CONFIG.center,
    zoom: 18,  // Bina için uygun zoom
    zoomControl: false,
});

// Google Maps Layers - API key kontrolü ile
let baseMaps = {};

// Google Maps API key kontrolü
if (typeof window.google !== 'undefined' && window.google.maps) {
    const googleStreets = L.gridLayer.googleMutant({
        type: 'roadmap',
    }).addTo(map);

    const googleSatellite = L.gridLayer.googleMutant({
        type: 'satellite',
    });

    const googleHybrid = L.gridLayer.googleMutant({
        type: 'hybrid',
    });

    const googleTerrain = L.gridLayer.googleMutant({
        type: 'terrain',
    });

    baseMaps = {
        "Google Streets": googleStreets,
        "Google Satellite": googleSatellite,
        "Google Hybrid": googleHybrid,
        "Google Terrain": googleTerrain,
    };

    L.control.layers(baseMaps, null, {
        position: 'bottomleft',
        collapsed: true
    }).addTo(map);
} else {
    console.warn('Google Maps API yüklenmedi, OpenStreetMap kullanılıyor');
    // OpenStreetMap fallback
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// 2. Kat bilgileri ve SVG kapı çizgileri değişkenleri
let floorAltitudes = {};
let currentFloorKey = null;
let doorLinesLatLng = [];

// 3. Map info - Bina koordinatlarına göre ayarlandı
const mapInfo = {
    viewBox: { width: 8206, height: 10713 },
    coordinates: {
        maxLat: 41.26259800627894,    // Sağ üst lat
        minLat: 41.259553469375234,   // Sol alt lat
        maxLng: 28.746473193168644,   // Sağ alt lng
        minLng: 28.73830854892731,    // Sol üst lng
    },
    center: BUILDING_CONFIG.center,
    bounds: BUILDING_CONFIG.bounds,
    maxBounds: [
        [41.25850, 28.73700],  // Harita pan için geniş sınırlar
        [41.26350, 28.74750],
    ],
    scale: 0.0000005,
};

// 4. svgCoordToLatLng fonksiyonu
function svgCoordToLatLng(x, y) {
    const { maxLat, minLat, maxLng, minLng } = mapInfo.coordinates;
    const { width, height } = mapInfo.viewBox;

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;

    const latLocalDiff = (y / height) * latDiff;
    const lngLocalDiff = (x / width) * lngDiff;

    const lat = maxLat - latLocalDiff;
    const lng = minLng + lngLocalDiff;

    return { lat, lng };
}

// 5. floor-altitudes.json dosyasını yükle
fetch("floor-altitudes.json")
    .then((res) => res.json())
    .then((data) => {
        floorAltitudes = data;
    })
    .catch((err) => console.error("Kat verisi yüklenemedi:", err));

// 6. En yakın katı bulma
function findClosestFloor(altitude) {
    if (!floorAltitudes) return null;
    let closestKey = null;
    let minDiff = Infinity;

    for (const key in floorAltitudes) {
        const diff = Math.abs(altitude - floorAltitudes[key].altitude);
        if (diff < minDiff) {
            minDiff = diff;
            closestKey = key;
        }
    }
    return closestKey;
}

// 7. SVG'den Doors grubu altındaki line elemanlarını çek
function loadFloorDoors(floorKey) {
    return new Promise((resolve, reject) => {
        if (!floorKey || !floorAltitudes[floorKey]) {
            resolve([]);
            return;
        }

        fetch(floorAltitudes[floorKey].svg)
            .then(res => res.text())
            .then(svgText => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

                const doorsGroup = svgDoc.querySelector("g#Doors");
                if (!doorsGroup) {
                    console.warn(`SVG'de 'Doors' grubu bulunamadı: ${floorKey}`);
                    resolve([]);
                    return;
                }

                const lines = doorsGroup.querySelectorAll("line");
                const doorLines = [];

                lines.forEach((lineElem, index) => {
                    const x1 = parseFloat(lineElem.getAttribute("x1"));
                    const y1 = parseFloat(lineElem.getAttribute("y1"));
                    const x2 = parseFloat(lineElem.getAttribute("x2"));
                    const y2 = parseFloat(lineElem.getAttribute("y2"));

                    // SVG'deki line elementinin gerçek ID'sini kullan
                    // Eğer ID yoksa index ile bir ID oluştur
                    const lineId = lineElem.getAttribute("id") || `${floorKey}-${index + 1}`;

                    const start = svgCoordToLatLng(x1, y1);
                    const end = svgCoordToLatLng(x2, y2);

                    doorLines.push({
                        id: lineId, // SVG'deki gerçek line ID'si
                        start,
                        end
                    });
                });

                resolve(doorLines);
            })
            .catch(err => {
                console.error(`SVG yüklenirken hata (${floorKey}):`, err);
                showStatusMessage(`SVG yüklenemedi: ${err.message}`, true);
                resolve([]);
            });
    });
}

// 8. Wei Ye bilgi panelini oluştur
function createWeiYeInfoControl() {
    const WeiYeInfoControl = L.Control.extend({
        options: { position: "topright" },

        onAdd: function (map) {
            this._container = L.DomUtil.create(
                "div",
                "leaflet-control-wei-ye-info"
            );

            this._container.innerHTML = `
                <div class="wei-ye-info-panel">
                    <div class="wei-ye-title">
                        Konum Bilgisi
                        <span class="indoor-badge" style="display: none;">İÇ MEKAN</span>
                    </div>
                    <div class="wei-ye-stats">
                        <div>Doğruluk: <span class="accuracy-value">--</span> m</div>
                        <div>Güvenilirlik: <span class="confidence-value">--</span>%</div>
                        <div>Altitude: <span class="altitude-value">--</span> m</div>
                        <div>Durum: <span class="is-filtered">Bekleniyor</span></div>
                        <div class="rejection-info" style="display: none; font-size: 10px; color: #666;"></div>
                        <div class="door-info">Kapı bilgisi bekleniyor...</div>
                    </div>
                </div>
            `;

            return this._container;
        },

        updateStats: function (stats) {
            const accuracyEl = this._container.querySelector(".accuracy-value");
            const filteredEl = this._container.querySelector(".is-filtered");
            const altitudeEl = this._container.querySelector(".altitude-value");
            const confidenceEl = this._container.querySelector(".confidence-value");
            const indoorBadge = this._container.querySelector(".indoor-badge");
            const rejectionInfo = this._container.querySelector(".rejection-info");

            if (!accuracyEl || !filteredEl || !altitudeEl) return;

            accuracyEl.textContent = Math.round(stats.accuracy);
            altitudeEl.textContent =
                stats.altitude !== undefined && stats.altitude !== null
                    ? stats.altitude.toFixed(1)
                    : "--";

            // Güvenilirlik skoru
            if (confidenceEl && stats.confidence !== undefined) {
                confidenceEl.textContent = Math.round(stats.confidence);
                if (stats.confidence >= 70) {
                    confidenceEl.className = "confidence-value confidence-high";
                    confidenceEl.style.color = "#4CAF50";
                } else if (stats.confidence >= 40) {
                    confidenceEl.className = "confidence-value confidence-medium";
                    confidenceEl.style.color = "#FF9800";
                } else {
                    confidenceEl.className = "confidence-value confidence-low";
                    confidenceEl.style.color = "#F44336";
                }
            }
            
            // İç mekan badge
            if (indoorBadge && stats.isIndoorMode) {
                indoorBadge.style.display = "inline-block";
                indoorBadge.style.backgroundColor = "#2196F3";
                indoorBadge.style.color = "white";
                indoorBadge.style.padding = "2px 6px";
                indoorBadge.style.borderRadius = "3px";
                indoorBadge.style.fontSize = "9px";
                indoorBadge.style.marginLeft = "5px";
            }
            
            // Reddetme istatistikleri
            if (rejectionInfo && stats.locationStats) {
                const ls = stats.locationStats;
                const totalRejections = ls.geofenceRejections + ls.speedRejections + ls.accuracyRejections;
                if (totalRejections > 0) {
                    rejectionInfo.style.display = "block";
                    rejectionInfo.innerHTML = `
                        Reddedilen: ${totalRejections} 
                        (Sınır: ${ls.geofenceRejections}, Hız: ${ls.speedRejections}, Doğruluk: ${ls.accuracyRejections})
                        ${ls.fallbackUsed > 0 ? `| Fallback: ${ls.fallbackUsed}` : ''}
                    `;
                }
            }

            if (stats.accuracy <= 5) {
                accuracyEl.className = "accuracy-value accuracy-good";
            } else if (stats.accuracy <= 15) {
                accuracyEl.className = "accuracy-value accuracy-medium";
            } else if (stats.accuracy <= 30) {
                accuracyEl.className = "accuracy-value accuracy-low";
            } else {
                accuracyEl.className = "accuracy-value accuracy-poor";
            }

            // Reddedilen konum durumu (alan dışı)
            if (stats.isRejected) {
                this._container.style.border = "2px solid #F44336";
                this._container.style.backgroundColor = "#FFEBEE";
                filteredEl.textContent = "⛔ ALAN DIŞI";
                filteredEl.style.color = "#F44336";
                filteredEl.style.fontWeight = "bold";
            }
            // Fallback kullanılıyorsa özel durum
            else if (stats.isFallback) {
                this._container.style.border = "2px solid #FF9800";
                this._container.style.backgroundColor = "";
                filteredEl.textContent = "Tahmini Konum";
                filteredEl.style.color = "#FF9800";
                filteredEl.style.fontWeight = "";
            } else if (stats.accuracy > 50) {
                this._container.style.border = "2px solid #F44336";
                this._container.style.backgroundColor = "";
                filteredEl.textContent = "Belirsiz Konum";
                filteredEl.style.color = "#F44336";
                filteredEl.style.fontWeight = "";
            } else {
                this._container.style.border = "";
                this._container.style.backgroundColor = "";
                filteredEl.style.fontWeight = "";
                if (stats.isJump) {
                    filteredEl.textContent = "Sıçrama düzeltildi";
                    filteredEl.style.color = "#FF9800";

                    setTimeout(() => {
                        filteredEl.textContent = "Normal";
                        filteredEl.style.color = "#4CAF50";
                    }, 2000);
                } else if (!stats.initializing) {
                    filteredEl.textContent = "Normal";
                    filteredEl.style.color = "#4CAF50";
                }
            }
        },

        updateDoorInfo: function (doorInfo) {
            const doorDiv = this._container.querySelector(".door-info");
            if (!doorInfo) {
                doorDiv.textContent = "Kapı bilgisi bekleniyor...";
                return;
            }
            doorDiv.innerHTML = `
                <strong>En Yakın Kapı:</strong> ${doorInfo.doorId} <br />
                <strong>Kat:</strong> ${doorInfo.floor} <br />
                <strong>Mesafe:</strong> ${doorInfo.distance.toFixed(1)} m
            `;
        },
    });

    return new WeiYeInfoControl().addTo(map);
}

// 9. Wei Ye kontrol panelini oluştur
const weiYeInfoControl = createWeiYeInfoControl();

// 9.5 Alan Belirleme Butonu ekle
function createGeofenceButton() {
    const GeofenceButtonControl = L.Control.extend({
        options: { position: 'topleft' },
        
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-control-geofence-btn');
            
            const button = L.DomUtil.create('button', 'geofence-select-btn', container);
            button.innerHTML = '📐 Alan Belirle';
            button.title = 'Haritada köşelere tıklayarak geofence alanı belirleyin';
            button.style.cssText = `
                padding: 8px 12px;
                border-radius: 8px;
                border: 2px solid #2196F3;
                background: white;
                color: #2196F3;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                transition: all 0.2s ease;
            `;
            
            button.onmouseover = () => {
                button.style.backgroundColor = '#2196F3';
                button.style.color = 'white';
            };
            button.onmouseout = () => {
                button.style.backgroundColor = 'white';
                button.style.color = '#2196F3';
            };
            
            L.DomEvent.disableClickPropagation(button);
            L.DomEvent.on(button, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                GeofenceSelector.start(map);
            });
            
            return container;
        }
    });
    
    return new GeofenceButtonControl().addTo(map);
}

createGeofenceButton();

// 10. SimpleLocate kontrolü - İSTANBUL HAVALİMANI İÇİN OPTİMİZE EDİLDİ
const control = new L.Control.SimpleLocate({
    position: "topleft",

    // Temel filtre parametreleri
    medianWindowSize: 3,
    kalmanProcessNoise: 0.05,
    kalmanMeasurementNoise: 0.2,
    jumpThreshold: 0.0005,
    showFilterInfo: false,
    enableFiltering: true,
    showFilterDebug: false,
    showJumpWarnings: false,
    lowPassFilterTau: 0.5,
    enableLowPassFilter: true,
    
    // ========== İÇ MEKAN İYİLEŞTİRMELERİ ==========
    
    // Geofence (Coğrafi Sınırlama) - Bina sınırları
    enableGeofence: true,
    geofenceBounds: BUILDING_CONFIG.bounds,
    geofenceCenter: BUILDING_CONFIG.center,
    geofenceRadius: BUILDING_CONFIG.radius,
    
    // Konum Güvenilirlik Sistemi
    maxAcceptableAccuracy: BUILDING_CONFIG.indoor.maxAccuracy,
    minAcceptableAccuracy: 5,
    
    // Hız Bazlı Sıçrama Tespiti
    maxHumanSpeed: 5,
    maxIndoorSpeed: BUILDING_CONFIG.indoor.maxSpeed,
    
    // Son İyi Konum Fallback
    enableLastGoodLocation: true,
    lastGoodLocationTimeout: BUILDING_CONFIG.indoor.fallbackTimeout,
    maxConsecutiveBadLocations: BUILDING_CONFIG.indoor.maxBadLocations,
    
    // İç Mekan Optimizasyonları
    indoorMode: true,
    indoorMedianWindowSize: BUILDING_CONFIG.indoor.medianWindow,
    indoorKalmanR: BUILDING_CONFIG.indoor.kalmanR,
    indoorLowPassTau: BUILDING_CONFIG.indoor.lowPassTau,
    
    // Konum Doğrulama
    enablePositionValidation: true,
    positionValidationStrict: false, // false = kötü konumlarda fallback kullan, true = tamamen reddet

    afterDeviceMove: (location) => {
        // Reddedilen konum ise sadece istatistikleri güncelle
        if (location.isRejected) {
            weiYeInfoControl.updateStats({
                accuracy: location.accuracy || 0,
                altitude: NaN,
                isJump: false,
                initializing: false,
                confidence: 0,
                locationStats: location.locationStats,
                isFallback: false,
                isIndoorMode: location.isIndoorMode,
                isRejected: true,  // Reddedildi flag'i
                consecutiveBadLocations: location.consecutiveBadLocations
            });
            return;  // Kapı bilgisi güncelleme - marker zaten güncellenmedi
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const altitude =
                    pos.coords.altitude !== null ? pos.coords.altitude : NaN;

                const lat = location.lat;
                const lng = location.lng;

                weiYeInfoControl.updateStats({
                    accuracy: location.accuracy,
                    altitude: altitude,
                    isJump: location.isJump,
                    initializing:
                        control._weiYeState?.filteringStats.totalUpdates < 3,
                    confidence: location.confidence,
                    locationStats: location.locationStats,
                    isFallback: location.isFallback,
                    isIndoorMode: location.isIndoorMode,
                    isRejected: false,
                    consecutiveBadLocations: location.consecutiveBadLocations
                });

                onUserLocationUpdate(lat, lng, altitude);
            },
            () => {
                weiYeInfoControl.updateStats({
                    accuracy: location.accuracy,
                    altitude: NaN,
                    isJump: location.isJump,
                    initializing:
                        control._weiYeState?.filteringStats.totalUpdates < 3,
                    confidence: location.confidence,
                    locationStats: location.locationStats,
                    isFallback: location.isFallback,
                    isIndoorMode: location.isIndoorMode,
                    isRejected: false,
                    consecutiveBadLocations: location.consecutiveBadLocations
                });
                
                // Altitude alınamazsa da konumu güncelle (altitude NaN)
                onUserLocationUpdate(location.lat, location.lng, NaN);
            }
        );
    },

    afterClick: (status) => {
        if (!status.geolocation) {
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(
                    '<span style="color: red; font-weight:bold;">Konum alınamadı</span>'
                )
                .openOn(map);
        }
    },
}).addTo(map);

// 10.5 Varsayılan Polygon'u Çiz (eğer BUILDING_CONFIG'de varsa)
let defaultPolygonLayer = null;
if (BUILDING_CONFIG.polygon && BUILDING_CONFIG.polygon.length >= 3) {
    // Polygon köşelerini Leaflet formatına çevir
    const polygonLatLngs = BUILDING_CONFIG.polygon.map(p => [p.lat, p.lng]);
    
    // Polygon'u haritada göster (yeşil renkte)
    defaultPolygonLayer = L.polygon(polygonLatLngs, {
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: ''
    }).addTo(map);
    
    // Control'e geofence'i set et
    control.setGeofence({
        bounds: BUILDING_CONFIG.bounds,
        center: BUILDING_CONFIG.center,
        radius: BUILDING_CONFIG.radius,
        polygon: BUILDING_CONFIG.polygon
    });
    
    console.log('✅ Varsayılan geofence polygon yüklendi:', BUILDING_CONFIG.polygon.length, 'köşe');
}

// 11. Kullanıcı konumu değiştiğinde kat ve en yakın kapı bilgisi hesaplama
function onUserLocationUpdate(lat, lng, altitude) {
    const floorKey = findClosestFloor(altitude);
    if (floorKey !== currentFloorKey) {
        currentFloorKey = floorKey;
        loadFloorDoors(currentFloorKey).then((lines) => {
            doorLinesLatLng = lines;
        });
    }

    if (!doorLinesLatLng.length) {
        weiYeInfoControl.updateDoorInfo(null);
        return;
    }

    // En yakın kapıyı bul
    let closestDoor = null;
    let minDist = Infinity;

    doorLinesLatLng.forEach((door) => {
        const distStart = map.distance([lat, lng], [
            door.start.lat,
            door.start.lng,
        ]);
        const distEnd = map.distance([lat, lng], [door.end.lat, door.end.lng]);
        const doorDist = Math.min(distStart, distEnd);

        if (doorDist < minDist) {
            minDist = doorDist;
            closestDoor = door;
        }
    });

    if (closestDoor) {
        weiYeInfoControl.updateDoorInfo({
            doorId: closestDoor.id,
            distance: minDist,
            floor: currentFloorKey,
        });
    } else {
        weiYeInfoControl.updateDoorInfo(null);
    }
}