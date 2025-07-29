// Katların yükseklik bilgilerini JavaScript nesnesinde saklayacağız
const floorsAltitude = {
    0: 1150,  // Kat 0 için altitude
    1: 1160   // Kat 1 için altitude
};

// Harita sınırları
const minLat = 37.4250453, maxLat = 37.4268453;
const minLng = 31.8511658, maxLng = 31.8533658;

// Kat kapıları
let linesArray0 = [];
let linesArray1 = [];

// Konum filtreleme için değişkenler
let lastPositions = [];
const MAX_POSITIONS = 5;  // Son konum sayısı
const MAX_SPEED = 10;     // m/s olarak maksimum makul hız
const MIN_ACCURACY = 20;  // metre olarak minimum doğruluk

// Polyline çizgi konfigürasyonu
const polylineCoords = [
    [37.425947, 31.852208],
    [37.425855, 31.852246],
];

let map;
let fullPolyline;
let traveledPolyline;
let userToLine;
let locateControl;

// Harita başlatma fonksiyonu
function initializeMap() {
    map = new L.Map("map", {
        center: [37.425930, 31.852214],
        zoom: 18,
        zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Polyline çizgisini çiz
    fullPolyline = L.polyline(polylineCoords, {
        color: 'red',
        weight: 6,
        opacity: 0.8
    }).addTo(map);

    // SVG dosyalarını yükle
    fetchAndParseSVG('files/0.svg');
    fetchAndParseSVG('files/1.svg');

    // Konum izleme eklentisini başlat
    initializeLocationTracking();
}

// SVG koordinatlarını Lat/Lng koordinatlarına dönüştürme
function localCoordinateToLatLng(x, y, viewBox) {
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const latLocalDiff = (y / viewBox.height) * latDiff;
    const lngLocalDiff = (x / viewBox.width) * lngDiff;
    return new L.LatLng(maxLat - latLocalDiff, minLng + lngLocalDiff);
}

// SVG dosyasını yükleme ve kapıları çıkarma
function fetchAndParseSVG(file) {
    fetch(file)
        .then(response => response.text())
        .then(svgText => {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

            const doorsGroup = svgDoc.getElementById('Doors');
            if (doorsGroup) {
                const lines = doorsGroup.getElementsByTagName('line');
                const viewBox = svgDoc.documentElement.viewBox.baseVal;
                const linesArray = [];
                Array.from(lines).forEach(line => {
                    const id = line.id;
                    const x1 = parseFloat(line.getAttribute('x1'));
                    const y1 = parseFloat(line.getAttribute('y1'));
                    const x2 = parseFloat(line.getAttribute('x2'));
                    const y2 = parseFloat(line.getAttribute('y2'));
                    const startLatLng = localCoordinateToLatLng(x1, y1, viewBox);
                    const endLatLng = localCoordinateToLatLng(x2, y2, viewBox);
                    linesArray.push({
                        id,
                        start: { lat: startLatLng.lat, lng: startLatLng.lng },
                        end: { lat: endLatLng.lat, lng: endLatLng.lng }
                    });
                });
                if (file === 'files/0.svg') {
                    linesArray0 = linesArray; // Kat 0
                } else if (file === 'files/1.svg') {
                    linesArray1 = linesArray; // Kat 1
                }
            }
        })
        .catch(error => console.error('SVG yüklenirken hata:', error));
}

// SimpleLocate eklentisinin konfigürasyonu
function initializeLocationTracking() {// SimpleLocate control'ü oluştur
    locateControl = new L.Control.SimpleLocate({
        position: "topleft",
        setViewAfterClick: false,  // Görünümü otomatik değiştirmiyoruz
        drawCircle: true,
        afterDeviceMove: (event) => {
            // SimpleLocate'den gelen konum verileri
            let lat = event.lat;
            let lng = event.lng;
            let accuracy = event.accuracy;
            let altitude = event.altitude; // SimpleLocate'dan altitude bilgisini doğrudan al
            
            // Optimize edilmiş konum bilgilerini işle
            const optimizedLocation = optimizeLocation(lat, lng, accuracy, altitude);
            if (optimizedLocation) {
                console.log("Latitude:", optimizedLocation.lat);
                console.log("Longitude:", optimizedLocation.lng);
                console.log("Altitude:", optimizedLocation.altitude);
                console.log("Accuracy:", optimizedLocation.accuracy);
                
                // Optimizasyon sonrası işlemler
                updateUserPosition(optimizedLocation);
                checkLocation(optimizedLocation.lat, optimizedLocation.lng, optimizedLocation.altitude);
            }
        }
    }).addTo(map);

    return locateControl;
}

// Konum optimizasyonu için fonksiyon
function optimizeLocation(lat, lng, accuracy, altitude) {
    // Doğruluk kontrolü - çok düşük doğruluklu konumları reddet
    if (accuracy > 100) {
        console.log("Düşük doğruluk nedeniyle konum reddedildi:", accuracy);
        return null;
    }
    
    // Yeni konum objesi
    const newPosition = {
        lat: lat,
        lng: lng,
        accuracy: accuracy,
        altitude: altitude,
        timestamp: Date.now()
    };
    
    // İlk konum ise kabul et
    if (lastPositions.length === 0) {
        lastPositions.push(newPosition);
        return newPosition;
    }
    
    // Son konumla arasındaki mesafeyi hesapla
    const lastPos = lastPositions[lastPositions.length - 1];
    const distance = map.distance([lastPos.lat, lastPos.lng], [lat, lng]);
    const timeDiff = (newPosition.timestamp - lastPos.timestamp) / 1000; // saniye cinsinden
    
    // Hız hesaplama (m/s)
    const speed = timeDiff > 0 ? distance / timeDiff : 0;
    
    // Hız çok yüksekse ve bu ani bir sıçrama ise
    if (speed > MAX_SPEED && distance > 5) {
        console.log("Yüksek hız nedeniyle konum reddedildi:", speed.toFixed(2), "m/s");
        return null;
    }
    
    // Konum geçerli, son konumlar listesine ekle
    lastPositions.push(newPosition);
    
    // Listede maksimum sayıdan fazla konum varsa en eskisini çıkar
    if (lastPositions.length > MAX_POSITIONS) {
        lastPositions.shift();
    }
    
    // Eğer birden fazla konum varsa ortalama konum hesapla
    if (lastPositions.length >= 3) {
        // Son konumları ağırlıklı olarak değerlendir (yeniler daha önemli)
        let weightedLat = 0, weightedLng = 0, totalWeight = 0;
        let sumAltitude = 0, altitudeCount = 0;
        
        for (let i = 0; i < lastPositions.length; i++) {
            const pos = lastPositions[i];
            const weight = i + 1; // Daha yeni konumlar daha ağırlıklı
            
            weightedLat += pos.lat * weight;
            weightedLng += pos.lng * weight;
            totalWeight += weight;
            
            // Altitude hesaplama (null değilse)
            if (pos.altitude !== null) {
                sumAltitude += pos.altitude;
                altitudeCount++;
            }
        }
        
        const avgLat = weightedLat / totalWeight;
        const avgLng = weightedLng / totalWeight;
        const avgAltitude = altitudeCount > 0 ? sumAltitude / altitudeCount : null;
        
        // Ortalama değerlerle yeni bir konum oluştur
        return {
            lat: avgLat,
            lng: avgLng,
            accuracy: accuracy, // Mevcut doğruluk değerini koru
            altitude: avgAltitude
        };
    }
    
    // Yeterli konum yoksa mevcut konumu kullan
    return newPosition;
}

// Kullanıcı konumunu güncelleyen fonksiyon
function updateUserPosition(position) {
    const userLatLng = L.latLng(position.lat, position.lng);
    const closestPointData = getClosestPointOnLine(userLatLng, polylineCoords);
    const closestPoint = closestPointData.point;
    const distance = userLatLng.distanceTo(closestPoint);

    // Önceki çizgileri temizle
    if (userToLine) map.removeLayer(userToLine);
    if (traveledPolyline) map.removeLayer(traveledPolyline);

    // Mavi çizgiyi güncelle (her zaman çizilecek!)
    userToLine = L.polyline([userLatLng, closestPoint], {
        color: 'blue',
        weight: 3,
        dashArray: '5, 5'
    }).addTo(map);

    // Kullanıcı ilerledikçe yeşil renkle geçtiği yolları göster
    updatePolylineColor(closestPointData);
}

// Çizginin en yakın noktasını bulan fonksiyon
function getClosestPointOnLine(userLatLng, polylineCoords) {
    let closestPoint = null;
    let closestDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < polylineCoords.length - 1; i++) {
        const segmentStart = L.latLng(polylineCoords[i]);
        const segmentEnd = L.latLng(polylineCoords[i + 1]);

        const projectedPoint = projectPointOnSegment(userLatLng, segmentStart, segmentEnd);
        const distance = userLatLng.distanceTo(projectedPoint);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = projectedPoint;
            closestIndex = i + 1; // O noktadan itibaren kırmızı başlasın
        }
    }

    return { point: closestPoint, index: closestIndex };
}

