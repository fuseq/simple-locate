const polylineCoords = [
    [37.425947, 31.852208],
    [37.425855, 31.852246],
];


let fullPolyline = L.polyline(polylineCoords, {
    color: 'red',
    weight: 6,
    opacity: 0.8
}).addTo(map);

let traveledPolyline;
let userToLine;


const simpleLocateControl = document.querySelector('.leaflet-simple-locate');
if (simpleLocateControl) {
    console.log("Line tracking: SimpleLocate kontrolü bulundu, entegrasyon hazır");
} else {
    console.warn("Line tracking: SimpleLocate kontrolü bulunamadı!");
}
function updateUserPosition(position) {
   
    if (!position || !position.coords) {
        console.warn("Line tracking: Geçerli konum bilgisi alınamadı");
        return;
    }
    
    const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
    console.log("Line tracking: Konum güncellendi", userLatLng);
    
    const closestPointData = getClosestPointOnLine(userLatLng, polylineCoords);
    const closestPoint = closestPointData.point;
    const distance = userLatLng.distanceTo(closestPoint);

    // Eğer çok uzaktaysa (örneğin 50 metre) rota takibini gösterme
    if (distance > 50) {
        console.log("Line tracking: Kullanıcı rotadan çok uzakta, mesafe:", distance);
        // Önceki çizgileri temizle
        if (userToLine) map.removeLayer(userToLine);
        if (traveledPolyline) map.removeLayer(traveledPolyline);
        return;
    }

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
