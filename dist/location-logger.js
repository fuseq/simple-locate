"use strict";

/**
 * Konum Loglama Componenti
 * GPS koordinatlarını loglar ve sıçrama/sapma tespiti yapar
 */
class LocationLogger {
    constructor(options = {}) {
        this.logs = [];
        this.maxLogs = options.maxLogs || 1000; // Maksimum log sayısı
        this.isLogging = false;
        this.lastPosition = null;
        this.jumpThreshold = options.jumpThreshold || 10; // Metre cinsinden sıçrama eşiği
        this.deviationThreshold = options.deviationThreshold || 5; // Metre cinsinden sapma eşiği
        
        // UI elementleri
        this.logButton = null;
        this.bottomSheet = null;
        this.logContainer = null;
        this.logCountBadge = null;
        
        this.init();
    }

    init() {
        // DOM hazır olana kadar bekle
        const initUI = () => {
            try {
                this.createUI();
                this.attachEvents();
                console.log('Location Logger UI başarıyla oluşturuldu');
            } catch (error) {
                console.error('Location Logger UI oluşturulurken hata:', error);
                // Hata durumunda tekrar dene
                setTimeout(initUI, 500);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            // DOM zaten hazır, kısa bir gecikme ile başlat
            setTimeout(initUI, 100);
        }
    }

    /**
     * UI elementlerini oluştur
     */
    createUI() {
        // Eğer zaten oluşturulmuşsa tekrar oluşturma
        if (document.getElementById('locationLoggerButton')) {
            this.logButton = document.getElementById('locationLoggerButton');
            this.logCountBadge = document.getElementById('logCountBadge');
            return;
        }

        // Sağ alt köşe log butonu
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'location-logger-button-container';
        buttonContainer.innerHTML = `
            <button id="locationLoggerButton" class="location-logger-button" title="Konum Logları">
                <i class="material-icons">history</i>
                <span class="location-logger-badge" id="logCountBadge">0</span>
            </button>
        `;
        document.body.appendChild(buttonContainer);
        this.logButton = document.getElementById('locationLoggerButton');
        this.logCountBadge = document.getElementById('logCountBadge');
        
        console.log('Location Logger UI oluşturuldu', this.logButton);

        // Bottom Sheet - Eğer zaten varsa tekrar oluşturma
        let bottomSheet = document.getElementById('locationLoggerBottomSheet');
        if (!bottomSheet) {
            bottomSheet = document.createElement('div');
            bottomSheet.className = 'location-logger-bottom-sheet';
            bottomSheet.id = 'locationLoggerBottomSheet';
        bottomSheet.innerHTML = `
            <div class="location-logger-overlay"></div>
            <div class="location-logger-content">
                <div class="location-logger-header">
                    <h3>Konum Logları</h3>
                    <div class="location-logger-header-actions">
                        <button id="clearLogsBtn" class="location-logger-action-btn" title="Logları Temizle">
                            <i class="material-icons">delete_sweep</i>
                        </button>
                        <button id="exportLogsBtn" class="location-logger-action-btn" title="Dışa Aktar">
                            <i class="material-icons">download</i>
                        </button>
                        <button id="closeLoggerBtn" class="location-logger-action-btn" title="Kapat">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                </div>
                <div class="location-logger-stats">
                    <div class="stat-item">
                        <span class="stat-label">Toplam Log:</span>
                        <span class="stat-value" id="totalLogsCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sıçrama:</span>
                        <span class="stat-value stat-jump" id="jumpCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sapma:</span>
                        <span class="stat-value stat-deviation" id="deviationCount">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Durum:</span>
                        <span class="stat-value" id="loggingStatus">
                            <span class="status-indicator status-stopped"></span> Durduruldu
                        </span>
                    </div>
                </div>
                <div class="location-logger-list" id="logContainer">
                    <div class="location-logger-empty">Henüz log kaydı yok</div>
                </div>
            </div>
        `;
            document.body.appendChild(bottomSheet);
        }
        this.bottomSheet = bottomSheet;
        this.logContainer = document.getElementById('logContainer');
        
        console.log('Location Logger Bottom Sheet oluşturuldu', this.bottomSheet);
    }

    /**
     * Event listener'ları ekle
     */
    attachEvents() {
        // Log butonu kontrolü
        if (!this.logButton) {
            console.error('Location Logger: Log butonu bulunamadı!');
            return;
        }

        // Log butonu tıklama
        this.logButton.addEventListener('click', () => {
            console.log('Location Logger butonu tıklandı');
            this.toggleBottomSheet();
        });

        // Overlay tıklama (kapatma)
        const overlay = this.bottomSheet.querySelector('.location-logger-overlay');
        overlay.addEventListener('click', () => {
            this.closeBottomSheet();
        });

        // Kapat butonu
        const closeBtn = document.getElementById('closeLoggerBtn');
        closeBtn.addEventListener('click', () => {
            this.closeBottomSheet();
        });

        // Temizle butonu
        const clearBtn = document.getElementById('clearLogsBtn');
        clearBtn.addEventListener('click', () => {
            this.clearLogs();
        });

        // Dışa aktar butonu
        const exportBtn = document.getElementById('exportLogsBtn');
        exportBtn.addEventListener('click', () => {
            this.exportLogs();
        });
    }

    /**
     * Loglama başlat
     */
    startLogging() {
        this.isLogging = true;
        this.updateLoggingStatus(true);
    }

    /**
     * Loglama durdur
     */
    stopLogging() {
        this.isLogging = false;
        this.updateLoggingStatus(false);
    }

    /**
     * Yeni konum logla
     */
    logLocation(locationData) {
        if (!this.isLogging) {
            return;
        }

        const timestamp = new Date();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            lat: locationData.lat,
            lng: locationData.lng,
            accuracy: locationData.accuracy || null,
            altitude: locationData.altitude || null,
            angle: locationData.angle || null,
            isJump: locationData.isJump || false,
            isFiltered: locationData.isFiltered || false,
            distance: null,
            deviation: null,
            type: 'normal' // normal, jump, deviation
        };

        // Önceki konumla mesafe hesapla
        if (this.lastPosition) {
            const distance = this.calculateDistance(
                this.lastPosition.lat,
                this.lastPosition.lng,
                logEntry.lat,
                logEntry.lng
            );
            logEntry.distance = distance;

            // Sıçrama tespiti
            if (distance > this.jumpThreshold) {
                logEntry.type = 'jump';
                logEntry.isJump = true;
            }

            // Sapma tespiti (accuracy'ye göre)
            if (logEntry.accuracy && distance > Math.max(this.deviationThreshold, logEntry.accuracy * 0.5)) {
                if (logEntry.type === 'normal') {
                    logEntry.type = 'deviation';
                }
                logEntry.deviation = distance;
            }
        }

        // Log ekle
        this.logs.unshift(logEntry); // En yeni en üstte

        // Maksimum log sayısını kontrol et
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Son konumu güncelle
        this.lastPosition = {
            lat: logEntry.lat,
            lng: logEntry.lng
        };

        // UI güncelle
        this.updateUI();
    }

