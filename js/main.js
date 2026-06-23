(() => {
  const API_BASE = 'https://jed.or.id/wp-json/wp/v2';
  const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop';

  const CATEGORY_COLORS = {
    'default': '#c0392b',
    'interest': '#f39c12',
    'season': '#27ae60',
    'location': '#2980b9',
    'duration': '#8e44ad'
  };

  const LOCATION_ASSETS = {
    'Nyambu': 'asset/Nyambu.svg',
    'Pedawa': 'asset/Pedawa.svg',
    'Sibetan': 'asset/Dukuh,_Sibetan.svg',
    'Dukuh Sibetan': 'asset/Dukuh,_Sibetan.svg',
    'Pelaga': 'asset/Kiadan,_Pelaga.svg',
    'Kiadan Pelaga': 'asset/Kiadan,_Pelaga.svg',
    'Nusa Penida': 'asset/Nusa_Penida.svg',
    'Perancak': 'asset/Perancak.svg',
    'Tenganan': 'asset/Tenganan_Pegringsingan.svg',
    'Tenganan Pegringsingan': 'asset/Tenganan_Pegringsingan.svg',
    'Tamblingan': 'asset/Adat_Dalem_Tamblingan.svg',
    'Adat Dalem Tamblingan': 'asset/Adat_Dalem_Tamblingan.svg'
  };

  const TERM_ICONS = {
    'interest': 'fa-heart',
    'season': 'fa-cloud-sun',
    'location': 'fa-map-pin',
    'duration': 'fa-clock'
  };

  const BALI_BOUNDS = L.latLngBounds(
    L.latLng(-8.85, 114.4),
    L.latLng(-8.05, 115.75)
  );

  const KAB_COLORS = {
    'JEMBRANA': { fill: '#e8e4d8', border: '#c8c0a8' },
    'TABANAN': { fill: '#e4e0d4', border: '#c4bca4' },
    'BADUNG': { fill: '#f0ece0', border: '#d0c8b0' },
    'GIANYAR': { fill: '#e8e4d8', border: '#c8c0a8' },
    'KLUNGKUNG': { fill: '#ece8dc', border: '#ccc4ac' },
    'BULELENG': { fill: '#e4e0d4', border: '#c4bca4' },
    'KARANG ASEM': { fill: '#e0dcd0', border: '#c0b8a0' },
    'BANGLI': { fill: '#e8e4d8', border: '#c8c0a8' },
    'KOTA DENPASAR': { fill: '#f4f0e4', border: '#d4ccb4' }
  };

  let map;
  let tileLayer = null;
  let geoLayer = null;
  let maskLayer = null;
  let markers = [];
  let spots = [];
  let selectedMarkerEl = null;
  let geoData = null;
  let isLoading = false;

  let taxonomyData = {
    interest: [],
    season: [],
    location: [],
    duration: []
  };

  let activeFilters = {
    interest: 'all',
    season: 'all',
    location: 'all',
    duration: 'all'
  };

  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.querySelector('.loader-progress');
  const spotPanel = document.getElementById('spot-panel');

  async function init() {
    simulateLoading();
    initMap();
    await loadGeoJSON();
    addMountainMarkers();
    await loadAllData();
    setupEvents();
    revealUI();
    setTimeout(addWaterWaves, 500);
    map.on('moveend zoomend', function() { setTimeout(addWaterWaves, 100); });
  }

  function decodeEntities(str) {
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function getFeaturedImage(item) {
    if (item._embedded && item._embedded['wp:featuredmedia'] && item._embedded['wp:featuredmedia'][0]) {
      var media = item._embedded['wp:featuredmedia'][0];
      if (media.media_details && media.media_details.sizes) {
        var sizes = media.media_details.sizes;
        if (sizes.medium) return sizes.medium.source_url;
        if (sizes.full) return sizes.full.source_url;
      }
      if (media.source_url) return media.source_url;
    }
    return PLACEHOLDER_IMG;
  }

  function getTermNames(item, taxonomy) {
    if (item._embedded && item._embedded['wp:term']) {
      var terms = item._embedded['wp:term'];
      for (var i = 0; i < terms.length; i++) {
        if (terms[i] && terms.length > 0 && terms[i][0] && terms[i][0].taxonomy === taxonomy) {
          return terms[i].map(function(t) { return { id: t.id, name: decodeEntities(t.name) }; });
        }
      }
    }
    return [];
  }

  function getTermIds(item, taxonomy) {
    return item[taxonomy] || [];
  }

  async function fetchAllPages(url) {
    var allData = [];
    var page = 1;
    var perPage = 100;
    var cacheBuster = '&_=' + Date.now();
    while (true) {
      var separator = url.includes('?') ? '&' : '?';
      var pageUrl = url + separator + 'per_page=' + perPage + '&page=' + page + '&_embed' + cacheBuster;
      var resp = await fetch(pageUrl, { cache: 'no-store' });
      if (!resp.ok) break;
      var data = await resp.json();
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      var totalPages = parseInt(resp.headers.get('X-WP-TotalPages') || '1');
      if (page >= totalPages) break;
      page++;
    }
    return allData;
  }

  async function loadTaxonomyTerms() {
    try {
      var taxonomies = ['interest', 'season', 'location', 'duration'];
      var results = await Promise.all(
        taxonomies.map(function(t) { return fetchAllPages(API_BASE + '/' + t); })
      );
      taxonomies.forEach(function(t, i) {
        taxonomyData[t] = results[i].map(function(item) {
          return { id: item.id, name: decodeEntities(item.name), slug: item.slug };
        });
      });
    } catch (e) {
      console.warn('Gagal load taxonomy terms:', e);
    }
  }

  function buildFilterUI() {
    var termsContainer = document.getElementById('filter-terms');
    var activeTaxonomy = document.querySelector('.filter-tab.active');
    var taxonomy = activeTaxonomy ? activeTaxonomy.dataset.taxonomy : 'interest';
    var terms = taxonomyData[taxonomy] || [];

    var html = '<button class="filter-term' + (activeFilters[taxonomy] === 'all' ? ' active' : '') + '" data-taxonomy="' + taxonomy + '" data-id="all">Semua</button>';
    terms.forEach(function(term) {
      var isActive = activeFilters[taxonomy] == term.id ? ' active' : '';
      html += '<button class="filter-term' + isActive + '" data-taxonomy="' + taxonomy + '" data-id="' + term.id + '">' + term.name + '</button>';
    });
    termsContainer.innerHTML = html;

    termsContainer.querySelectorAll('.filter-term').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tax = this.dataset.taxonomy;
        var id = this.dataset.id;
        activeFilters[tax] = id;
        termsContainer.querySelectorAll('.filter-term').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        gsap.fromTo(this, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
        applyFilters();
      });
    });
  }

  function applyFilters() {
    var hasActiveFilter = Object.values(activeFilters).some(function(v) { return v !== 'all'; });

    if (hasActiveFilter) {
      hideDecorations();
    } else {
      showDecorations();
    }

    var visibleCount = 0;
    markers.forEach(function(m) {
      var show = true;
      for (var tax in activeFilters) {
        if (activeFilters[tax] === 'all') continue;
        var termIds = getTermIds(m.spot.rawItem, tax);
        if (termIds.indexOf(parseInt(activeFilters[tax])) === -1) {
          show = false;
          break;
        }
      }
      if (show) {
        m.layer.addTo(map);
        visibleCount++;
      } else {
        if (map.hasLayer(m.layer)) map.removeLayer(m.layer);
      }
    });
    updateSpotCount(visibleCount);
  }

  async function loadAllData() {
    showLoadingState(true);
    try {
      await loadTaxonomyTerms();
      var data = await fetchAllPages(API_BASE + '/explore');
      spots = data.map(function(item) {
        var coords = (item.meta.explore_map || '').split(',').map(function(s) { return parseFloat(s.trim()); });
        var lat = coords[0] || -8.4095;
        var lng = coords[1] || 115.1889;
        var interestNames = getTermNames(item, 'interest');
        var locationNames = getTermNames(item, 'location');
        var primaryInterest = interestNames.length > 0 ? interestNames[0].name : '';

        return {
          id: item.id,
          name: stripHtml(item.title.rendered),
          description: stripHtml(item.content.rendered),
          lat: lat,
          lng: lng,
          category: primaryInterest,
          price: item.meta.price || '',
          location: locationNames.map(function(l) { return l.name; }).join(', '),
          interest: interestNames.map(function(i) { return i.name; }).join(', '),
          link: item.link,
          image: getFeaturedImage(item),
          rating: 4.5,
          rawItem: item
        };
      });
      createMarkers(spots);
      buildFilterUI();
      updateSpotCount(spots.length);
    } catch (e) {
      console.error('Gagal load data:', e);
      showErrorState();
    }
    showLoadingState(false);
  }

  function showLoadingState(show) {
    isLoading = show;
    var btn = document.getElementById('btn-refresh');
    if (btn) {
      if (show) {
        btn.classList.add('spinning');
        btn.disabled = true;
      } else {
        btn.classList.remove('spinning');
        btn.disabled = false;
      }
    }
  }

  function showErrorState() {
    var countEl = document.getElementById('spot-count');
    if (countEl) countEl.textContent = 'Gagal memuat data';
  }

  function updateSpotCount(count) {
    var countEl = document.getElementById('spot-count');
    if (countEl) {
      countEl.textContent = count + ' location';
    }
  }

  function simulateLoading() {
    var progress = 0;
    var interval = setInterval(function() {
      progress += Math.random() * 12;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(function() {
          gsap.to(loadingScreen, {
            opacity: 0, duration: 0.8, ease: 'power2.inOut',
            onComplete: function() { loadingScreen.style.visibility = 'hidden'; loadingScreen.style.pointerEvents = 'none'; }
          });
        }, 300);
      }
      progressBar.style.width = progress + '%';
    }, 100);
  }

  function initMap() {
    map = L.map('map', {
      center: [-8.4095, 115.1889],
      zoom: 10,
      minZoom: 9,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      maxBounds: BALI_BOUNDS.pad(0.3),
      maxBoundsViscosity: 1.0,
      zoomAnimation: true,
      fadeAnimation: false
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      opacity: 0.35,
      attribution: '© Esri'
    }).addTo(map);
    map.fitBounds(BALI_BOUNDS, { padding: [30, 30] });
  }

  async function loadGeoJSON() {
    var resp = await fetch('data/bali.geojson');
    geoData = await resp.json();
    createMask(geoData);
    geoLayer = L.geoJSON(geoData, {
      style: function(feature) {
        var name = feature.properties.name || '';
        var c = KAB_COLORS[name] || { fill: '#e8e4d8', border: '#c8c0a8' };
        return { fillColor: c.fill, weight: 1.5, opacity: 0.8, color: c.border, fillOpacity: 0.6 };
      },
      onEachFeature: function(feature, layer) {
        var name = feature.properties.name || feature.properties.alt_name || '';
        layer.bindTooltip(name, { sticky: true, className: 'kab-tooltip-elegant' });
        layer.on('mouseover', function() {
          gsap.to(this._path, { attr: { 'stroke-width': 3 }, duration: 0.2 });
          this.bringToFront();
        });
        layer.on('mouseout', function() {
          gsap.to(this._path, { attr: { 'stroke-width': 1.5 }, duration: 0.2 });
        });
      }
    }).addTo(map);
  }

  function createMask(geoData) {
    var worldBounds = [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]];
    var allRings = [];
    geoData.features.forEach(function(feature) {
      var geom = feature.geometry;
      var coords = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
      coords.forEach(function(polygon) {
        polygon.forEach(function(ring) { allRings.push(ring.map(function(c) { return [c[1], c[0]]; })); });
      });
    });
    maskLayer = L.polygon([worldBounds].concat(allRings), {
      color: '#d8e4ee', weight: 0, fillColor: '#e8eef4', fillOpacity: 1, interactive: false
    }).addTo(map);
  }

  function addWaterWaves() {
    if (!geoData) return;
    var container = document.getElementById('water-waves');
    var rings = [];
    geoData.features.forEach(function(feature) {
      var geom = feature.geometry;
      var coords = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
      coords.forEach(function(polygon) {
        rings.push(polygon[0].map(function(c) { return [c[1], c[0]]; }));
      });
    });
    if (!rings.length) return;

    var longest = rings.reduce(function(a, b) { return a.length > b.length ? a : b; });
    var simplified = [];
    var step = Math.max(1, Math.floor(longest.length / 120));
    for (var i = 0; i < longest.length; i += step) simplified.push(longest[i]);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

    function project(lat, lng) {
      var pt = map.latLngToContainerPoint(L.latLng(lat, lng));
      var size = map.getSize();
      return [(pt.x / size.x) * 100, (pt.y / size.y) * 100];
    }

    var colors = [
      'rgba(90,140,180,0.18)',
      'rgba(90,140,180,0.12)',
      'rgba(90,140,180,0.08)'
    ];

    for (var w = 0; w < 3; w++) {
      var pathEl = document.createElementNS(svgNS, 'path');
      var d = '';
      var offset = (w + 1) * 3;
      for (var i = 0; i < simplified.length; i++) {
        var pt = project(simplified[i][0], simplified[i][1]);
        var nx = i < simplified.length - 1 ? project(simplified[i + 1][0], simplified[i + 1][1]) : pt;
        var dx = nx[0] - pt[0];
        var dy = nx[1] - pt[1];
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ox = (-dy / len) * offset;
        var oy = (dx / len) * offset;
        var x = pt[0] + ox;
        var y = pt[1] + oy;
        d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
      }
      d += 'Z';
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', colors[w]);
      pathEl.setAttribute('stroke-width', '0.15');
      pathEl.setAttribute('stroke-dasharray', '0.8 0.4');
      var animEl = document.createElementNS(svgNS, 'animate');
      animEl.setAttribute('attributeName', 'stroke-dashoffset');
      animEl.setAttribute('from', '0');
      animEl.setAttribute('to', '2.4');
      animEl.setAttribute('dur', (4 + w * 2) + 's');
      animEl.setAttribute('repeatCount', 'indefinite');
      pathEl.appendChild(animEl);
      svg.appendChild(pathEl);
    }

    container.innerHTML = '';
    container.appendChild(svg);
  }

  function createMarkerIcon(location, name) {
    var assetPath = null;
    if (location) {
      var locations = location.split(',').map(function(l) { return l.trim(); });
      for (var i = 0; i < locations.length; i++) {
        if (LOCATION_ASSETS[locations[i]]) {
          assetPath = LOCATION_ASSETS[locations[i]];
          break;
        }
      }
    }
    
    var label = '';
    if (name) {
      var shortName = name.length > 20 ? name.substring(0, 18) + '...' : name;
      label = '<div class="marker-label" data-short="' + shortName.replace(/"/g, '&quot;') + '" data-full="' + name.replace(/"/g, '&quot;') + '">' + shortName + '</div>';
    }
    
    if (assetPath) {
      return L.divIcon({
        className: 'custom-marker marker-asset',
        html: label + '<img src="' + assetPath + '" class="marker-asset-img" alt="marker">',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });
    }
    
    var color = CATEGORY_COLORS['default'];
    return L.divIcon({
      className: 'custom-marker',
      html: label + '<div class="marker-wrapper">' +
        '<div class="marker-dot" style="background:' + color + '"></div>' +
        '<div class="marker-line"></div>' +
        '<div class="marker-shadow"></div>' +
        '</div>',
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -40]
    });
  }

  function addMountainMarkers() {
    var defs = '<defs>' +
      '<linearGradient id="mtn-grad-agung" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#c9a96e" stop-opacity="0.45"/>' +
        '<stop offset="50%" stop-color="#b8944e" stop-opacity="0.25"/>' +
        '<stop offset="100%" stop-color="#8a6a30" stop-opacity="0.15"/>' +
      '</linearGradient>' +
      '<linearGradient id="mtn-grad-batur" x1="0" y1="0" x2="0.8" y2="1">' +
        '<stop offset="0%" stop-color="#c9a96e" stop-opacity="0.4"/>' +
        '<stop offset="60%" stop-color="#b8944e" stop-opacity="0.2"/>' +
        '<stop offset="100%" stop-color="#8a6a30" stop-opacity="0.12"/>' +
      '</linearGradient>' +
      '<linearGradient id="mtn-grad-generic" x1="0.2" y1="0" x2="0.8" y2="1">' +
        '<stop offset="0%" stop-color="#c9a96e" stop-opacity="0.38"/>' +
        '<stop offset="100%" stop-color="#8a6a30" stop-opacity="0.12"/>' +
      '</linearGradient>' +
      '<filter id="mtn-shadow" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#8a6a30" flood-opacity="0.15"/>' +
      '</filter>' +
      '<filter id="mtn-glow" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>' +
      '</defs>';

    var mountains = [
      {
        name: 'Gunung Agung',
        lat: -8.3427, lng: 115.5081,
        size: [90, 80],
        svg: '<svg viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg">' + defs +
          '<path d="M50 5 Q53 14 58 24 Q64 36 70 46 Q76 54 84 60 L90 64 L10 64 L16 60 Q24 54 30 46 Q36 36 42 24 Q47 14 50 5Z" ' +
          'fill="url(#mtn-grad-agung)" stroke="#b8944e" stroke-width="1.2" filter="url(#mtn-shadow)"/>' +
          '<path d="M50 5 Q52 12 55 20 Q60 32 66 42 Q72 50 78 56" stroke="#dfc89a" stroke-width="0.6" fill="none" opacity="0.35"/>' +
          '<path d="M50 5 Q48 12 45 20 Q40 32 34 42 Q28 50 22 56" stroke="#8a6a30" stroke-width="0.5" fill="none" opacity="0.2"/>' +
          '<path d="M38 26 Q44 24 50 25 Q56 26 62 25 Q68 24 74 26" stroke="#c9a96e" stroke-width="0.4" fill="none" opacity="0.22"/>' +
          '<path d="M44 18 Q48 16 52 18" stroke="#dfc89a" stroke-width="0.35" fill="none" opacity="0.25"/>' +
          '<path d="M50 5 L51 2" stroke="#dfc89a" stroke-width="0.5" fill="none" opacity="0.3" filter="url(#mtn-glow)"/>' +
          '<path d="M40 34 Q46 32 52 33" stroke="#c9a96e" stroke-width="0.3" fill="none" opacity="0.15"/>' +
          '<path d="M48 33 Q54 32 60 34" stroke="#c9a96e" stroke-width="0.3" fill="none" opacity="0.12"/>' +
          '<path d="M20 58 Q32 56 44 58" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '<path d="M56 57 Q68 56 80 59" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '</svg>'
      },
      {
        name: 'Gunung Batur',
        lat: -8.2407, lng: 115.3773,
        size: [80, 65],
        svg: '<svg viewBox="0 0 100 75" xmlns="http://www.w3.org/2000/svg">' + defs +
          '<path d="M50 12 Q54 20 60 30 Q66 40 74 48 Q80 54 88 58 L92 62 L8 62 L12 58 Q20 54 26 48 Q34 40 40 30 Q46 20 50 12Z" ' +
          'fill="url(#mtn-grad-batur)" stroke="#b8944e" stroke-width="1.1" filter="url(#mtn-shadow)"/>' +
          '<path d="M50 12 Q52 18 56 26 Q62 36 68 44 Q74 50 80 54" stroke="#dfc89a" stroke-width="0.5" fill="none" opacity="0.3"/>' +
          '<path d="M50 12 Q48 18 44 26 Q38 36 32 44 Q26 50 20 54" stroke="#8a6a30" stroke-width="0.45" fill="none" opacity="0.18"/>' +
          '<path d="M42 22 Q48 20 54 22 Q60 24 66 22" stroke="#c9a96e" stroke-width="0.45" fill="none" opacity="0.22"/>' +
          '<ellipse cx="50" cy="20" rx="6" ry="3" stroke="#c9a96e" stroke-width="0.4" fill="none" opacity="0.2"/>' +
          '<path d="M36 32 Q44 29 52 31 Q60 33 68 30 Q74 29 82 32" stroke="#c9a96e" stroke-width="0.35" fill="none" opacity="0.16"/>' +
          '<path d="M22 50 Q34 48 46 50" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '<path d="M54 49 Q66 48 78 51" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '</svg>'
      },
      {
        name: 'Gunung Batukaru',
        lat: -8.3100, lng: 115.1267,
        size: [76, 68],
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">' + defs +
          '<path d="M50 8 Q54 18 58 28 Q64 38 70 48 Q76 56 84 60 L90 64 L10 64 L16 60 Q24 56 30 48 Q36 38 42 28 Q46 18 50 8Z" ' +
          'fill="url(#mtn-grad-generic)" stroke="#b8944e" stroke-width="1.2" filter="url(#mtn-shadow)"/>' +
          '<path d="M50 8 Q52 16 56 24 Q60 32 64 40 Q68 46 72 50" stroke="#dfc89a" stroke-width="0.55" fill="none" opacity="0.32"/>' +
          '<path d="M50 8 Q48 16 44 24 Q40 32 36 40 Q32 46 28 50" stroke="#8a6a30" stroke-width="0.45" fill="none" opacity="0.18"/>' +
          '<path d="M40 22 Q46 20 50 21 Q54 20 60 22" stroke="#dfc89a" stroke-width="0.4" fill="none" opacity="0.22"/>' +
          '<path d="M34 32 Q42 29 50 31 Q58 33 66 30 Q72 29 80 32" stroke="#c9a96e" stroke-width="0.35" fill="none" opacity="0.16"/>' +
          '<path d="M46 14 Q50 12 54 14" stroke="#dfc89a" stroke-width="0.4" fill="none" opacity="0.22"/>' +
          '<path d="M50 8 Q50.5 5 51 3" stroke="#dfc89a" stroke-width="0.4" fill="none" opacity="0.25" filter="url(#mtn-glow)"/>' +
          '<path d="M20 56 Q32 54 44 56" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '<path d="M56 55 Q68 54 80 57" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '</svg>'
      },
      {
        name: 'Gunung Abang',
        lat: -8.3500, lng: 115.4700,
        size: [66, 56],
        svg: '<svg viewBox="0 0 90 70" xmlns="http://www.w3.org/2000/svg">' + defs +
          '<path d="M45 10 Q48 18 52 28 Q56 38 62 46 Q68 52 76 56 L82 60 L8 60 L14 56 Q22 52 28 46 Q34 38 38 28 Q42 18 45 10Z" ' +
          'fill="url(#mtn-grad-generic)" stroke="#b8944e" stroke-width="1" filter="url(#mtn-shadow)"/>' +
          '<path d="M45 10 Q47 16 50 24 Q54 34 58 42 Q62 48 66 52" stroke="#dfc89a" stroke-width="0.5" fill="none" opacity="0.28"/>' +
          '<path d="M45 10 Q43 16 40 24 Q36 34 32 42 Q28 48 24 52" stroke="#8a6a30" stroke-width="0.4" fill="none" opacity="0.16"/>' +
          '<path d="M36 26 Q42 24 48 25 Q54 26 60 25 Q66 24 72 26" stroke="#c9a96e" stroke-width="0.35" fill="none" opacity="0.18"/>' +
          '<path d="M42 18 Q45 16 48 18" stroke="#dfc89a" stroke-width="0.35" fill="none" opacity="0.2"/>' +
          '<path d="M18 52 Q30 50 42 52" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '<path d="M48 51 Q60 50 72 53" stroke="#8a6a30" stroke-width="0.25" fill="none" opacity="0.1"/>' +
          '</svg>'
      },
      {
        name: 'Gunung Merbuk',
        lat: -8.1500, lng: 115.0500,
        size: [62, 52],
        svg: '<svg viewBox="0 0 85 65" xmlns="http://www.w3.org/2000/svg">' + defs +
          '<path d="M42 12 Q46 20 50 30 Q54 38 60 44 Q66 50 72 54 L78 58 L8 58 L14 54 Q20 50 26 44 Q32 38 36 30 Q40 20 42 12Z" ' +
          'fill="url(#mtn-grad-generic)" stroke="#b8944e" stroke-width="0.9" filter="url(#mtn-shadow)"/>' +
          '<path d="M42 12 Q44 18 47 26 Q50 34 54 40 Q58 46 62 50" stroke="#dfc89a" stroke-width="0.45" fill="none" opacity="0.26"/>' +
          '<path d="M42 12 Q40 18 37 26 Q34 34 30 40 Q26 46 22 50" stroke="#8a6a30" stroke-width="0.4" fill="none" opacity="0.15"/>' +
          '<path d="M34 24 Q38 22 42 23 Q46 24 50 23 Q54 22 58 24" stroke="#c9a96e" stroke-width="0.35" fill="none" opacity="0.18"/>' +
          '<path d="M40 18 Q42 16 44 18" stroke="#dfc89a" stroke-width="0.35" fill="none" opacity="0.2"/>' +
          '<path d="M14 50 Q26 48 38 50" stroke="#8a6a30" stroke-width="0.2" fill="none" opacity="0.08"/>' +
          '<path d="M46 49 Q58 48 70 51" stroke="#8a6a30" stroke-width="0.2" fill="none" opacity="0.08"/>' +
          '</svg>'
      }
    ];

    mountains.forEach(function(mt) {
      var icon = L.divIcon({
        className: 'mountain-icon',
        html: '<div class="mountain-label">' + mt.name.replace('Gunung ', '') + '</div>' + mt.svg,
        iconSize: mt.size,
        iconAnchor: [mt.size[0] / 2, mt.size[1]],
        interactive: false
      });
      L.marker([mt.lat, mt.lng], { icon: icon, interactive: false }).addTo(map);
    });
  }

  function createMarkers(spotsData) {
    markers.forEach(function(m) { map.removeLayer(m.layer); });
    markers = [];
    spotsData.forEach(function(spot) {
      var markerIcon = createMarkerIcon(spot.location, spot.name);
      var layer = L.marker([spot.lat, spot.lng], { icon: markerIcon }).addTo(map);
      layer.on('click', function() { animateToMarker(spot, layer); });
      markers.push({ layer: layer, spot: spot });
    });
  }

  function hideDecorations() {
    gsap.to('.deco-floral', { opacity: 0, duration: 0.4, ease: 'power2.in' });
    gsap.to('.deco-vine', { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to('.deco-divider', { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to('.deco-text', { opacity: 0, duration: 0.3, ease: 'power2.in' });
  }

  function showDecorations() {
    gsap.to('.deco-floral', { opacity: 0.7, duration: 0.6, ease: 'power2.out', stagger: 0.08 });
    gsap.to('.deco-vine', { opacity: 0.6, duration: 0.5, ease: 'power2.out', stagger: 0.05 });
    gsap.to('.deco-divider', { opacity: 0.5, duration: 0.5, ease: 'power2.out' });
    gsap.to('.deco-text', { opacity: 0.6, duration: 0.5, ease: 'power2.out' });
  }

  function animateToMarker(spot, layer) {
    hideDecorations();
    if (selectedMarkerEl) {
      var prev = markers.find(function(m) { return m.layer.getElement() === selectedMarkerEl; });
      if (prev) prev.layer.setIcon(createMarkerIcon(prev.spot.location, prev.spot.name));
    }
    selectedMarkerEl = layer.getElement();
    layer.setIcon(createMarkerIcon(spot.location, spot.name));

    var el = layer.getElement();
    if (el) {
      var dot = el.querySelector('.marker-dot');
      if (dot) {
        gsap.fromTo(dot, { scale: 0.5 }, { scale: 1.3, duration: 0.3, ease: 'back.out(3)',
          onComplete: function() { gsap.to(dot, { scale: 1, duration: 0.2 }); }
        });
      }
    }
    openPanel(spot);
  }

  function openPanel(spot) {
    document.getElementById('panel-img').src = spot.image;
    document.getElementById('panel-title').textContent = spot.name;
    document.getElementById('panel-desc').textContent = spot.description;
    document.getElementById('panel-rating').textContent = '0';
    document.getElementById('panel-coords').textContent = spot.lat.toFixed(4) + 'S, ' + spot.lng.toFixed(4) + 'E';
    document.getElementById('panel-category').textContent = spot.interest || spot.category;
    if (spot.location) {
      document.getElementById('panel-category').textContent = (spot.interest || spot.category) + ' \u2014 ' + spot.location;
    }

    var priceWrap = document.getElementById('panel-price-wrap');
    var priceEl = document.getElementById('panel-price');
    if (spot.price) {
      priceEl.textContent = '$' + spot.price;
      priceWrap.style.display = 'block';
    } else {
      priceWrap.style.display = 'none';
    }

    var exploreBtn = document.getElementById('btn-explore');
    if (spot.link) {
      exploreBtn.href = spot.link;
    }

    spotPanel.classList.remove('hidden');

    var tl = gsap.timeline();
    tl.fromTo(spotPanel, { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.5, ease: 'power3.out' });
    tl.fromTo('.panel-image img', { scale: 1.15 }, { scale: 1, duration: 0.6, ease: 'power2.out' }, '-=0.2');
    tl.fromTo('.panel-area', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.2');
    tl.fromTo('#panel-title', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, '-=0.15');
    tl.fromTo('#panel-desc', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.1');
    tl.fromTo('.btn-explore', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.1');

    var obj = { val: 0 };
    gsap.to(obj, { val: spot.rating, duration: 0.8, delay: 0.2, ease: 'power2.out',
      onUpdate: function() { document.getElementById('panel-rating').textContent = obj.val.toFixed(1); }
    });
  }

  function closePanel() {
    gsap.to(spotPanel, { clipPath: 'inset(0 0 0 100%)', opacity: 0, duration: 0.4, ease: 'power3.in',
      onComplete: function() { spotPanel.classList.add('hidden'); gsap.set(spotPanel, { clearProps: 'all' }); showDecorations(); }
    });
    if (selectedMarkerEl) {
      var prev = markers.find(function(m) { return m.layer.getElement() === selectedMarkerEl; });
      if (prev) prev.layer.setIcon(createMarkerIcon(prev.spot.location, prev.spot.name));
      selectedMarkerEl = null;
    }
  }

  function resetAllFilters() {
    for (var tax in activeFilters) {
      activeFilters[tax] = 'all';
    }
    document.querySelectorAll('.filter-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelector('.filter-tab[data-taxonomy="interest"]').classList.add('active');
    buildFilterUI();
    applyFilters();
  }

  function setupEvents() {
    document.getElementById('map').addEventListener('mouseenter', function(e) {
      if (e.target.classList && e.target.classList.contains('marker-label')) {
        e.target.textContent = e.target.getAttribute('data-full');
      }
    }, true);

    document.getElementById('map').addEventListener('mouseleave', function(e) {
      if (e.target.classList && e.target.classList.contains('marker-label')) {
        e.target.textContent = e.target.getAttribute('data-short');
      }
    }, true);

    document.querySelectorAll('.filter-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.filter-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        buildFilterUI();
      });
    });

    document.getElementById('btn-filter-reset').addEventListener('click', function() {
      resetAllFilters();
    });

    document.getElementById('close-panel').addEventListener('click', closePanel);

    document.getElementById('btn-reset').addEventListener('click', function() {
      closePanel();
      showDecorations();
      resetAllFilters();
      map.panTo([-8.4095, 115.1889], { animate: true, duration: 1 });
    });

    document.getElementById('btn-refresh').addEventListener('click', function() {
      if (isLoading) return;
      resetAllFilters();
      loadAllData();
    });

    document.getElementById('btn-explore').addEventListener('click', function() {
      var title = document.getElementById('panel-title').textContent;
      var found = markers.find(function(m) { return m.spot.name === title; });
      if (found) {
        if (selectedMarkerEl) {
          var prev = markers.find(function(m) { return m.layer.getElement() === selectedMarkerEl; });
          if (prev) prev.layer.setIcon(createMarkerIcon(prev.spot.location, prev.spot.name));
        }
        selectedMarkerEl = found.layer.getElement();
        found.layer.setIcon(createMarkerIcon(found.spot.location, found.spot.name));
        map.panTo([found.spot.lat, found.spot.lng], { animate: true, duration: 0.8 });
      }
    });
  }

  function revealUI() {
    var tl = gsap.timeline({ delay: 2 });
    tl.fromTo('#main-header', { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    tl.fromTo('.logo', { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.3');
    tl.fromTo('.controls button', { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.08 }, '-=0.2');

    gsap.fromTo('#filter-bar', { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 2.2 });
    gsap.fromTo('.filter-tab', { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.04, delay: 2.4 });

    gsap.fromTo('.deco-floral', { opacity: 0, scale: 0.8 },
      { opacity: 0.7, scale: 1, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.1, delay: 2.8 });
    gsap.fromTo('.deco-vine', { opacity: 0, scaleY: 0.5 },
      { opacity: 0.6, scaleY: 1, duration: 0.7, ease: 'power2.out', stagger: 0.1, delay: 3 });
    gsap.fromTo('.deco-divider', { opacity: 0, scaleX: 0 },
      { opacity: 0.5, scaleX: 1, duration: 0.6, ease: 'power2.out', delay: 3.1 });
    gsap.fromTo('.deco-text', { y: 10, opacity: 0 },
      { y: 0, opacity: 0.6, duration: 0.6, ease: 'power2.out', stagger: 0.2, delay: 3.2 });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