// Kullanıcının ilerlediği bölgeyi yeşil renkle güncelleyen fonksiyon
function updatePolylineColor(closestPointData) {
    const { point, index } = closestPointData;

    const traveledPath = [...polylineCoords.slice(0, index), [point.lat, point.lng]];
    const remainingPath = [[point.lat, point.lng], ...polylineCoords.slice(index)];

    traveledPolyline = L.polyline(traveledPath, {
        color: 'green',
        weight: 6,
        opacity: 0.8
    }).addTo(map);

    // Eski kırmızı çizgiyi kaldır ve güncelle
    map.removeLayer(fullPolyline);
    fullPolyline = L.polyline(remainingPath, {
        color: 'red',
        weight: 6,
        opacity: 0.8
    }).addTo(map);
}

// Bir noktayı en yakın çizgi segmentine projekte eden fonksiyon
function projectPointOnSegment(userLatLng, segmentStart, segmentEnd) {
    const A = [segmentStart.lng, segmentStart.lat];
    const B = [segmentEnd.lng, segmentEnd.lat];
    const P = [userLatLng.lng, userLatLng.lat];

    const AB = [B[0] - A[0], B[1] - A[1]];
    const AP = [P[0] - A[0], P[1] - A[1]];
    const AB_AP = AB[0] * AP[0] + AB[1] * AP[1];
    const AB_AB = AB[0] * AB[0] + AB[1] * AB[1];
    const t = Math.max(0, Math.min(1, AB_AP / AB_AB));

    return L.latLng(A[1] + AB[1] * t, A[0] + AB[0] * t);
}

