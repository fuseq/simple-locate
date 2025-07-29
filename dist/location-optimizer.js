/**
 * Konum verilerini optimize eden ve sıçramaları engelleyen yardımcı sınıf
 */
class LocationOptimizer {
    constructor(options = {}) {
        // Varsayılan seçenekler
        this.options = {
            maxSpeed: options.maxSpeed || 10, // m/s (36 km/h) - Maksimum makul hız
            minAccuracy: options.minAccuracy || 100, // metre - Minimum kabul edilebilir doğruluk
            movingAverageCount: options.movingAverageCount || 5, // Hareketli ortalama için kullanılacak önceki konum sayısı
            minDistanceChange: options.minDistanceChange || 1, // metre - Hareket kabul edilecek minimum mesafe
            stabilityDelay: options.stabilityDelay || 2000, // ms - Kararlı konum için bekleme süresi
        };

        // Önceki konumları saklamak için dizi
        this.locationHistory = [];
        
        // Son konum ve zaman bilgisi
        this.lastLocation = null;
        this.lastTimestamp = null;
        
        // Konum kararlılığı için
        this.stableLocation = null;
        this.stableTimerId = null;
    }

    /**
     * Yeni konum verisini işleyerek optimize edilmiş konumu döndürür
     * @param {Object} location - {lat, lng, accuracy, timestamp} formunda konum nesnesi
     * @returns {Object|null} - Optimize edilmiş konum veya null (eğer veri reddedildiyse)
     */
    processLocation(location) {
        // Konum parametrelerini doğrula
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            console.warn('LocationOptimizer: Geçersiz konum verisi');
            return null;
        }

        // Zaman damgası ekle (yoksa şu anki zamanı kullan)
        const currentTime = new Date().getTime();
        location.timestamp = location.timestamp || currentTime;

        // Doğruluk kontrolü
        if (location.accuracy && location.accuracy > this.options.minAccuracy) {
            console.warn(`LocationOptimizer: Doğruluk çok düşük (${location.accuracy}m > ${this.options.minAccuracy}m)`);
            return this.lastLocation; // Mevcut konumu koru
        }

        // İlk konum ise, doğrudan kabul et
        if (!this.lastLocation) {
            this.lastLocation = this._cloneLocation(location);
            this.lastTimestamp = location.timestamp;
            this.locationHistory.push(this._cloneLocation(location));
            this._startStabilityTimer(location);
            return location;
        }

        // Mesafe ve hız kontrolü
        const distance = this._calculateDistance(
            this.lastLocation.lat, this.lastLocation.lng,
            location.lat, location.lng
        );
        
        const timeElapsed = (location.timestamp - this.lastTimestamp) / 1000; // saniye
        const speed = distance / (timeElapsed > 0 ? timeElapsed : 0.001);

        // Minimum mesafe değişimi kontrolü
        if (distance < this.options.minDistanceChange) {
            console.log(`LocationOptimizer: Çok küçük hareket (${distance.toFixed(2)}m < ${this.options.minDistanceChange}m)`);
            return this.lastLocation; // Çok küçük değişimler için mevcut konumu koru
        }

        // Hız limiti kontrolü
        if (speed > this.options.maxSpeed) {
            console.warn(`LocationOptimizer: Hız limiti aşıldı (${speed.toFixed(2)}m/s > ${this.options.maxSpeed}m/s)`);
            return this.lastLocation; // Hız limiti aşıldığında mevcut konumu koru
        }

        // Konum geçmişini güncelle (belirli bir sayıda konum sakla)
        this.locationHistory.push(this._cloneLocation(location));
        if (this.locationHistory.length > this.options.movingAverageCount) {
            this.locationHistory.shift();
        }

        // Hareketli ortalama hesapla
        const averagedLocation = this._calculateMovingAverage();
        
        // Son konum bilgilerini güncelle
        this.lastLocation = this._cloneLocation(averagedLocation);
        this.lastTimestamp = location.timestamp;
        
        // Konum kararlılığı için zamanlayıcıyı yeniden başlat
        this._startStabilityTimer(averagedLocation);

        return averagedLocation;
    }

    /**
     * Konum kararlılığı için zamanlayıcı başlatır
     */
    _startStabilityTimer(location) {
        // Önceki zamanlayıcıyı temizle
        if (this.stableTimerId) {
            clearTimeout(this.stableTimerId);
        }

        // Yeni zamanlayıcı başlat
        this.stableTimerId = setTimeout(() => {
            this.stableLocation = this._cloneLocation(location);
            console.log('LocationOptimizer: Kararlı konum belirlendi', this.stableLocation);
            // Burada kararlı konum için özel bir olay tetiklenebilir
        }, this.options.stabilityDelay);
    }

    /**
     * Geçmiş konumların hareketli ortalamasını hesaplar
     */
    _calculateMovingAverage() {
        if (this.locationHistory.length === 0) return null;

        // Ortalama koordinatları hesapla
        let sumLat = 0, sumLng = 0;
        for (const loc of this.locationHistory) {
            sumLat += loc.lat;
            sumLng += loc.lng;
        }

        return {
            lat: sumLat / this.locationHistory.length,
            lng: sumLng / this.locationHistory.length,
            accuracy: this.locationHistory[this.locationHistory.length - 1].accuracy,
            timestamp: this.locationHistory[this.locationHistory.length - 1].timestamp
        };
    }

    /**
     * İki nokta arasındaki mesafeyi hesaplar (Haversine formülü)
     */
    _calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Dünya yarıçapı (metre)
        const dLat = this._deg2rad(lat2 - lat1);
        const dLon = this._deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Derece cinsinden açıyı radyana çevirir
     */
    _deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    /**
     * Konum nesnesinin bir kopyasını oluşturur
     */
    _cloneLocation(location) {
        return { ...location };
    }

    /**
     * Son kararlı konumu döndürür
     */
    getStableLocation() {
        return this.stableLocation || this.lastLocation;
    }

    /**
     * Son optimize edilmiş konumu döndürür
     */
    getLastLocation() {
        return this.lastLocation;
    }

    /**
     * Tüm konum geçmişini temizler
     */
    reset() {
        this.locationHistory = [];
        this.lastLocation = null;
        this.lastTimestamp = null;
        this.stableLocation = null;
        if (this.stableTimerId) {
            clearTimeout(this.stableTimerId);
            this.stableTimerId = null;
        }
    }
}

// Global olarak erişilebilir bir konum optimize edici oluştur
window.locationOptimizer = new LocationOptimizer({
    maxSpeed: 5, // m/s (18 km/h) - Yürüyüş/koşu hızı için makul bir değer
    minAccuracy: 30, // metre - Bina içi için makul bir doğruluk
    movingAverageCount: 3, // Son 3 konumun ortalaması
    minDistanceChange: 1.5, // 1.5 metre altındaki değişimleri yok say
    stabilityDelay: 1500 // 1.5 saniye hareketsizlik sonrası kararlı konum
});