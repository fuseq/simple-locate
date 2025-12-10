"use strict";

// 1. Map oluşturma
const map = new L.Map("map", {
    center: [41.27447, 28.7291],
    zoom: 18,
    zoomControl: false,
});

// Google Maps Layers
const googleStreets = L.gridLayer.googleMutant({
    type: 'roadmap', // Yol haritası
});

const googleSatellite = L.gridLayer.googleMutant({
    type: 'satellite', // Uydu görünümü
});

const googleHybrid = L.gridLayer.googleMutant({
    type: 'hybrid', // Uydu + Yollar
});

const googleTerrain = L.gridLayer.googleMutant({
    type: 'terrain', // Arazi haritası
});

// Varsayılan olarak Streets göster
googleStreets.addTo(map);

// Layer kontrolü ekle (sağ üstte harita türü seçici)
const baseMaps = {
    "Google Streets": googleStreets,
    "Google Satellite": googleSatellite,
    "Google Hybrid": googleHybrid,
    "Google Terrain": googleTerrain,
};

L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// 2. Kat bilgileri ve SVG kapı çizgileri değişkenleri
let floorAltitudes = {};
let currentFloorKey = null;
let doorLinesLatLng = [];

// 3. Map info
const mapInfo = {
    viewBox: { width: 8206, height: 10713 },
    coordinates: {
        maxLat: 41.30582,
        minLat: 41.24312,
        maxLng: 28.7609,
        minLng: 28.6973,
    },
    center: [41.27447, 28.7291],
    bounds: [
        [41.30582, 28.7609],
        [41.24312, 28.6973],
    ],
    maxBounds: [
        [41.30882, 28.7639],
        [41.24012, 28.6943],
    ],
    scale: 0.0004072713155,
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
        console.log("Kat altitüdü verisi yüklendi:", floorAltitudes);
    });

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
                        
                    </div>
                    <div class="wei-ye-stats">
                        <div>Doğruluk: <span class="accuracy-value">--</span> m</div>
                        <div>Altitude: <span class="altitude-value">--</span> m</div>
                        <div>Durum: <span class="is-filtered">Bekleniyor</span></div>
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

            if (!accuracyEl || !filteredEl || !altitudeEl) return;

            accuracyEl.textContent = Math.round(stats.accuracy);
            
            // Altitude değerini göster
            if (stats.altitude !== undefined && stats.altitude !== null && !isNaN(stats.altitude)) {
                altitudeEl.textContent = stats.altitude.toFixed(1);
            } else {
                altitudeEl.textContent = "--";
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

            if (stats.accuracy > 50) {
                this._container.style.border = "2px solid #F44336";
                filteredEl.textContent = "Belirsiz Konum";
                filteredEl.style.color = "#F44336";
            } else {
                this._container.style.border = "";
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

// 9.5. Location Logger oluştur
let locationLogger = null;

// LocationLogger'ı DOM hazır olduğunda başlat
function initLocationLogger() {
    if (typeof LocationLogger !== 'undefined') {
        locationLogger = new LocationLogger({
            maxLogs: 10000,
            jumpThreshold: 10
        });
        console.log('Location Logger başlatıldı');
    } else {
        console.warn('LocationLogger sınıfı bulunamadı, tekrar deneniyor...');
        setTimeout(initLocationLogger, 100);
    }
}

// DOMContentLoaded bekleyerek başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded - Location Logger başlatılıyor...');
        initLocationLogger();
    });
} else {
    // DOM zaten hazır
    console.log('DOM hazır - Location Logger başlatılıyor...');
    initLocationLogger();
}

// Alternatif olarak window load event'inde de dene
window.addEventListener('load', () => {
    if (!locationLogger && typeof LocationLogger !== 'undefined') {
        console.log('Window load - Location Logger başlatılıyor...');
        initLocationLogger();
    }
});

// 10. SimpleLocate kontrolü
const control = new L.Control.SimpleLocate({
    position: "topleft",

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

    afterDeviceMove: (location) => {
        // Artık filtrelenmiş ve seçilen referansa göre dönüştürülmüş altitude
        // location objesinden direkt alınıyor
        const altitude = location.altitude !== undefined && location.altitude !== null 
            ? location.altitude 
            : NaN;

        const lat = location.lat;
        const lng = location.lng;

        weiYeInfoControl.updateStats({
            accuracy: location.accuracy,
            altitude: altitude,
            isJump: location.isJump,
            initializing:
                control._weiYeState?.filteringStats.totalUpdates < 3,
        });

        // Location Logger'a log ekle
        if (locationLogger) {
            locationLogger.logLocation({
                lat: lat,
                lng: lng,
                accuracy: location.accuracy,
                altitude: altitude,
                angle: location.angle,
                isJump: location.isJump,
                isFiltered: location.isFiltered
            });
        }

        // Konum güncellemesi
        onUserLocationUpdate(lat, lng, altitude);
    },

    afterClick: (status) => {
        console.log("Geolocation status:", status.geolocation);
        console.log("Orientation status:", status.orientation);
        
        // Konum başlatıldığında loglamayı başlat
        if (status.geolocation && locationLogger) {
            locationLogger.startLogging();
        }
        
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

// 11. Kullanıcı konumu değiştiğinde kat ve en yakın kapı bilgisi hesaplama
function onUserLocationUpdate(lat, lng, altitude) {
    const floorKey = findClosestFloor(altitude);
    if (floorKey !== currentFloorKey) {
        currentFloorKey = floorKey;
        loadFloorDoors(currentFloorKey).then((lines) => {
            doorLinesLatLng = lines;
            console.log("Yüklenen kapı çizgileri:", doorLinesLatLng);
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