    /**
     * İki koordinat arasındaki mesafeyi hesapla (metre)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Dünya yarıçapı (metre)
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Dereceyi radyana çevir
     */
    toRad(degrees) {
        return (degrees * Math.PI) / 180;
    }

    /**
     * UI'ı güncelle
     */
    updateUI() {
        // Badge güncelle
        this.logCountBadge.textContent = this.logs.length;
        if (this.logs.length > 0) {
            this.logCountBadge.style.display = 'flex';
        }

        // İstatistikleri güncelle
        const jumpCount = this.logs.filter(log => log.type === 'jump').length;
        const deviationCount = this.logs.filter(log => log.type === 'deviation').length;
        
        document.getElementById('totalLogsCount').textContent = this.logs.length;
        document.getElementById('jumpCount').textContent = jumpCount;
        document.getElementById('deviationCount').textContent = deviationCount;

        // Log listesini güncelle
        this.updateLogList();
    }

    /**
     * Log listesini güncelle
     */
    updateLogList() {
        if (this.logs.length === 0) {
            this.logContainer.innerHTML = '<div class="location-logger-empty">Henüz log kaydı yok</div>';
            return;
        }

        const logHTML = this.logs.map(log => this.createLogItemHTML(log)).join('');
        this.logContainer.innerHTML = logHTML;

        // Scroll'u en üste al
        this.logContainer.scrollTop = 0;
    }

