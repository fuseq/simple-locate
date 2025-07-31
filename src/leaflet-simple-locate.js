/*
 * Leaflet.SimpleLocate v1.0.4 - 2024-6-15
 *
 * Copyright 2024 mfhsieh
 * mfhsieh@gmail.com
 *
 * Licensed under the MIT license.
 *
 * Demos:
 * https://mfhsieh.github.io/leaflet-simple-locate/
 *
 * Source:
 * git@github.com:mfhsieh/leaflet-simple-locate.git
 *
 */
(function (factory) {

    if (typeof define === 'function' && define.amd) {  // eslint-disable-line no-undef
        // define an AMD module that relies on 'leaflet'
        define(['leaflet'], factory);  // eslint-disable-line no-undef

    } else if (typeof exports === 'object') {
        // define a Common JS module that relies on 'leaflet'
        module.exports = factory(require('leaflet'));  // eslint-disable-line no-undef

    } else if (typeof window !== 'undefined') {
        // attach your plugin to the global 'L' variable
        if (typeof window.L === "undefined") throw "Leaflet must be loaded first.";
        window.L.Control.SimpleLocate = factory(window.L);
    }
})(function (L) {
    "use strict";

    const SimpleLocate = L.Control.extend({
        options: {
            className: "",
            title: "Locate Geolocation and Orientation",
            ariaLabel: "",

            minAngleChange: 3,
            clickTimeoutDelay: 500,

            setViewAfterClick: true,
            zoomLevel: undefined,
            drawCircle: true,

            // Wei Ye algoritması için seçenekler
            medianWindowSize: 5,          // Median filtre için pencere boyutu
            kalmanProcessNoise: 0.01,     // Kalman filtresi için Q değeri
            kalmanMeasurementNoise: 0.1,  // Kalman filtresi için R değeri
            jumpThreshold: 0.0001,        // Ani sıçrama tespit eşiği (yaklaşık 10-20m)
            showFilterInfo: false,        // Filtreleme bilgisini konsola yazdır
            enableFiltering: true,        // Filtrelemeyi etkinleştir/devre dışı bırak
            showFilterDebug: false,       // Debug bilgilerini göster
            showJumpWarnings: true,       // Sıçrama uyarılarını göster
            lowPassFilterTau: 1.0,        // Filtre zaman sabiti (saniye)
            enableLowPassFilter: true,    // Low Pass Filtreyi etkinleştir/devre dışı bırak

            afterClick: null,
            afterMarkerAdd: null,
            afterDeviceMove: null,

            htmlInit: `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
	<path d="M 8,1.5 A 6.5,6.5 0 0 0 1.5,8 6.5,6.5 0 0 0 8,14.5 6.5,6.5 0 0 0 14.5,8 6.5,6.5 0 0 0 8,1.5 Z m 0,2 A 4.5,4.5 0 0 1 12.5,8 4.5,4.5 0 0 1 8,12.5 4.5,4.5 0 0 1 3.5,8 4.5,4.5 0 0 1 8,3.5 Z" />
	<rect width="1.5" height="4" x="7.25" y="0.5" rx="0.5" ry="0.5" />
	<rect width="1.5" height="4" x="7.25" y="11.5" rx="0.5" ry="0.5" />
	<rect width="4" height="1.5" x="0.5" y="7.25" rx="0.5" ry="0.5" />
	<rect width="4" height="1.5" x="11.5" y="7.25" ry="0.5" rx="0.5" />
	<circle cx="8" cy="8" r="1" />
</svg>`,
            htmlSpinner: `
<svg width="16" height="16" viewBox="-8 -8 16 16" xmlns="http://www.w3.org/2000/svg">
	<g>
		<circle opacity=".7" cx="0" cy="-6" r=".9" transform="rotate(90)" />
		<circle opacity=".9" cx="0" cy="-6" r="1.3" transform="rotate(45)" />
		<circle opacity="1" cx="0" cy="-6" r="1.5" />
		<circle opacity=".95" cx="0" cy="-6" r="1.42" transform="rotate(-45)" />
		<circle opacity=".85" cx="0" cy="-6" r="1.26" transform="rotate(-90)" />
		<circle opacity=".7" cx="0" cy="-6" r="1.02" transform="rotate(-135)" />
		<circle opacity=".5" cx="0" cy="-6" r=".7" transform="rotate(-180)" />
		<circle opacity=".25" cx="0" cy="-6" r=".3" transform="rotate(-225)" />
		<animateTransform attributeName="transform" type="rotate" values="0;0;45;45;90;90;135;135;180;180;225;225;270;270;315;315;360" keyTimes="0;.125;.125;.25;.25;.375;.375;.5;.5;.675;.675;.75;.75;.875;.875;1;1" dur="1.3s" repeatCount="indefinite" />
	</g>
</svg>`,
            htmlGeolocation: `
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
	<path d="M 13.329384,2.6706085 C 13.133096,2.4743297 12.77601,2.4382611 12.303066,2.6103882 L 6.6307133,4.6742285 1.1816923,6.6577732 C 1.0668479,6.6995703 0.95157337,6.752486 0.83540381,6.8133451 0.27343954,7.1201064 0.41842508,7.4470449 1.2644998,7.5962244 l 6.0688263,1.0701854 1.0714872,6.0698222 c 0.1491847,0.84604 0.4751513,0.990031 0.7816575,0.427825 0.060857,-0.116165 0.1137803,-0.231436 0.1555779,-0.346273 L 11.324426,9.3702482 13.389608,3.6968841 C 13.56174,3.2239596 13.52567,2.8668883 13.329392,2.6706094 Z" />
</svg>`,
            htmlOrientation: `
<svg class="leaflet-simple-locate-orientation" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
	<path fill="#c00000" d="M 8,0 C 7.7058986,0 7.4109021,0.30139625 7.1855469,0.90234375 L 5.3378906,5.8300781 C 5.2559225,6.0486598 5.1908259,6.292468 5.1386719,6.5507812 6.0506884,6.193573 7.0205489,6.0068832 8,6 8.9768002,6.0005071 9.945249,6.1798985 10.857422,6.5292969 10.805917,6.2790667 10.741782,6.0425374 10.662109,5.8300781 L 8.8144531,0.90234375 C 8.5890978,0.30139615 8.2941007,0 8,0 Z" />
	<path d="M 8,5.9999998 C 7.0205501,6.006884 6.0506874,6.1935733 5.138672,6.5507817 4.9040515,7.7126196 4.9691485,9.1866095 5.3378906,10.169922 l 1.8476563,4.927734 c 0.4507105,1.201895 1.1781958,1.201894 1.628906,0 L 10.662109,10.169922 C 11.033147,9.1804875 11.097283,7.6944254 10.857422,6.5292967 9.9452497,6.1798989 8.9767993,6.0005076 8,5.9999998 Z m -1e-7,0.7499999 A 1.25,1.258 90 0 1 9.2578124,7.9999996 1.25,1.258 90 0 1 8,9.2500001 a 1.25,1.258 90 0 1 -1.2578124,-1.25 1.25,1.258 90 0 1 1.2578123,-1.2500004 z" />
</svg>`,
            iconGeolocation: L.divIcon({
                html: `
<svg width="24" height="24" viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<filter id="gaussian">
			<feGaussianBlur stdDeviation="0.5" />
		</filter>
	</defs>
	<g id="leaflet-simple-locate-icon-spot">
		<circle fill="#000000" style="opacity:0.3;filter:url(#gaussian)" cx="1" cy="1" r="10" />
		<circle fill="#ffffff" r="10" />
		<circle r="6">
			<animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
		</circle>
	</g>
</svg>`,
                className: "leaflet-simple-locate-icon",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
            iconOrientation: L.divIcon({
                html: `
<svg width="96" height="96" viewBox="-48 -48 96 96" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<linearGradient id="gradient" x2="0" y2="-48" gradientUnits="userSpaceOnUse">
			<stop style="stop-opacity:1" offset="0" />
			<stop style="stop-opacity:0" offset="1" />
		</linearGradient>
		<filter id="gaussian">
			<feGaussianBlur stdDeviation="0.5" />
		</filter>
	</defs>
	<path class="orientation" opacity="1" style="fill:url(#gradient)" d="M -24,-48 H 24 L 10,0 H -10 z">
		<animate attributeName="opacity" values=".75;.33;.75" dur="2s" repeatCount="indefinite" />
	</path>
	<g id="leaflet-simple-locate-icon-spot">
		<circle fill="#000000" style="opacity:0.3;filter:url(#gaussian)" cx="1" cy="1" r="10" />
		<circle fill="#ffffff" r="10" />
		<circle r="6">
			<animate attributeName="r" values="6;9;6" dur="2s" repeatCount="indefinite" />
		</circle>
	</g>
</svg>`,
                className: "leaflet-simple-locate-icon",
                iconSize: [96, 96],
                iconAnchor: [48, 48],
            }),
        },

        initialize: function (options) {
            L.Util.setOptions(this, options);

            // map related
            this._map = undefined;
            this._button = undefined;
            this._marker = undefined;
            this._circle = undefined;

            // button state
            this._clicked = undefined;
            this._geolocation = undefined;
            this._orientation = undefined;
            this._clickTimeout = undefined;

            // geolocation and orientation
            this._latitude = undefined;
            this._longitude = undefined;
            this._accuracy = undefined;
            this._angle = undefined;

            this._lowPassFilterLat = null;
            this._lowPassFilterLng = null;
            this._lowPassFilterInitialized = false;

            // Median Filtre için özellikleri ekle
            this._medianFilter = {
                windowSize: this.options.medianWindowSize,
                latHistory: [],
                lngHistory: [],
                accuracyHistory: [],
                timestampHistory: []
            };

            // Kalman Filtresi için özellikleri ekle
            this._kalmanFilter = {
                Q_lat: this.options.kalmanProcessNoise,
                Q_lng: this.options.kalmanProcessNoise,
                R_lat: this.options.kalmanMeasurementNoise,
                R_lng: this.options.kalmanMeasurementNoise,
                x_lat: null, // Durum tahmini (enlem)
                x_lng: null, // Durum tahmini (boylam)
                P_lat: null, // Tahmin hatası kovaryansı (enlem)
                P_lng: null  // Tahmin hatası kovaryansı (boylam)
            };

            // Wei Ye algoritması durumunu takip etmek için özellikler
            this._weiYeState = {
                lastFilteredPosition: null,
                lastRawPosition: null,
                isJumpDetected: false,
                filteringStats: {
                    totalUpdates: 0,
                    jumpsDetected: 0,
                    maxJumpDistance: 0
                }
            };

            // Filtreleme hata ayıklama için görsel öğeler
            this._rawPositionMarker = undefined;
        },

        // Median Filtreyi uygula
        _applyMedianFilter: function (position) {
            const m = this._medianFilter;
            const now = Date.now();

            // Görsel aykırı değerleri tespit etmek için uzaklığı ölç
            if (m.latHistory.length > 0) {
                const lastLat = m.latHistory[m.latHistory.length - 1];
                const lastLng = m.lngHistory[m.lngHistory.length - 1];
                const distance = L.latLng(lastLat, lastLng).distanceTo(L.latLng(position.latitude, position.longitude));

                if (this.options.showFilterInfo && distance > 50) {
                    console.log(`Wei Ye: Potansiyel aykırı değer tespit edildi - ${Math.round(distance)}m`);
                }
            }

            // Yeni değerleri geçmişe ekle
            m.latHistory.push(position.latitude);
            m.lngHistory.push(position.longitude);
            m.accuracyHistory.push(position.accuracy);
            m.timestampHistory.push(now);

            // Pencere boyutunu aşarsa en eskisini kaldır
            while (m.latHistory.length > m.windowSize) {
                m.latHistory.shift();
                m.lngHistory.shift();
                m.accuracyHistory.shift();
                m.timestampHistory.shift();
            }

            // Eğer yeteri kadar veri yoksa filtreleme yapma
            if (m.latHistory.length < 3) {
                return {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    accuracy: position.accuracy,
                    timestamp: now
                };
            }

            // Değerleri sırala ve ortancayı bul
            const sortedLat = [...m.latHistory].sort((a, b) => a - b);
            const sortedLng = [...m.lngHistory].sort((a, b) => a - b);
            const sortedAcc = [...m.accuracyHistory].sort((a, b) => a - b);

            const midIndex = Math.floor(sortedLat.length / 2);

            return {
                latitude: sortedLat[midIndex],
                longitude: sortedLng[midIndex],
                accuracy: sortedAcc[midIndex],
                timestamp: now
            };
        },

        // Kalman Filtreyi uygula
        _applyWeiYeFilter: function (position) {
            // Filtreleme devre dışıysa, orijinal konumu döndür
            if (!this.options.enableFiltering) {
                return position;
            }

            // İstatistikleri güncelle
            this._weiYeState.filteringStats.totalUpdates++;

            // Ham konumu kaydet
            this._weiYeState.lastRawPosition = {
                latitude: position.latitude,
                longitude: position.longitude,
                accuracy: position.accuracy
            };

            // Low Pass Filter'ı uygula
            let lowPassFiltered = position;

            if (this.options.enableLowPassFilter !== false) {
                // Low Pass Filter'ları ilk kullanım için başlat
                if (!this._lowPassFilterInitialized) {
                    // Örnek frekans: 1 Hz (saniyede bir örnek olduğunu varsayalım)
                    const sampleFrequency = 1.0;

                    // Filtrenin zaman sabitini kullanıcı seçeneğinden al
                    const tau = this.options.lowPassFilterTau || 1.0;

                    // LowPassFilter nesnelerini oluştur
                    this._lowPassFilterLat = new LowPassFilter(sampleFrequency, tau);
                    this._lowPassFilterLng = new LowPassFilter(sampleFrequency, tau);

                    // İlk değerleri ayarla
                    this._lowPassFilterLat.addSample(position.latitude);
                    this._lowPassFilterLng.addSample(position.longitude);

                    // Filtre başlatıldı
                    this._lowPassFilterInitialized = true;

                    // İlk filtreleme için ham değerleri kullan
                    lowPassFiltered = position;
                } else {
                    // Tau değerini kullanıcının hareketi durumuna göre dinamik olarak ayarla
                    let dynamicTau = this.options.lowPassFilterTau || 1.0;

                    // Hareket durumuna göre ayarlama
                    if (this._detectUserMoving()) {
                        // Hareket halindeyse daha düşük tau (daha hızlı tepki)
                        dynamicTau = Math.max(0.3, dynamicTau / 2);
                    } else {
                        // Durağan haldeyse daha yüksek tau (daha fazla yumuşatma)
                        dynamicTau = Math.min(2.0, dynamicTau * 1.5);
                    }

                    // Doğruluk durumuna göre ayarlama
                    if (position.accuracy > 20) {
                        // Düşük doğrulukta daha agresif filtreleme
                        dynamicTau = Math.min(3.0, dynamicTau * 1.5);
                    }

                    // Tau değerini güncelle
                    this._lowPassFilterLat.setTau(dynamicTau);
                    this._lowPassFilterLng.setTau(dynamicTau);

                    // Yeni örnekleri ekle ve filtreleme yap
                    this._lowPassFilterLat.addSample(position.latitude);
                    this._lowPassFilterLng.addSample(position.longitude);

                    // Filtrelenmiş değerleri al
                    lowPassFiltered = {
                        latitude: this._lowPassFilterLat.lastOutput(),
                        longitude: this._lowPassFilterLng.lastOutput(),
                        accuracy: position.accuracy,
                        timestamp: position.timestamp,
                        lpfApplied: true
                    };

                    // Debug için konsola yazdır (opsiyonel)
                    if (this.options.showFilterInfo) {
                        console.log(`Low Pass Filter: ${Math.abs(lowPassFiltered.latitude - position.latitude).toFixed(8)} lat diff, tau: ${dynamicTau.toFixed(2)}`);
                    }
                }
            }

            // Wei Ye algoritmasına Low Pass Filter'dan geçirilmiş veriyi gönder
            // NOT: Burada "position" yerine "lowPassFiltered" kullanıyoruz

            // Performans optimizasyonu: Çok düşük doğruluk değerlerinde (çok kötü GPS sinyali - binalarda)
            // daha agresif filtreleme yap, yüksek doğruluk değerlerinde (iyi GPS sinyali - açık alanda)
            // daha az filtreleme yap
            const isLowAccuracy = lowPassFiltered.accuracy > 20;

            // 2. Median filtre sadece düşük doğruluk durumlarında uygula
            let medianFiltered;
            if (isLowAccuracy) {
                medianFiltered = this._applyMedianFilter(lowPassFiltered);
            } else {
                medianFiltered = lowPassFiltered; // İyi doğruluktaysa median filtre atla
            }

            // 2. Median filtre ve ham veri arasındaki farkı hesapla (atlama tespiti)
            // GPS'in doğruluğunu dikkate alarak sıçramayı hesapla - düşük doğrulukta daha toleranslı ol
            const jumpDistanceThreshold = Math.max(5, position.accuracy / 3); // En az 5m, doğruluk/3 kadar 

            // Sapma mesafesini hesapla
            const jumpDistance = L.latLng(position.latitude, position.longitude)
                .distanceTo(L.latLng(medianFiltered.latitude, medianFiltered.longitude));

            // İstatistikler için en büyük sıçramayı kaydet
            if (jumpDistance > this._weiYeState.filteringStats.maxJumpDistance) {
                this._weiYeState.filteringStats.maxJumpDistance = jumpDistance;
            }

            // Sıçrama tespiti - mesafe ve koordinat farkını kontrol et
            const latDiff = Math.abs(position.latitude - medianFiltered.latitude);
            const lngDiff = Math.abs(position.longitude - medianFiltered.longitude);
            const isJump = (jumpDistance > jumpDistanceThreshold) ||
                (latDiff > this.options.jumpThreshold || lngDiff > this.options.jumpThreshold);

            if (isJump) {
                this._weiYeState.filteringStats.jumpsDetected++;
                this._weiYeState.isJumpDetected = true;

                if (this.options.showFilterInfo) {
                    console.log(`Wei Ye: Sıçrama tespit edildi (${Math.round(jumpDistance)}m) - Median filtrelenmiş değer kullanılıyor`);
                }

                // Sıçrama uyarısı göster - sadece büyük sıçramalarda (10m üstü)
                if (this.options.showJumpWarnings && jumpDistance > 10) {
                    this._showJumpWarning(jumpDistance);
                }
            } else {
                this._weiYeState.isJumpDetected = false;
            }

            // 3. Kalman filtresi uygula, duruma göre parametre ayarla
            // Kalman filtresi ayarlarını hareket durumuna göre ayarla
            const isUserMoving = this._detectUserMoving();

            // Hareket durumuna göre Kalman filtre parametreleri
            if (isUserMoving) {
                // Hareket halinde daha hızlı tepki vermeli
                this._kalmanFilter.Q_lat = this._kalmanFilter.Q_lng = this.options.kalmanProcessNoise * 2;
            } else {
                // Durağan haldeyken daha stabil filtreleme
                this._kalmanFilter.Q_lat = this._kalmanFilter.Q_lng = this.options.kalmanProcessNoise / 2;
            }

            // Kalman parametrelerini ayarla
            if (isJump) {
                // Ani sıçrama tespit edildiğinde ölçüme daha az güven
                this._kalmanFilter.R_lat = this._kalmanFilter.R_lng = 1.0;
                // Median filtrelenmiş değeri kullan
                kalmanInput = medianFiltered;
            } else {
                // Doğruluğa göre dinamik olarak Kalman filtre parametresini ayarla
                const adaptiveR = Math.max(0.05, Math.min(0.5, position.accuracy / 20));
                this._kalmanFilter.R_lat = this._kalmanFilter.R_lng = adaptiveR;

                if (isLowAccuracy) {
                    // Düşük doğrulukta median filtrelenmiş değeri kullan
                    kalmanInput = medianFiltered;
                } else {
                    // İyi doğrulukta ham değeri kullan
                    kalmanInput = position;
                }
            }

            // 4. Kalman filtresini uygula
            const kalmanFiltered = this._applyKalmanFilter(kalmanInput);

            // 5. Filtrelenmiş konumun bilgilerini kaydet
            this._weiYeState.lastFilteredPosition = {
                latitude: kalmanFiltered.latitude,
                longitude: kalmanFiltered.longitude,
                accuracy: kalmanFiltered.accuracy,
                rawLatitude: position.latitude,
                rawLongitude: position.longitude,
                isFiltered: true,
                isJump: isJump
            };

            // Filtreleme görsellerini güncelle (opsiyonel)
            if (this.options.showFilterDebug) {
                this._visualizeFiltering();
            }

            return kalmanFiltered;
        },

        // Sıçrama uyarısı göster
        _showJumpWarning: function (distance) {
            // Uyarı elementi zaten varsa kaldır
            const existingWarning = document.querySelector('.wei-ye-jump-warning');
            if (existingWarning) {
                existingWarning.parentNode.removeChild(existingWarning);
            }

            // Uyarı elementi oluştur
            const warning = L.DomUtil.create('div', 'wei-ye-jump-warning');
            warning.innerHTML = `GPS Sıçraması Tespit Edildi (${Math.round(distance)}m)`;
            document.body.appendChild(warning);

            // 3 saniye sonra kaldır
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.parentNode.removeChild(warning);
                }
            }, 3000);
        },

        // Ham ve filtrelenmiş konumları görselleştir (opsiyonel)
        _visualizeFiltering: function () {
            const state = this._weiYeState;

            if (!state.lastRawPosition || !state.lastFilteredPosition) {
                return;
            }

            // Ham konum göstergesi
            if (!this._rawPositionMarker) {
                this._rawPositionMarker = L.circleMarker(
                    [state.lastRawPosition.latitude, state.lastRawPosition.longitude],
                    {
                        radius: 4,
                        color: '#F44336',
                        fillColor: '#F44336',
                        fillOpacity: 0.5
                    }
                ).addTo(this._map);
            } else {
                this._rawPositionMarker.setLatLng([state.lastRawPosition.latitude, state.lastRawPosition.longitude]);
            }

            // Sıçrama tespit edildiğinde gösterge çizgisi
            if (state.isJumpDetected) {
                const jumpLine = L.polyline([
                    [state.lastRawPosition.latitude, state.lastRawPosition.longitude],
                    [state.lastFilteredPosition.latitude, state.lastFilteredPosition.longitude]
                ], {
                    color: '#FF5722',
                    dashArray: '5, 5',
                    weight: 2,
                    opacity: 0.7
                }).addTo(this._map);

                // 3 saniye sonra çizgiyi kaldır
                setTimeout(() => {
                    if (jumpLine && this._map) {
                        this._map.removeLayer(jumpLine);
                    }
                }, 3000);
            }
        },

        onAdd: function (map) {
            this._map = map;

            this._button = L.DomUtil.create("button", "leaflet-simple-locate");
            if (this.options.className) L.DomUtil.addClass(this._button, this.options.className);
            L.DomEvent.disableClickPropagation(this._button);

            this._button.innerHTML = this.options.htmlInit;
            this._button.title = this.options.title;
            this._button.setAttribute("aria-label", this.options.ariaLabel ? this.options.ariaLabel : this.options.title);

            L.DomEvent
                .on(this._button, "click", L.DomEvent.stopPropagation)
                .on(this._button, "click", L.DomEvent.preventDefault)
                .on(this._button, "click", this._onClick, this);

            return this._button;
        },

        getLatLng: function () {
            if (!this._latitude || !this._longitude) return null;
            return {
                lat: this._latitude,
                lng: this._longitude,
            };
        },

        getAccuracy: function () {
            if (!this._accuracy) return null;
            return this._accuracy;
        },

        getAngle: function () {
            if (!this._angle) return null;
            return this._angle;
        },

        // Filtreleme istatistiklerini al
        getFilteringStats: function () {
            return this._weiYeState.filteringStats;
        },

        // Filtrelemeyi etkinleştir/devre dışı bırak
        setFilteringEnabled: function (enabled) {
            this.options.enableFiltering = enabled;
            return this;
        },

        setZoomLevel: function (level) {
            this.options.zoomLevel = level;
        },

        _onClick: async function () {
            if (this._clickTimeout) {
                // console.log("_onClick: double click", new Date().toISOString());
                clearTimeout(this._clickTimeout);
                this._clickTimeout = undefined;

                if (this._clicked) {
                    if (this._geolocation) this._unwatchGeolocation();
                    if (this._orientation) this._unwatchOrientation();
                    this._clicked = undefined;
                    this._geolocation = undefined;
                    this._orientation = undefined;
                    this._updateButton();
                    this._map.off("layeradd", this._onLayerAdd, this);

                    // Filtreleme verilerini sıfırla
                    this._resetFilters();
                }
            } else {
                this._clickTimeout = setTimeout(() => {
                    // console.log("_onClick: single click", new Date().toISOString());
                    clearTimeout(this._clickTimeout);
                    this._clickTimeout = undefined;

                    if (!this._map) return;

                    if (this._clicked && this.options.setViewAfterClick) {
                        this._setView();
                        return;
                    }

                    this._clicked = true;
                    this._updateButton();
                    this._map.on("layeradd", this._onLayerAdd, this);

                    this._checkGeolocation().then((event) => {
                        // console.log("_checkGeolocation", new Date().toISOString(), "success!");
                        this._geolocation = true;
                        this._onLocationFound(event.coords);
                        if (this.options.setViewAfterClick) this._setView();
                        this._watchGeolocation();
                        this._checkClickResult();
                    }).catch(() => {
                        // console.log("_checkGeolocation", new Date().toISOString(), "failed!");
                        this._geolocation = false;
                        this._checkClickResult();
                    });

                    this._checkOrientation().then(() => {
                        // console.log("_checkOrientation", new Date().toISOString(), "success!");
                        this._orientation = true;
                        this._watchOrientation();
                        this._checkClickResult();
                    }).catch(() => {
                        // console.log("_checkOrientation", new Date().toISOString(), "failed!");
                        this._orientation = false;
                        this._checkClickResult();
                    });
                }, this.options.clickTimeoutDelay);
            }
        },

        // Filtreleme verilerini sıfırla
        _resetFilters: function () {
            // Median filtre verilerini sıfırla
            this._medianFilter.latHistory = [];
            this._medianFilter.lngHistory = [];
            this._medianFilter.accuracyHistory = [];
            this._medianFilter.timestampHistory = [];

            // Kalman filtre verilerini sıfırla
            this._kalmanFilter.x_lat = null;
            this._kalmanFilter.x_lng = null;
            this._kalmanFilter.P_lat = null;
            this._kalmanFilter.P_lng = null;

            // Wei Ye durumunu sıfırla
            this._weiYeState.lastFilteredPosition = null;
            this._weiYeState.lastRawPosition = null;
            this._weiYeState.isJumpDetected = false;
            this._weiYeState.filteringStats = {
                totalUpdates: 0,
                jumpsDetected: 0,
                maxJumpDistance: 0
            };
            this._lowPassFilterLat = null;
            this._lowPassFilterLng = null;
            this._lowPassFilterInitialized = false;

            // Debug görsellerini kaldır
            if (this._rawPositionMarker && this._map) {
                this._map.removeLayer(this._rawPositionMarker);
                this._rawPositionMarker = undefined;
            }
        },

        _checkClickResult: function () {
            this._updateButton();

            if (this.options.afterClick && typeof this._geolocation !== "undefined" && typeof this._orientation !== "undefined")
                this.options.afterClick({
                    geolocation: this._geolocation,
                    orientation: this._orientation,
                });

            if (this._geolocation === false && this._orientation === false) {
                this._clicked = undefined;
                this._geolocation = undefined;
                this._orientation = undefined;
            }
        },

        _checkGeolocation: function () {
            if (typeof navigator !== "object" || !("geolocation" in navigator) ||
                typeof navigator.geolocation.getCurrentPosition !== "function" || typeof navigator.geolocation.watchPosition !== "function")
                return Promise.reject();

            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 0, enableHighAccuracy: true });
            });
        },

        _checkOrientation: function () {
            if (!("ondeviceorientationabsolute" in window || "ondeviceorientation" in window) || !DeviceOrientationEvent)
                return Promise.reject();

            if (typeof DeviceOrientationEvent.requestPermission !== "function")
                return Promise.resolve();

            return DeviceOrientationEvent.requestPermission().then((permission) => {
                if (permission === "granted") return true;
                else return Promise.reject();
            });
        },

        _watchGeolocation: function () {
            // console.log("_watchGeolocation");
            this._map.locate({ watch: true, enableHighAccuracy: true });
            this._map.on("locationfound", this._onLocationFound, this);
            // this._map.on("locationerror", this._onLocationError, this);
            this._map.on("zoomstart", this._onZoomStart, this);
            this._map.on("zoomend", this._onZoomEnd, this);
        },

        _unwatchGeolocation: function () {
            // console.log("_unwatchGeolocation");
            this._map.stopLocate();
            this._map.off("locationfound", this._onLocationFound, this);
            // this._map.off("locationerror", this._onLocationError, this);
            this._map.off("zoomstart", this._onZoomStart, this);
            this._map.off("zoomend", this._onZoomEnd, this);

            if (this._circle) {
                this._map.removeLayer(this._circle);
                this._circle = undefined;
            }
            if (this._marker) {
                this._map.removeLayer(this._marker);
                this._marker = undefined;
            }
            this._latitude = undefined;
            this._longitude = undefined;
            this._accuracy = undefined;
        },

        _watchOrientation: function () {
            // console.log("_watchOrientation");
            L.DomEvent.on(window, "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", this._onOrientation, this);
        },

        _unwatchOrientation: function () {
            // console.log("_unwatchOrientation");
            L.DomEvent.off(window, "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", this._onOrientation, this);
            document.documentElement.style.setProperty("--leaflet-simple-locate-orientation", "0deg");
            this._angle = undefined;
        },

        _onLocationFound: function (event) {
            // Wei Ye algoritması ile konumu filtrele
            const filteredPosition = this._applyWeiYeFilter(event);

            // Önceki filtrelenmiş konumla aynıysa güncelleme yapma (micro değişiklikleri engelle)
            if (this._latitude && filteredPosition.latitude &&
                Math.round(this._latitude * 1000000) === Math.round(filteredPosition.latitude * 1000000) &&
                this._longitude && filteredPosition.longitude &&
                Math.round(this._longitude * 1000000) === Math.round(filteredPosition.longitude * 1000000) &&
                this._accuracy && filteredPosition.accuracy &&
                Math.round(this._accuracy * 100) === Math.round(filteredPosition.accuracy * 100)) return;

            // Filtrelenmiş değerleri kaydet
            this._latitude = filteredPosition.latitude;
            this._longitude = filteredPosition.longitude;
            this._accuracy = filteredPosition.accuracy;

            // Marker'ı güncelle
            this._updateMarker();
        },

        _onOrientation: function (event) {
            // console.log("_onOrientation", new Date().toISOString(), event.absolute, event.alpha, event.beta, event.gamma);
            let angle;
            if (event.webkitCompassHeading) angle = event.webkitCompassHeading;
            else angle = 360 - event.alpha;  // todos: test needed...

            if (this._angle && Math.abs(angle - this._angle) < this.options.minAngleChange) return;
            this._angle = angle;

            if ("orientation" in screen) this._angle += screen.orientation.angle;
            // else if (typeof window.orientation !== 'undefined') this._angle += window.orientation;  // it seems unnecessary.
            this._angle = (this._angle + 360) % 360;

            document.documentElement.style.setProperty("--leaflet-simple-locate-orientation", -this._angle + "deg");
            this._updateMarker();
        },

        _onZoomStart: function () {
            if (this._circle) document.documentElement.style.setProperty("--leaflet-simple-locate-circle-display", "none");
        },

        _onZoomEnd: function () {
            if (this._circle) document.documentElement.style.setProperty("--leaflet-simple-locate-circle-display", "inline");
        },

        _onLayerAdd: function (event) {
            if (this.options.afterMarkerAdd && event.layer == this._marker) {
                // console.log("_onLayerAdd", new Date().toISOString(), event.layer.icon_name ? event.layer.icon_name : "undefined", event.layer);
                this.options.afterMarkerAdd();
            }
        },

        _setView: function () {
            if (!this._map || !this._latitude || !this._longitude) return;

            if (this.options.zoomLevel)
                this._map.setView([this._latitude, this._longitude], this.options.zoomLevel);
            else
                this._map.setView([this._latitude, this._longitude]);
        },

        _updateButton: function () {
            if (!this._clicked) {
                if (this._button.html_name !== "init") {
                    this._button.innerHTML = this.options.htmlInit;
                    this._button.html_name = "init";
                }
                return;
            }

            if (typeof this._geolocation === "undefined" || typeof this._orientation === "undefined") {
                if (this._button.html_name !== "spinner") {
                    this._button.innerHTML = this.options.htmlSpinner;
                    this._button.html_name = "spinner";
                }
                return;
            }

            if (this._orientation && this._button.html_name !== "orientation") {
                this._button.innerHTML = this.options.htmlOrientation;
                this._button.html_name = "orientation";
                return;
            }

            if (this._geolocation && this._button.html_name !== "geolocation") {
                this._button.innerHTML = this.options.htmlGeolocation;
                this._button.html_name = "geolocation";
            }
        },

        _updateMarker: function () {
            if (this.options.afterDeviceMove) {
                // Callback fonksiyonunu çağır, filtrelenmiş konumu ve filtreleme istatistiklerini kullan
                this.options.afterDeviceMove({
                    lat: this._latitude,
                    lng: this._longitude,
                    accuracy: this._accuracy,
                    angle: this._angle,
                    isFiltered: true,
                    isJump: this._weiYeState.isJumpDetected,
                    filterStats: this._weiYeState.filteringStats
                });
            }

            if (!this._latitude || !this._longitude || (this.options.drawCircle && !this._accuracy)) return;

            let icon_name;
            if (this._geolocation && this._orientation && this._angle) icon_name = "iconOrientation";
            else if (this._geolocation) icon_name = "iconGeolocation";
            else return;

            // Doğruluk çok düşükse (>50m), sadece olası konum dairesini göster, işaretçiyi gizle
            const isLowAccuracy = this._accuracy > 50;

            // Doğruluk dairesini her zaman güncelle
            if (this._circle) {
                this._circle.setLatLng([this._latitude, this._longitude]);
                this._circle.setRadius(this._accuracy);

                // Doğruluk düzeyine göre dairenin stilini ayarla
                const accuracyColor = this._getAccuracyColor(this._accuracy);

                // Çok düşük doğrulukta daha vurgulu stil
                if (isLowAccuracy) {
                    this._circle.setStyle({
                        fillColor: '#F44336',  // Kırmızı
                        color: '#F44336',
                        fillOpacity: 0.15,
                        opacity: 0.6,
                        weight: 2,
                        dashArray: '5, 5',
                        // Pulsating efekti için bir sınıf ekle
                        className: 'leaflet-simple-locate-circle leaflet-simple-locate-circle-low-accuracy'
                    });
                } else {
                    this._circle.setStyle({
                        fillColor: accuracyColor,
                        color: accuracyColor,
                        fillOpacity: 0.2,
                        opacity: 0.5,
                        weight: 1,
                        dashArray: null,
                        // Normal stil için sınıfı güncelle
                        className: 'leaflet-simple-locate-circle'
                    });
                }

                // Sıçrama tespit edildiyse ve doğruluk düşük değilse visual feedback
                if (this._weiYeState.isJumpDetected && !isLowAccuracy) {
                    this._circle.setStyle({
                        dashArray: "5, 5",
                        fillOpacity: 0.3,
                        opacity: 0.8
                    });

                    // Birkaç saniye sonra normale döndür
                    setTimeout(() => {
                        if (this._circle) {
                            this._circle.setStyle({
                                dashArray: isLowAccuracy ? "5, 5" : null,
                                fillOpacity: isLowAccuracy ? 0.15 : 0.2,
                                opacity: isLowAccuracy ? 0.6 : 0.5
                            });
                        }
                    }, 2000);
                }

            } else if (this.options.drawCircle) {
                // İlk kez daire oluşturma
                this._circle = L.circle([this._latitude, this._longitude], {
                    className: isLowAccuracy ? 'leaflet-simple-locate-circle leaflet-simple-locate-circle-low-accuracy' : 'leaflet-simple-locate-circle',
                    radius: this._accuracy,
                    fillColor: isLowAccuracy ? '#F44336' : this._getAccuracyColor(this._accuracy),
                    color: isLowAccuracy ? '#F44336' : this._getAccuracyColor(this._accuracy),
                    fillOpacity: isLowAccuracy ? 0.15 : 0.2,
                    opacity: isLowAccuracy ? 0.6 : 0.5,
                    weight: isLowAccuracy ? 2 : 1,
                    dashArray: isLowAccuracy ? '5, 5' : null
                }).addTo(this._map);
            }

            // Konum marker'ını güncelle veya göster/gizle
            if (isLowAccuracy) {
                // Çok düşük doğrulukta, marker'ı gizle (varsa)
                if (this._marker) {
                    this._map.removeLayer(this._marker);
                    this._marker = undefined;
                }
            } else {
                // Normal doğrulukta, marker'ı göster ve güncelle
                if (this._marker && this._marker.icon_name === icon_name) {
                    this._marker.setLatLng([this._latitude, this._longitude]);
                } else {
                    if (this._marker) this._map.removeLayer(this._marker);
                    this._marker = L.marker([this._latitude, this._longitude], {
                        icon: this.options[icon_name]
                    });
                    this._marker.icon_name = icon_name;
                    this._marker.addTo(this._map);
                }
            }

            // Doğruluk bilgisini güncelle - opsiyonel
            this._lastAccuracy = this._accuracy;
        },

        // Doğruluk değerine göre renk döndür
        _getAccuracyColor: function (accuracy) {
            if (accuracy <= 5) {
                return '#4CAF50'; // İyi doğruluk - Yeşil
            } else if (accuracy <= 15) {
                return '#FFC107'; // Orta doğruluk - Sarı
            } else if (accuracy <= 30) {
                return '#FF9800'; // Düşük doğruluk - Turuncu
            } else {
                return '#F44336'; // Çok düşük doğruluk - Kırmızı
            }
        },

        // Uzun süreli hareketsizlik tespiti (opsiyonel)
        _detectStationaryState: function () {
            const m = this._medianFilter;

            // Geçmiş penceresinde yeterli veri yoksa, durağan değil
            if (m.latHistory.length < m.windowSize) {
                return false;
            }

            // Penceredeki ilk ve son konum arasındaki farkı hesapla
            const firstLat = m.latHistory[0];
            const firstLng = m.lngHistory[0];
            const lastLat = m.latHistory[m.latHistory.length - 1];
            const lastLng = m.lngHistory[m.lngHistory.length - 1];

            const distance = L.latLng(firstLat, firstLng).distanceTo(L.latLng(lastLat, lastLng));

            // 5 metreden az hareket olduysa, durağan kabul et
            return distance < 5;
        }
    });

    L.control.simpleLocate = function (options) {
        return new SimpleLocate(options);
    };

    return SimpleLocate;
});
