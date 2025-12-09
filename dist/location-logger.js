"use strict";


class LocationLogger {
    constructor(options = {}) {
        this.logs = [];
        this.maxLogs = options.maxLogs || 10000; // Maksimum log sayısı
        this.isLogging = false;
        this.lastPosition = null;
        this.jumpThreshold = options.jumpThreshold || 10;
        
        // UI elementleri
        this.logButton = null;
        this.bottomSheet = null;
        this.logContainer = null;
        this.logCountBadge = null;
        
        this.init();
    }

    init() {
        
        const initUI = () => {
            try {
                this.createUI();
                this.attachEvents();
                console.log('Location Logger UI başarıyla oluşturuldu');
            } catch (error) {
                console.error('Location Logger UI oluşturulurken hata:', error);
                
                setTimeout(initUI, 500);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
           
            setTimeout(initUI, 100);
        }
    }

    createUI() {
        
        if (document.getElementById('locationLoggerButton')) {
            this.logButton = document.getElementById('locationLoggerButton');
            this.logCountBadge = document.getElementById('logCountBadge');
            return;
        }

      
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
                        <button id="toggleLoggingBtn" class="location-logger-action-btn" title="Loglamayı Durdur/Başlat">
                            <i class="material-icons" id="toggleLoggingIcon">pause</i>
                        </button>
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

  
    attachEvents() {
       
        if (!this.logButton) {
            console.error('Location Logger: Log butonu bulunamadı!');
            return;
        }

        
        this.logButton.addEventListener('click', () => {
            console.log('Location Logger butonu tıklandı');
            this.toggleBottomSheet();
        });

       
        const overlay = this.bottomSheet.querySelector('.location-logger-overlay');
        overlay.addEventListener('click', () => {
            this.closeBottomSheet();
        });

        
        const closeBtn = document.getElementById('closeLoggerBtn');
        closeBtn.addEventListener('click', () => {
            this.closeBottomSheet();
        });

        
        const toggleLoggingBtn = document.getElementById('toggleLoggingBtn');
        toggleLoggingBtn.addEventListener('click', () => {
            this.toggleLogging();
        });

        
        const clearBtn = document.getElementById('clearLogsBtn');
        clearBtn.addEventListener('click', () => {
            this.clearLogs();
        });

        
        const exportBtn = document.getElementById('exportLogsBtn');
        exportBtn.addEventListener('click', () => {
            this.exportLogs();
        });
    }

   
    startLogging() {
        this.isLogging = true;
        this.updateLoggingStatus(true);
        this.updateToggleButton();
    }

   
    stopLogging() {
        this.isLogging = false;
        this.updateLoggingStatus(false);
        this.updateToggleButton();
    }

    toggleLogging() {
        if (this.isLogging) {
            this.stopLogging();
        } else {
            this.startLogging();
        }
    }

  
    updateToggleButton() {
        const toggleIcon = document.getElementById('toggleLoggingIcon');
        const toggleBtn = document.getElementById('toggleLoggingBtn');
        if (toggleIcon && toggleBtn) {
            if (this.isLogging) {
                toggleIcon.textContent = 'pause';
                toggleBtn.title = 'Loglamayı Durdur';
            } else {
                toggleIcon.textContent = 'play_arrow';
                toggleBtn.title = 'Loglamayı Başlat';
            }
        }
    }

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
            type: 'normal' 
        };

        
        if (this.lastPosition) {
            const distance = this.calculateDistance(
                this.lastPosition.lat,
                this.lastPosition.lng,
                logEntry.lat,
                logEntry.lng
            );
            logEntry.distance = distance;

           
            if (distance > this.jumpThreshold) {
                logEntry.type = 'jump';
                logEntry.isJump = true;
            }
        }

       
        this.logs.push(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs); 
        }

       
        this.lastPosition = {
            lat: logEntry.lat,
            lng: logEntry.lng
        };

       
        this.updateUI();
    }

  
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; 
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

   
    toRad(degrees) {
        return (degrees * Math.PI) / 180;
    }

 
    updateUI() {
       
        if (this.logCountBadge) {
            this.logCountBadge.textContent = this.logs.length;
            if (this.logs.length > 0) {
                this.logCountBadge.style.display = 'flex';
            }
        }

     
        const jumpCount = this.logs.filter(log => log.type === 'jump').length;
        
        const totalLogsEl = document.getElementById('totalLogsCount');
        const jumpCountEl = document.getElementById('jumpCount');
        
        if (totalLogsEl) totalLogsEl.textContent = this.logs.length;
        if (jumpCountEl) jumpCountEl.textContent = jumpCount;
        
        // Sadece bottom sheet açıksa log listesini güncelle
        if (this.bottomSheet && this.bottomSheet.classList.contains('active')) {
            this.updateLogList();
        }
    }

    
    updateLogList() {
        // Container'ı her seferinde DOM'dan al (güncellemeyi garantilemek için)
        const logContainer = document.getElementById('logContainer');
        if (!logContainer) {
            console.warn('Location Logger: logContainer bulunamadı, bottom sheet henüz oluşturulmamış olabilir');
            return;
        }
        
        // Referansı güncelle
        this.logContainer = logContainer;

        if (this.logs.length === 0) {
            this.logContainer.innerHTML = '<div class="location-logger-empty">Henüz log kaydı yok</div>';
            return;
        }

        // Logları ters sırada göster (en yeni üstte)
        const logHTML = this.logs
            .slice()
            .reverse()
            .map(log => this.createLogItemHTML(log))
            .join('');
        
        this.logContainer.innerHTML = logHTML;

        // En üste scroll et (çünkü en yeni loglar üstte)
        setTimeout(() => {
            if (this.logContainer) {
                this.logContainer.scrollTop = 0;
            }
        }, 0);
    }

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

  
    toggleBottomSheet() {
        if (this.bottomSheet.classList.contains('active')) {
            this.closeBottomSheet();
        } else {
            this.openBottomSheet();
        }
    }

  
    openBottomSheet() {
        this.bottomSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Container'ı her açıldığında yeniden al
        this.logContainer = document.getElementById('logContainer');
        
        // Her zaman güncel log listesini göster
        setTimeout(() => {
            this.updateLogList();
        }, 50);
    }

    
    closeBottomSheet() {
        this.bottomSheet.classList.remove('active');
        document.body.style.overflow = '';
    }

    
    clearLogs() {
        if (confirm('Tüm logları temizlemek istediğinize emin misiniz?')) {
            this.logs = [];
            this.lastPosition = null;
            
            this.logContainer = document.getElementById('logContainer');
            
            this.updateUI();
            
            if (this.logContainer) {
                this.logContainer.scrollTop = 0;
            }
        }
    }

   
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


window.LocationLogger = LocationLogger;