    /**
     * Log item HTML'i oluştur
     */
    createLogItemHTML(log) {
        const timeStr = log.timestamp.toLocaleTimeString('tr-TR');
        const dateStr = log.timestamp.toLocaleDateString('tr-TR');
        
        let typeClass = '';
        let typeIcon = '';
        let typeLabel = '';

        if (log.type === 'jump') {
            typeClass = 'log-item-jump';
            typeIcon = '⚠️';
            typeLabel = 'Sıçrama';
        } else if (log.type === 'deviation') {
            typeClass = 'log-item-deviation';
            typeIcon = '📊';
            typeLabel = 'Sapma';
        } else {
            typeClass = 'log-item-normal';
            typeIcon = '📍';
            typeLabel = 'Normal';
        }

        const distanceStr = log.distance !== null ? `${log.distance.toFixed(2)} m` : '-';
        const accuracyStr = log.accuracy !== null ? `${log.accuracy.toFixed(1)} m` : '-';
        const altitudeStr = log.altitude !== null && !isNaN(log.altitude) ? `${log.altitude.toFixed(1)} m` : '-';

        return `
            <div class="location-logger-item ${typeClass}" data-log-id="${log.id}">
                <div class="log-item-header">
                    <span class="log-item-type">${typeIcon} ${typeLabel}</span>
                    <span class="log-item-time">${timeStr}</span>
                </div>
                <div class="log-item-body">
                    <div class="log-item-coords">
                        <div class="coord-item">
                            <span class="coord-label">Lat:</span>
                            <span class="coord-value">${log.lat.toFixed(7)}</span>
                        </div>
                        <div class="coord-item">
                            <span class="coord-label">Lng:</span>
                            <span class="coord-value">${log.lng.toFixed(7)}</span>
                        </div>
                    </div>
                    <div class="log-item-info">
                        <div class="info-item">
                            <span class="info-label">Mesafe:</span>
                            <span class="info-value">${distanceStr}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Doğruluk:</span>
                            <span class="info-value">${accuracyStr}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Yükseklik:</span>
                            <span class="info-value">${altitudeStr}</span>
                        </div>
                        ${log.angle !== null ? `
                        <div class="info-item">
                            <span class="info-label">Açı:</span>
                            <span class="info-value">${log.angle.toFixed(1)}°</span>
                        </div>
                        ` : ''}
                    </div>
                    ${log.isFiltered ? '<div class="log-item-badge filtered">Filtrelenmiş</div>' : ''}
                </div>
                <div class="log-item-footer">
                    <span class="log-item-date">${dateStr}</span>
                </div>
            </div>
        `;
    }

    /**
     * Bottom sheet'i aç/kapat
     */
    toggleBottomSheet() {
        if (this.bottomSheet.classList.contains('active')) {
            this.closeBottomSheet();
        } else {
            this.openBottomSheet();
        }
    }

    /**
     * Bottom sheet'i aç
     */
    openBottomSheet() {
        this.bottomSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Bottom sheet'i kapat
     */
    closeBottomSheet() {
        this.bottomSheet.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Logları temizle
     */
    clearLogs() {
        if (confirm('Tüm logları temizlemek istediğinize emin misiniz?')) {
            this.logs = [];
            this.lastPosition = null;
            this.updateUI();
        }
    }

    /**
     * Logları dışa aktar (JSON)
     */
    exportLogs() {
        if (this.logs.length === 0) {
            alert('Dışa aktarılacak log bulunamadı.');
            return;
        }

        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `location-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Loglama durumunu güncelle
     */
    updateLoggingStatus(isLogging) {
        const statusEl = document.getElementById('loggingStatus');
        if (statusEl) {
            const indicator = statusEl.querySelector('.status-indicator');
            if (isLogging) {
                indicator.className = 'status-indicator status-active';
                statusEl.innerHTML = '<span class="status-indicator status-active"></span> Aktif';
            } else {
                indicator.className = 'status-indicator status-stopped';
                statusEl.innerHTML = '<span class="status-indicator status-stopped"></span> Durduruldu';
            }
        }
    }
}

// Global olarak erişilebilir yap
window.LocationLogger = LocationLogger;

