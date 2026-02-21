document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // MAP INIT
    // ============================================================
    var map = L.map('map', { zoomControl: true }).setView([28.0, 3.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // ============================================================
    // FACILITY TYPES CONFIG (icon + color per type)
    // ============================================================
    var TYPE_CFG = {
        'بلدية':          { ico: 'fas fa-landmark',         color: '#1b5e42', bg: '#e8f5e9' },
        'مستشفى':         { ico: 'fas fa-hospital',          color: '#c62828', bg: '#ffebee' },
        'عيادة':           { ico: 'fas fa-notes-medical',     color: '#e53935', bg: '#ffebee' },
        'مديرية':          { ico: 'fas fa-building-columns',  color: '#1565c0', bg: '#e3f2fd' },
        'محكمة':           { ico: 'fas fa-gavel',             color: '#6a1b9a', bg: '#f3e5f5' },
        'وحدة الحالة المدنية': { ico: 'fas fa-file-signature', color: '#00695c', bg: '#e0f2f1' },
        'مصلحة الجوازات': { ico: 'fas fa-passport',          color: '#0277bd', bg: '#e1f5fe' },
        'دائرة':           { ico: 'fas fa-city',              color: '#558b2f', bg: '#f1f8e9' },
        'مدرسة':           { ico: 'fas fa-school',            color: '#f57f17', bg: '#fffde7' },
        'جامعة':           { ico: 'fas fa-graduation-cap',   color: '#4527a0', bg: '#ede7f6' },
        'موثق':            { ico: 'fas fa-stamp',             color: '#4e342e', bg: '#efebe9' },
        'محامي':           { ico: 'fas fa-scale-balanced',   color: '#37474f', bg: '#eceff1' },
        'محضر قضائي':     { ico: 'fas fa-file-contract',    color: '#455a64', bg: '#eceff1' },
        'مهندس معماري':   { ico: 'fas fa-drafting-compass',  color: '#5d4037', bg: '#efebe9' },
        'default':         { ico: 'fas fa-map-pin',           color: '#1b5e42', bg: '#e8f5e9' }
    };

    function getCfg(type) {
        return TYPE_CFG[type] || TYPE_CFG['default'];
    }

    // ============================================================
    // MARKER LAYERS
    // ============================================================
    var facilityLayer = L.layerGroup().addTo(map); // registered facilities
    var userMarker    = null;
    var allFacilities = [];    // raw data
    var filteredFacs  = [];    // after filter/search
    var facilityMarkers = [];  // {fac, marker} pairs

    // ============================================================
    // BUILD CUSTOM ICON
    // ============================================================
    function makeIcon(type, isNew) {
        var cfg = getCfg(type);
        var pulse = isNew ? [
            '<div style="position:absolute;inset:-6px;border-radius:50%;',
            'background:'+cfg.color+';opacity:.18;animation:markerPulse 2s ease-out 3"></div>'
        ].join('') : '';
        var html = [
            '<div style="position:relative;width:40px;height:40px">',
            pulse,
            '<div style="',
            'width:40px;height:40px;border-radius:50%;',
            'background:'+cfg.color+';',
            'border:3px solid #fff;',
            'box-shadow:0 4px 16px rgba(0,0,0,0.3);',
            'display:flex;align-items:center;justify-content:center;',
            'color:#fff;font-size:15px;position:relative;z-index:1;',
            '">',
            '<i class="'+cfg.ico+'"></i>',
            '</div></div>'
        ].join('');
        return L.divIcon({ html: html, className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22] });
    }

    function makeUserIcon() {
        var html = [
            '<div style="position:relative;width:20px;height:20px">',
            '<div style="position:absolute;inset:-4px;border-radius:50%;background:#c8a84b;opacity:.2;animation:markerPulse 1.5s infinite"></div>',
            '<div style="width:20px;height:20px;border-radius:50%;background:#c8a84b;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.4);"></div>',
            '</div>'
        ].join('');
        return L.divIcon({ html: html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
    }

    /* inject pulse keyframe once */
    var _ps = document.createElement('style');
    _ps.textContent = '@keyframes markerPulse{0%{transform:scale(1);opacity:.18}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}';
    document.head.appendChild(_ps);

    // ============================================================
    // POPUP CONTENT
    // ============================================================
    function makePopup(fac) {
        var cfg = getCfg(fac.type);
        var hours = (fac.from && fac.to) ? fac.from + ' — ' + fac.to : null;
        return [
            '<div style="font-family:Cairo,Tajawal,sans-serif;direction:rtl;width:230px;padding:0">',

            /* header band */
            '<div style="background:'+cfg.color+';padding:12px 14px;border-radius:0;margin:-1px -1px 0">',
            '<div style="display:flex;align-items:center;gap:9px">',
            '<div style="width:36px;height:36px;border-radius:9px;background:rgba(255,255,255,0.18);',
            'display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0">',
            '<i class="'+cfg.ico+'"></i></div>',
            '<div>',
            '<div style="font-weight:800;font-size:13.5px;color:#fff;line-height:1.3">'+fac.name+'</div>',
            '<div style="font-size:10.5px;color:rgba(255,255,255,0.78);font-weight:600;margin-top:2px">'+fac.type+'</div>',
            '</div></div></div>',

            /* body */
            '<div style="padding:11px 14px;display:flex;flex-direction:column;gap:6px">',

            fac.wilaya ? [
              '<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:#4a5a52">',
              '<div style="width:22px;height:22px;border-radius:6px;background:'+cfg.color+'18;',
              'display:flex;align-items:center;justify-content:center;flex-shrink:0">',
              '<i class="fas fa-location-dot" style="color:'+cfg.color+';font-size:10px"></i></div>',
              '<span>ولاية '+fac.wilaya+'</span></div>'
            ].join('') : '',

            fac.address ? [
              '<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:#5a7066">',
              '<div style="width:22px;height:22px;border-radius:6px;background:'+cfg.color+'18;',
              'display:flex;align-items:center;justify-content:center;flex-shrink:0">',
              '<i class="fas fa-map-marker-alt" style="color:'+cfg.color+';font-size:10px"></i></div>',
              '<span style="line-height:1.4">'+fac.address+'</span></div>'
            ].join('') : '',

            fac.phone ? [
              '<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:#4a5a52">',
              '<div style="width:22px;height:22px;border-radius:6px;background:'+cfg.color+'18;',
              'display:flex;align-items:center;justify-content:center;flex-shrink:0">',
              '<i class="fas fa-phone" style="color:'+cfg.color+';font-size:10px"></i></div>',
              '<span>'+fac.phone+'</span></div>'
            ].join('') : '',

            hours ? [
              '<div style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:#4a5a52">',
              '<div style="width:22px;height:22px;border-radius:6px;background:'+cfg.color+'18;',
              'display:flex;align-items:center;justify-content:center;flex-shrink:0">',
              '<i class="fas fa-clock" style="color:'+cfg.color+';font-size:10px"></i></div>',
              '<span>'+hours+'</span></div>'
            ].join('') : '',

            fac.email ? [
              '<div style="display:flex;align-items:center;gap:7px;font-size:10.5px;color:#5a7066">',
              '<div style="width:22px;height:22px;border-radius:6px;background:'+cfg.color+'18;',
              'display:flex;align-items:center;justify-content:center;flex-shrink:0">',
              '<i class="fas fa-envelope" style="color:'+cfg.color+';font-size:10px"></i></div>',
              '<span style="word-break:break-all">'+fac.email+'</span></div>'
            ].join('') : '',

            '</div>',

            /* CTA button */
            '<div style="padding:0 14px 13px">',
            '<a href="appointments.html" style="display:flex;align-items:center;justify-content:center;gap:7px;',
            'padding:9px 12px;background:'+cfg.color+';color:#fff;border-radius:9px;',
            'font-size:12.5px;font-weight:700;text-decoration:none;transition:opacity .18s" ',
            'onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">',
            '<i class="fas fa-calendar-plus"></i>احجز موعداً الآن</a>',
            '</div>',

            '</div>'
        ].join('');
    }

    // ============================================================
    // LOAD + RENDER FACILITIES
    // ============================================================
    function loadFacilities() {
        allFacilities = JSON.parse(localStorage.getItem('ordo_facilities') || '[]')
            .filter(function (f) { return f.lat && f.lng; });
        applyFilter();
    }

    function renderMarkers() {
        facilityLayer.clearLayers();
        facilityMarkers = [];

        /* sort by creation time so newest is last (shown on top) */
        var sorted = filteredFacs.slice().sort(function(a,b){
            return (a.created||'') < (b.created||'') ? -1 : 1;
        });
        var newestId = sorted.length ? (sorted[sorted.length-1].id || '') : '';

        sorted.forEach(function (fac) {
            if (!fac.lat || !fac.lng) return;
            var isNew = fac.id === newestId;
            var marker = L.marker([parseFloat(fac.lat), parseFloat(fac.lng)], { icon: makeIcon(fac.type, isNew) })
                .addTo(facilityLayer)
                .bindPopup(makePopup(fac), { maxWidth: 280, className: 'ordo-popup', offset:[0,0] });
            facilityMarkers.push({ fac: fac, marker: marker });
        });

        updateResultCount();
        renderResultsList();
    }

    // ============================================================
    // SEARCH + FILTER STATE
    // ============================================================
    var activeType   = 'all';
    var activeWilaya = 'all';
    var searchQuery  = '';

    function applyFilter() {
        filteredFacs = allFacilities.filter(function (f) {
            var matchType   = (activeType   === 'all') || (f.type   === activeType);
            var matchWilaya = (activeWilaya === 'all') || (f.wilaya === activeWilaya);
            var q = searchQuery.trim().toLowerCase();
            var matchSearch = !q || (
                (f.name    || '').toLowerCase().includes(q) ||
                (f.type    || '').toLowerCase().includes(q) ||
                (f.wilaya  || '').toLowerCase().includes(q) ||
                (f.address || '').toLowerCase().includes(q)
            );
            return matchType && matchWilaya && matchSearch;
        });
        renderMarkers();
    }

    function updateResultCount() {
        var el = document.getElementById('fac-count');
        if (el) el.textContent = filteredFacs.length + ' مرفق';
    }

    // ============================================================
    // RESULTS LIST PANEL (cards under search)
    // ============================================================
    function renderResultsList() {
        var list = document.getElementById('fac-results-list');
        if (!list) return;

        if (filteredFacs.length === 0) {
            list.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#5a7066;font-size:.85rem"><i class="fas fa-search" style="display:block;font-size:2rem;margin-bottom:.5rem;opacity:.3"></i>لا توجد نتائج</div>';
            return;
        }

        list.innerHTML = filteredFacs.map(function (fac, i) {
            var cfg = getCfg(fac.type);
            return [
                '<div class="fac-result-item" onclick="focusFac(' + i + ')" style="',
                'display:flex;align-items:center;gap:10px;padding:10px 14px;',
                'border-bottom:1px solid #eee;cursor:pointer;transition:background .15s">',
                '<div style="width:36px;height:36px;border-radius:9px;background:' + cfg.color + ';flex-shrink:0;',
                'display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">',
                '<i class="' + cfg.ico + '"></i></div>',
                '<div style="flex:1;min-width:0">',
                '<div style="font-weight:700;font-size:.82rem;color:#1a2a22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + fac.name + '</div>',
                '<div style="font-size:.72rem;color:' + cfg.color + ';font-weight:600">' + fac.type + ' — ' + (fac.wilaya || '') + '</div>',
                '</div>',
                '<i class="fas fa-chevron-left" style="color:#ccc;font-size:.7rem;flex-shrink:0"></i>',
                '</div>'
            ].join('');
        }).join('');
    }

    window.focusFac = function (i) {
        var fac = filteredFacs[i];
        if (!fac) return;
        var pair = facilityMarkers.find(function (p) { return p.fac === fac; });
        if (pair) {
            map.setView([fac.lat, fac.lng], 15, { animate: true });
            pair.marker.openPopup();
        }
        document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
    };

    // ============================================================
    // BUILD SEARCH + FILTER UI
    // ============================================================
    function buildSearchPanel() {
        var container = document.getElementById('fac-search-panel');
        if (!container) return;

        // Gather unique types + wilayas from registered facilities
        var types   = ['all'].concat([...new Set(allFacilities.map(function (f) { return f.type; }).filter(Boolean))]);
        var wilayas = ['all'].concat([...new Set(allFacilities.map(function (f) { return f.wilaya; }).filter(Boolean))].sort());

        var typeOptions = types.map(function (t) {
            var label = t === 'all' ? 'كل الأنواع' : t;
            return '<option value="' + t + '">' + label + '</option>';
        }).join('');

        var wilayaOptions = wilayas.map(function (w) {
            var label = w === 'all' ? 'كل الولايات' : ('ولاية ' + w);
            return '<option value="' + w + '">' + label + '</option>';
        }).join('');

        container.innerHTML = [
            // Search bar row
            '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center">',
            '<div style="flex:1;position:relative">',
            '<i class="fas fa-search" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#5a7066;font-size:.82rem;pointer-events:none"></i>',
            '<input id="fac-search-inp" type="text" placeholder="ابحث باسم المرفق، النوع، أو الولاية..." ',
            'style="width:100%;padding:.6rem .6rem .6rem 2.4rem;border:1.5px solid #dde6e2;border-radius:9px;',
            'font-family:Cairo,sans-serif;font-size:.83rem;outline:none;transition:border .2s;direction:rtl;padding-right:2.4rem" ',
            'oninput="handleSearch(this.value)">',
            '</div>',
            '<button onclick="clearSearch()" title="مسح البحث" style="padding:.6rem .85rem;border:1.5px solid #dde6e2;border-radius:9px;background:#fff;cursor:pointer;color:#5a7066;font-size:.82rem;transition:all .2s"><i class="fas fa-times"></i></button>',
            '</div>',
            // Filters row
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">',
            '<select id="fac-type-sel" onchange="handleTypeFilter(this.value)" ',
            'style="padding:.5rem .8rem;border:1.5px solid #dde6e2;border-radius:8px;font-family:Cairo,sans-serif;font-size:.78rem;color:#1a2a22;outline:none;background:#fff;cursor:pointer">',
            typeOptions,
            '</select>',
            '<select id="fac-wil-sel" onchange="handleWilayaFilter(this.value)" ',
            'style="padding:.5rem .8rem;border:1.5px solid #dde6e2;border-radius:8px;font-family:Cairo,sans-serif;font-size:.78rem;color:#1a2a22;outline:none;background:#fff;cursor:pointer">',
            wilayaOptions,
            '</select>',
            '<span id="fac-count" style="margin-right:auto;font-size:.75rem;font-weight:700;color:#5a7066;background:#f4f6f5;padding:.35rem .8rem;border-radius:50px">—</span>',
            '</div>',
            // Results list
            '<div id="fac-results-list" style="max-height:260px;overflow-y:auto;border:1px solid #eee;border-radius:10px;background:#fff">',
            '</div>'
        ].join('');
    }

    // ============================================================
    // EVENT HANDLERS (global so onclick="" works)
    // ============================================================
    window.handleSearch = function (val) {
        searchQuery = val;
        applyFilter();
        var inp = document.getElementById('fac-search-inp');
        if (inp) inp.style.borderColor = val ? '#1b5e42' : '#dde6e2';
    };

    window.clearSearch = function () {
        searchQuery = '';
        var inp = document.getElementById('fac-search-inp');
        if (inp) { inp.value = ''; inp.style.borderColor = '#dde6e2'; }
        applyFilter();
    };

    window.handleTypeFilter = function (val) {
        activeType = val;
        applyFilter();
    };

    window.handleWilayaFilter = function (val) {
        activeWilaya = val;
        applyFilter();
    };

    // ============================================================
    // HOVER effect on result items
    // ============================================================
    document.addEventListener('mouseover', function (e) {
        var item = e.target.closest('.fac-result-item');
        if (item) item.style.background = '#f4f6f5';
    });
    document.addEventListener('mouseout', function (e) {
        var item = e.target.closest('.fac-result-item');
        if (item) item.style.background = '';
    });

    // ============================================================
    // GPS — USER LOCATE BUTTON
    // ============================================================
    var locateBtn      = document.getElementById('locate-btn');
    var locationStatus = document.getElementById('location-status');

    if (locateBtn) {
        locateBtn.addEventListener('click', function () {
            locationStatus.textContent = 'جاري تحديد موقعك...';
            locationStatus.style.color = '#5a7066';

            if (!navigator.geolocation) {
                locationStatus.innerHTML = '<span style="color:#c62828">المتصفح لا يدعم GPS</span>';
                return;
            }

            navigator.geolocation.getCurrentPosition(function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;

                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                } else {
                    userMarker = L.marker([lat, lng], { icon: makeUserIcon() }).addTo(map);
                }
                userMarker.bindPopup('<div style="font-family:Cairo,sans-serif;font-weight:700;font-size:13px">📍 موقعك الحالي</div>').openPopup();
                map.setView([lat, lng], 12, { animate: true });
                locationStatus.innerHTML = '<span style="color:#1b5e42;font-weight:600"><i class="fas fa-circle-check" style="margin-left:4px"></i>تم تحديد موقعك بنجاح</span>';

                // Show nearby facilities (within ~50km)
                var nearby = allFacilities.filter(function (f) {
                    if (!f.lat || !f.lng) return false;
                    var d = Math.sqrt(Math.pow(f.lat - lat, 2) + Math.pow(f.lng - lng, 2));
                    return d < 0.5; // ~55km
                });

                if (nearby.length > 0) {
                    locationStatus.innerHTML += '<br><span style="color:#1b5e42;font-size:.8rem">' + nearby.length + ' مرفق قريب منك</span>';
                }
            }, function () {
                locationStatus.innerHTML = '<span style="color:#c62828"><i class="fas fa-circle-xmark" style="margin-left:4px"></i>فشل تحديد الموقع، حاول مجدداً</span>';
            });
        });
    }

    // ============================================================
    // HERO BUTTONS
    // ============================================================
    var citBtn = document.getElementById('citizen-btn');
    var natBtn = document.getElementById('national-btn');
    if (citBtn) citBtn.addEventListener('click', function () { window.location.href = 'auth.html'; });
    if (natBtn) natBtn.addEventListener('click', function () { window.location.href = 'auth.html'; });

    // ============================================================
    // MUNICIPALITY CARDS → zoom on map
    // ============================================================
    document.querySelectorAll('.muni-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var lat = parseFloat(this.getAttribute('data-lat'));
            var lng = parseFloat(this.getAttribute('data-lng'));
            map.setView([lat, lng], 12, { animate: true });
            document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ============================================================
    // SERVICE CARDS
    // ============================================================
    document.querySelectorAll('.service-card').forEach(function (card) {
        card.addEventListener('click', function () {
            window.location.href = 'appointments.html';
        });
    });

    // ============================================================
    // STATS ANIMATION
    // ============================================================
    var statNums = document.querySelectorAll('.stat-num');
    var animated = false;

    function animateStats() {
        if (animated) return;
        var statsSection = document.querySelector('.stats-section');
        if (!statsSection) return;
        var rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            animated = true;
            statNums.forEach(function (el) {
                var target = parseInt(el.getAttribute('data-target'));
                if (isNaN(target)) return;
                var duration = 1800;
                var start = null;
                function step(timestamp) {
                    if (!start) start = timestamp;
                    var progress = Math.min((timestamp - start) / duration, 1);
                    var eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.floor(eased * target);
                    if (progress < 1) requestAnimationFrame(step);
                    else el.textContent = target;
                }
                requestAnimationFrame(step);
            });
        }
    }

    window.addEventListener('scroll', animateStats);
    animateStats();

    // ============================================================
    // TOPNAV SHADOW ON SCROLL
    // ============================================================
    var topnav = document.querySelector('.topnav');
    if (topnav) {
        window.addEventListener('scroll', function () {
            topnav.style.boxShadow = window.scrollY > 80 ? '0 4px 20px rgba(0,0,0,0.2)' : 'none';
        });
    }

    // ============================================================
    // INJECT SEARCH PANEL INTO MAP SECTION
    // ============================================================
    var mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
        // Create search panel div if not already in HTML
        if (!document.getElementById('fac-search-panel')) {
            var searchDiv = document.createElement('div');
            searchDiv.id = 'fac-search-panel';
            searchDiv.style.cssText = 'margin-top:16px;padding-top:14px;border-top:1px solid #dde6e2';
            var heading = document.createElement('div');
            heading.style.cssText = 'font-family:Tajawal,sans-serif;font-size:.85rem;font-weight:800;color:#1a2a22;margin-bottom:10px;display:flex;align-items:center;gap:6px';
            heading.innerHTML = '<i class="fas fa-building" style="color:#1b5e42"></i> المرافق المسجلة';
            searchDiv.appendChild(heading);
            mapPanel.appendChild(heading);
            mapPanel.appendChild(searchDiv);
        }
    }

    // ============================================================
    // INIT — load facilities, build panel, render markers
    // ============================================================
    loadFacilities();
    buildSearchPanel();

    // Add custom popup CSS
    var style = document.createElement('style');
    style.textContent = [
        '.ordo-popup .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.18);padding:0;overflow:hidden;border:none}',
        '.ordo-popup .leaflet-popup-content{margin:0;width:auto !important}',
        '.ordo-popup .leaflet-popup-tip-container{margin-top:-1px}',
        '.ordo-popup .leaflet-popup-close-button{top:8px;left:8px;right:auto;color:rgba(255,255,255,0.7);font-size:16px;padding:0;width:20px;height:20px;line-height:20px;text-align:center;z-index:10}',
        '.ordo-popup .leaflet-popup-close-button:hover{color:#fff}',
        '.fac-result-item:hover{background:#f4f6f5 !important}',
        '#fac-results-list::-webkit-scrollbar{width:4px}',
        '#fac-results-list::-webkit-scrollbar-track{background:#f0f0f0}',
        '#fac-results-list::-webkit-scrollbar-thumb{background:#c8a84b;border-radius:4px}',
    ].join('\n');
    document.head.appendChild(style);

    // Listen for storage changes (if facility registers in another tab)
    window.addEventListener('storage', function (e) {
        if (e.key === 'ordo_facilities') {
            loadFacilities();
            buildSearchPanel();
        }
    });
});