// Hangi katta olduğunu ve en yakın kapıyı bulan fonksiyon
function checkLocation(lat, lng, altitude) {
    console.log("Checking Location:", lat, lng, altitude); // Debugging the received coordinates and altitude

    // Determine which floor the user is on based on altitude
    let linesArray;
    if (altitude >= floorsAltitude[0] && altitude < floorsAltitude[1]) {
        console.log("Kat 0'da");
        linesArray = linesArray0;
    } else if (altitude >= floorsAltitude[1]) {
        console.log("Kat 1'de");
        linesArray = linesArray1;
    }

    // Log the boundary values for debugging
    console.log("Min Lat:", minLat, "Max Lat:", maxLat);
    console.log("Min Lng:", minLng, "Max Lng:", maxLng);

    // Check if the user is inside the boundaries
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
        console.log("❌ Dışarıda");
        showPopup("❌ Dışarıda", "red");
    } else {
        console.log("✅ İçeridesiniz");
        findClosestLine(lat, lng, linesArray);
    }
}

// En yakın kapıyı bulan fonksiyon
function findClosestLine(lat, lng, linesArray) {
    let closestLine = null;
    let minDistance = Infinity;

    if (!linesArray || linesArray.length === 0) {
        showPopup("Kapı verisi yüklenemedi", "orange");
        return;
    }

    linesArray.forEach(line => {
        const startDist = map.distance([lat, lng], [line.start.lat, line.start.lng]);
        const endDist = map.distance([lat, lng], [line.end.lat, line.end.lng]);
        const minLineDist = Math.min(startDist, endDist);

        if (minLineDist < minDistance) {
            minDistance = minLineDist;
            closestLine = line;
        }
    });

    // If a closest line is found, display the result
    if (closestLine) {
        showPopup(`En Yakın Kapı: ${closestLine.id}`, "blue");
    } else {
        showPopup("Kapı Bulunamadı", "orange");
    }
}

// Popup gösterme fonksiyonu
function showPopup(message, color) {
    let popup = L.popup().setLatLng(map.getCenter()).setContent(`<span style="color: ${color}">${message}</span>`).openOn(map);
}

// Sayfa yüklendiğinde haritayı başlat
document.addEventListener('DOMContentLoaded', initializeMap);