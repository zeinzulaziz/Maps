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

  const CACHE_KEYS = {
    spots: 'jed_spots_cache',
    taxonomy: 'jed_taxonomy_cache'
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
  let userMarker = null;
  let geoData = null;
  let isLoading = false;
  let currentSlide = 0;
  let totalSlides = 0;
  let autoSlideTimer = null;
  let autoSlideDelay = 3500;

  function startAutoSlide() {
    stopAutoSlide();
    if (totalSlides <= 1) return;
    autoSlideTimer = setInterval(function() {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlider();
    }, autoSlideDelay);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  let taxonomyData = {
    interest: [],
    season: [],
    location: [],
    duration: []
  };

  let activeFilters = {
    interest: [],
    season: [],
    location: [],
    duration: []
  };

  let showFavoritesOnly = false;

  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.querySelector('.loader-progress');
  const spotPanel = document.getElementById('spot-panel');

  async function init() {
    simulateLoading();
    initMap();
    initLazyLoad();
    await loadGeoJSON();
    addMountainMarkers();
    await loadAllData();
    setupSearch();
    setupLegend();
    setupEvents();
    setupKeyboardNav();
    revealUI();
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

  function getGalleryImage(item) {
    if (item.meta && item.meta.gallery_explore) {
      var gallery = item.meta.gallery_explore;
      if (Array.isArray(gallery) && gallery.length > 0) {
        return gallery;
      }
      if (typeof gallery === 'string' && gallery.length > 0) {
        return [gallery];
      }
    }
    return [getFeaturedImage(item)];
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
      saveToCache(CACHE_KEYS.taxonomy, taxonomyData);
    } catch (e) {
      console.warn('Gagal load taxonomy dari API, coba cache:', e);
      var cached = loadFromCache(CACHE_KEYS.taxonomy);
      if (cached) {
        taxonomyData = cached;
        showOfflineBanner();
      }
    }
  }

  function buildFilterUI() {
    var taxonomies = ['interest', 'season', 'location', 'duration'];
    taxonomies.forEach(function(taxonomy) {
      var dropdown = document.querySelector('.filter-dropdown[data-taxonomy="' + taxonomy + '"]');
      if (!dropdown) return;
      var optionsContainer = dropdown.querySelector('.filter-options');
      var terms = taxonomyData[taxonomy] || [];

      optionsContainer.innerHTML = '';
      if (terms.length === 0) {
        optionsContainer.innerHTML = '<div class="filter-option" style="opacity:0.5;cursor:default;">No options</div>';
        return;
      }

      terms.forEach(function(term) {
        var opt = document.createElement('div');
        opt.className = 'filter-option';
        opt.dataset.id = term.id;
        opt.innerHTML = '<span class="filter-check"><i class="fas fa-check"></i></span>' + term.name;

        opt.addEventListener('click', function(e) {
          e.stopPropagation();
          this.classList.toggle('selected');
          updateActiveFilters(taxonomy, dropdown);
          applyFilters();
        });

        optionsContainer.appendChild(opt);
      });

      var trigger = dropdown.querySelector('.filter-trigger');
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        var wasOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.filter-dropdown.open').forEach(function(d) {
          d.classList.remove('open');
          d.querySelector('.filter-trigger').setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          dropdown.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('.filter-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
        d.querySelector('.filter-trigger').setAttribute('aria-expanded', 'false');
      });
    });
  }

  function updateActiveFilters(taxonomy, dropdown) {
    var selected = [];
    dropdown.querySelectorAll('.filter-option.selected').forEach(function(opt) {
      selected.push(opt.dataset.id);
    });
    activeFilters[taxonomy] = selected;

    var countEl = dropdown.querySelector('.filter-count');
    if (selected.length > 0) {
      countEl.textContent = selected.length;
      countEl.classList.add('visible');
    } else {
      countEl.classList.remove('visible');
    }
  }

  function applyFilters() {
    var hasActiveFilter = Object.values(activeFilters).some(function(v) { return v.length > 0; }) || showFavoritesOnly;

    if (hasActiveFilter) {
      hideDecorations();
    } else {
      showDecorations();
    }

    var visibleCount = 0;
    markers.forEach(function(m) {
      var show = true;

      if (showFavoritesOnly && !isBookmarked(m.spot.id)) {
        show = false;
      }

      if (show) {
        for (var tax in activeFilters) {
          if (activeFilters[tax].length === 0) continue;
          var termIds = getTermIds(m.spot.rawItem, tax);
          var matched = activeFilters[tax].some(function(id) {
            return termIds.indexOf(parseInt(id)) !== -1;
          });
          if (!matched) {
            show = false;
            break;
          }
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
        var durationNames = getTermNames(item, 'duration');
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
          duration: durationNames.map(function(d) { return d.name; }).join(', '),
          link: item.link,
          images: getGalleryImage(item),
          rating: 4.5,
          rawItem: item
        };
      });
      saveToCache(CACHE_KEYS.spots, spots);
      hideOfflineBanner();
      createMarkers(spots);
      buildFilterUI();
      updateSpotCount(spots.length);
    } catch (e) {
      console.error('Gagal load dari API, coba cache:', e);
      var cached = loadFromCache(CACHE_KEYS.spots);
      if (cached && cached.length > 0) {
        spots = cached;
        showOfflineBanner();
        createMarkers(spots);
        buildFilterUI();
        updateSpotCount(spots.length);
      } else {
        showErrorState();
      }
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
    if (countEl) countEl.textContent = 'Failed to load data';
  }

  function saveToCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Gagal simpan ke cache:', e);
    }
  }

  function loadFromCache(key) {
    try {
      var data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Gagal load dari cache:', e);
      return null;
    }
  }

  function showOfflineBanner() {
    var banner = document.getElementById('offline-banner');
    if (banner) banner.classList.add('show');
  }

  function hideOfflineBanner() {
    var banner = document.getElementById('offline-banner');
    if (banner) banner.classList.remove('show');
  }

  var BOOKMARK_KEY = 'jed_bookmarks';

  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function toggleBookmark(spotId) {
    var bookmarks = getBookmarks();
    var idx = bookmarks.indexOf(spotId);
    if (idx === -1) {
      bookmarks.push(spotId);
    } else {
      bookmarks.splice(idx, 1);
    }
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    updateBookmarkUI(spotId);
  }

  function isBookmarked(spotId) {
    return getBookmarks().indexOf(spotId) !== -1;
  }

  function updateBookmarkUI(spotId) {
    var btn = document.getElementById('btn-bookmark');
    if (!btn) return;
    if (isBookmarked(spotId)) {
      btn.classList.add('bookmarked');
      btn.innerHTML = '<i class="fas fa-heart" aria-hidden="true"></i>';
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('bookmarked');
      btn.innerHTML = '<i class="far fa-heart" aria-hidden="true"></i>';
      btn.setAttribute('aria-pressed', 'false');
    }
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
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
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
      color: '#f5f3ef', weight: 0, fillColor: '#f5f3ef', fillOpacity: 1, interactive: false
    }).addTo(map);
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
    var C = '#8a7a68';
    var Cl = '#a09080';

    var mtnPaths = [
      'M428.97 227.25C414.1 215.37 399.53 203.72 385 192.01C382.09 189.67 378.75 188.22 375.4 186.74C364.73 182.04 353.96 177.55 343.42 172.57C335.76 168.95 330.62 162.03 324.3 156.65C315.17 148.89 306.39 140.69 297.52 132.62C295.56 130.84 294.05 130.28 291.51 132.08C281.32 139.31 271.1 146.52 260.55 153.2C250.45 159.59 243.55 169.07 235.62 177.55C228.11 185.57 220.89 193.88 213.62 202.12C211.89 204.09 209.72 205.17 207.38 206.1C194.37 211.24 181.4 216.49 168.33 221.48C164.1 223.1 161.11 226.22 157.91 229.07C145.48 240.16 133.19 251.41 120.85 262.6C120.23 263.16 119.62 263.73 118.95 264.22C117.5 265.27 115.98 266.93 114.18 265.06C112.34 263.16 113.35 261.42 115.01 259.92C130.12 246.32 145.2 232.69 160.37 219.17C161.82 217.88 163.78 217.09 165.62 216.35C177.68 211.53 189.78 206.79 201.86 202.01C203.56 201.33 205.31 200.72 206.89 199.82C210.45 197.78 213.22 194.62 215.11 191.25C217.88 186.31 211.81 185.41 209.95 182.56C200.98 168.75 185.4 167.89 171.68 163.55C167.93 162.36 164.62 160.95 161.67 158.31C156.08 153.31 150.13 148.73 144.62 143.65C141 140.32 138.37 139.9 134.85 143.97C130.08 149.51 124.7 154.53 119.51 159.7C118.03 161.17 116.33 163.37 114.08 161.1C111.94 158.94 113.8 157.17 115.36 155.6C122.03 148.85 128.8 142.18 135.36 135.32C138.01 132.55 140.31 132.56 143.11 134.92C150.1 140.85 157.28 146.55 164.16 152.6C167.26 155.33 170.54 157.35 174.56 158.17C175.38 158.33 176.17 158.62 176.98 158.78C192.96 162.07 207.58 167.73 217.56 181.66C218.13 182.45 218.98 183.05 219.74 183.7C219.98 183.9 220.33 183.99 220.98 184.29C227.23 179 232.74 172.67 237.69 166.15C246.01 155.21 257.32 148.29 268.26 140.75C275.8 135.54 283.45 130.5 290.9 125.17C293.89 123.03 296.04 123.19 298.75 125.68C312.27 138.06 326.01 150.18 339.47 162.61C343.28 166.13 347.76 168.06 352.34 170.06C354.47 170.99 356.26 169.94 358.12 169.4C389.06 160.49 418.05 147.21 445.41 130.35C448.83 128.25 451.64 128.21 455.13 130.08C463.06 134.32 470.91 138.9 479.27 142.1C494.39 147.88 506.08 157.9 516.61 169.68C517.6 170.79 518.86 171.75 518.93 173.4C518.98 174.5 518.38 175.31 517.44 175.81C515.82 176.68 514.52 175.88 513.42 174.79C508.43 169.88 503.46 164.96 498.53 159.98C496.64 158.07 494.57 156.45 492.15 155.25C479.46 148.95 466.79 142.63 454.12 136.29C451.97 135.21 450.1 134.55 447.61 135.92C434.05 143.39 421.03 151.82 406.63 157.78C392.49 163.63 378.44 169.7 362.86 174.09C366.61 177.1 370.38 178.35 373.96 179.62C382.13 182.51 389 187.31 395.61 192.75C407.18 202.28 419 211.51 430.6 221.01C434.1 223.88 438.34 224.84 442.36 226.33C455.47 231.21 468.63 235.95 481.84 240.55C485.81 241.94 488.48 244.92 491.63 247.33C496.92 251.37 502.13 255.54 507.33 259.7C508.95 260.99 510.54 262.58 508.85 264.74C507.11 266.94 505.09 265.79 503.67 264.32C484.52 244.44 458.3 238.71 433.89 229.36C432.34 228.77 430.82 228.09 428.97 227.25Z',
      'M313.55 176.91C312.18 173.74 313.41 173.73 315.16 175.37C318.32 178.32 321.39 181.39 324.24 184.64C326.65 187.39 329.48 189.04 333 189.99C343.77 192.89 354.33 196.49 364.71 200.59C366.09 201.14 367.78 201.55 368.65 202.6C375.11 210.38 381.71 218.08 386.98 226.8C385.27 228.14 384.61 226.78 383.88 226.11C382.16 224.54 380.26 223.06 378.92 221.19C370.45 209.41 358.78 202.74 344.91 199.47C344.75 199.43 344.59 199.37 344.42 199.34C330.86 196.56 320.26 189.68 313.55 176.91Z',
      'M207.86 226.72C212.17 225.78 216.03 224.32 219.95 224.14C229 223.73 235.28 218.64 241.48 212.94C244.91 209.78 248.37 206.52 253.51 203.66C252.22 208.66 248.82 210.58 246.72 213.39C239.97 222.4 232 229.37 219.87 230.06C208.64 230.7 198.53 234.62 189.85 241.98C188.79 242.88 187.6 244.01 184.61 242.93C192.45 237 197.03 228.08 207.86 226.72Z',
      'M444.01 253.93C433.74 248.77 423.58 244.18 414.46 237.68C413.68 237.13 412.69 236.69 412.63 235.45C413.55 234.04 414.63 234.95 415.64 235.3C426.68 239.08 437.23 243.95 447.37 249.7C453.03 252.92 454.83 259.16 458.12 264.33C452.16 262.69 449.57 256.59 444.01 253.93Z',
      'M177.62 174.17C187.94 175.12 193.7 181.54 198.91 189.21C196.61 190.47 195.52 189.01 194.54 188.13C188.64 182.85 181.64 180.25 173.9 179.25C164.45 178.03 157.23 173.51 153.11 164.29C160.51 169.25 168.24 173.31 177.62 174.17Z',
      'M486.67 183.28C482.23 177.87 477.9 172.82 473.91 167.52C471.38 164.14 467.63 162.7 464.36 160.47C461.31 158.38 457.93 156.69 455.5 153.32C470.76 154.46 488.63 171.12 491.23 186.35C489 186.58 488.28 184.55 486.67 183.28Z'
    ];

    var mtnSvg = '<svg viewBox="0 0 608 352" xmlns="http://www.w3.org/2000/svg">';
    mtnPaths.forEach(function(d) {
      mtnSvg += '<path fill="' + C + '" opacity="0.55" stroke="none" d="' + d + '"/>';
    });
    mtnSvg += '<path fill="none" stroke="' + Cl + '" stroke-width="1.5" opacity="0.3" d="' + mtnPaths[0] + '"/>';
    mtnSvg += '</svg>';

    var mountains = [
      { name: 'Agung', lat: -8.3427, lng: 115.5081, size: [105, 62] },
      { name: 'Batur', lat: -8.2407, lng: 115.3773, size: [100, 58] },
      { name: 'Batukaru', lat: -8.3100, lng: 115.1267, size: [92, 54] },
      { name: 'Abang', lat: -8.3500, lng: 115.4700, size: [84, 50] },
      { name: 'Merbuk', lat: -8.2000, lng: 115.1200, size: [76, 44] }
    ];

    mountains.forEach(function(mt) {
      var icon = L.divIcon({
        className: 'mountain-icon',
        html: '<div class="mountain-label">' + mt.name + '</div>' + mtnSvg,
        iconSize: mt.size,
        iconAnchor: [mt.size[0] / 2, mt.size[1]],
        interactive: false
      });
      L.marker([mt.lat, mt.lng], { icon: icon, interactive: false }).addTo(map);
    });

    var airportSvg = '<svg viewBox="0 0 720 624" xmlns="http://www.w3.org/2000/svg">' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M272.064819,231.016266   C251.900131,222.130386 232.032211,213.495300 214.214066,200.931381   C208.038101,196.576599 202.648727,191.342194 198.182388,185.282776   C182.899521,164.548782 189.898270,138.305313 213.411469,127.204956   C223.176407,122.595039 233.497406,120.388229 244.075790,118.729073   C257.663727,116.597885 271.688080,116.705116 284.593994,110.880455   C291.612030,107.713081 298.173187,103.778191 304.584351,99.595535   C321.120575,88.807274 339.395782,87.157478 358.349091,89.217087   C406.733948,94.474930 446.284943,118.199478 482.409821,148.929352   C496.374756,160.808746 509.656494,173.438248 522.300354,186.719757   C524.469910,188.998672 526.218994,191.677902 528.471191,193.898895   C531.596008,192.145859 532.202271,189.870331 533.329529,188.151474   C540.632568,177.016174 548.214905,166.041489 553.614990,153.770706   C554.542908,151.662186 555.849915,149.651947 557.303955,147.857391   C560.591125,143.800537 564.524170,143.249115 568.692566,146.429596   C571.187561,148.333191 573.594971,150.528137 575.487244,153.014175   C583.265015,163.232666 591.808289,172.796021 600.304016,182.396255   C603.207214,185.676910 604.263733,189.089737 603.381897,193.381699   C599.856995,210.538025 600.099609,228.130432 597.445374,245.401871   C595.150269,260.336243 586.803223,269.696167 572.533569,274.138641   C554.814514,279.655060 536.601196,281.013153 518.225037,280.222534   C500.772278,279.471680 483.294312,278.952515 465.901398,277.137634   C449.091705,275.383606 432.785553,271.385162 416.933136,265.615448   C412.513245,264.006775 410.924255,264.780884 410.109100,269.671722   C408.143188,281.466461 407.192322,293.476959 403.214142,304.896393   C397.368225,321.677246 387.123322,329.459961 372.698761,328.252167   C362.755493,327.419617 354.787231,322.799255 347.525421,316.355347   C333.385803,303.808197 322.885651,288.427002 313.127228,272.475250   C307.577393,263.403107 301.411530,254.605408 299.028107,243.953552   C298.549255,241.813507 296.662048,241.316772 294.991150,240.614532   C287.470795,237.453842 279.941376,234.314636 272.064819,231.016266  M412.367462,249.476151   C412.284698,252.306091 412.313995,255.145325 412.080353,257.962769   C411.920441,259.891022 412.260895,261.138855 414.378448,261.648651   C435.252625,266.673981 456.151428,271.459290 477.678711,272.904236   C493.131439,273.941406 508.653961,273.874359 524.053650,275.194214   C540.343628,276.590363 555.937561,274.148132 571.323975,269.560059   C582.345947,266.273376 589.481934,259.065399 592.035217,247.415024   C593.362183,241.360489 593.532288,235.213699 594.597473,229.161652   C595.151489,226.013763 593.417969,224.839203 590.571472,224.060104   C580.129761,221.202225 571.028992,215.855209 562.634460,209.031967   C554.453796,202.382584 547.144104,195.036072 541.598633,185.527267   C538.372620,189.485733 534.986938,192.617767 532.705383,196.765457   C539.321045,204.557144 546.983337,211.118515 553.223450,219.250610   C550.499390,220.568146 549.421814,218.838715 548.258606,217.909348   C542.924744,213.647766 537.452026,209.514099 532.480286,204.853333   C515.588928,189.018524 499.055145,172.800232 482.073578,157.064240   C459.526062,136.170502 434.320190,119.320908 405.590790,107.946167   C383.968842,99.385468 361.686127,94.562431 338.358795,95.322273   C328.920959,95.629692 320.067535,98.139313 311.619659,103.271927   C314.941284,109.008301 318.137482,114.416336 321.225739,119.885353   C327.155884,130.387085 331.788239,141.396957 333.904999,153.343323   C335.979065,165.048843 330.942993,172.675323 319.396210,174.697083   C310.049530,176.333633 302.478424,171.961655 295.805084,166.177414   C284.306976,156.211243 273.796478,145.140167 265.636169,132.332947   C261.202667,125.374771 256.864563,122.092842 248.523758,124.275536   C241.768585,126.043289 234.547546,125.951958 227.623825,128.732437   C235.649002,140.032593 234.774368,152.206039 233.493210,164.361954   C232.129883,177.297607 226.763123,187.909561 213.689972,194.695190   C239.466385,213.970734 268.890839,223.751266 296.937134,236.533752   C298.430328,234.153748 298.436615,232.141708 298.736786,230.195450   C300.858856,216.437073 310.981689,205.334885 324.642731,202.849289   C344.778290,199.185684 364.322998,202.086899 383.527832,208.855499   C399.727844,214.565048 413.338959,227.548508 412.367462,249.476151  M353.755005,291.193604   C345.008514,289.432220 336.705994,286.911499 331.271240,278.913971   C333.040527,277.440552 334.096100,278.117615 335.102081,278.645874   C357.677612,290.501221 379.768402,287.237244 401.681213,276.638550   C404.031372,275.501831 405.256775,273.960449 405.646667,271.419678   C406.908539,263.196564 408.144623,254.982254 407.805481,246.618683   C407.245270,232.805008 401.222198,222.068680 388.718842,216.107285   C366.572327,205.548203 343.328308,204.091156 319.570160,209.665207   C315.353302,210.654556 313.119873,213.368042 313.042023,217.898346   C312.958618,222.754303 313.653320,227.516434 314.213745,232.306931   C317.258392,258.332916 326.337585,281.986450 342.178741,302.914795   C348.154602,310.809692 355.069946,317.771790 364.335938,321.863495   C377.211884,327.549255 389.434204,323.267670 395.984863,310.909180   C399.139404,304.957794 401.011597,298.614716 401.960541,291.980164   C402.528381,288.010040 404.188995,284.119995 403.158966,279.356873   C387.878876,288.327209 371.936859,292.727539 353.755005,291.193604  M270.241974,130.273178   C276.557251,137.561371 282.781830,144.930817 289.215332,152.113129   C294.788269,158.334732 300.817017,164.103180 308.764771,167.252853   C314.082489,169.360291 319.523285,169.998077 324.401245,166.190918   C329.438110,162.259735 329.759247,156.469940 328.387634,151.118805   C324.230927,134.902161 315.303406,120.788483 307.782867,105.521553   C294.241882,113.492493 280.478271,119.726234 264.597595,122.632210   C266.877136,125.740150 268.337280,127.730873 270.241974,130.273178  M204.730057,141.237457   C191.718536,157.240295 194.583893,180.448761 210.816696,191.084778   C221.862457,185.164749 227.338013,175.720535 228.775681,163.501251   C230.152176,151.801788 228.532104,140.569229 225.038376,129.276627   C217.088089,131.764847 210.477631,135.074707 204.730057,141.237457  M580.240234,200.284866   C584.252563,201.883942 588.258057,203.500641 592.280640,205.073547   C593.914246,205.712357 595.914612,206.173340 596.443481,203.983139   C598.138550,196.963959 599.691040,189.699280 594.536682,183.452255   C586.071228,173.192261 577.361206,163.130936 568.618835,153.103989   C564.785095,148.706955 561.138733,149.260239 558.496521,154.501038   C555.953491,159.545105 553.675049,164.721939 551.205139,169.803864   C550.549072,171.153610 550.470703,172.257538 551.492554,173.450394   C559.913696,183.280807 567.573059,193.915558 580.240234,200.284866  M560.739563,201.758636   C570.433350,210.619690 581.815002,216.492493 594.285828,221.265625   C594.613098,219.565887 594.834717,218.446732 595.043579,217.325195   C596.257385,210.805420 596.269653,210.732452 589.884399,209.570602   C583.179260,208.350525 577.289246,205.302048 571.859619,201.416946   C562.455627,194.687912 552.697144,188.247757 548.068787,176.770386   C544.881653,179.249146 544.919006,181.379074 546.604858,184.130920   C550.455994,190.416931 555.036743,196.077194 560.739563,201.758636  M304.899933,247.542953   C307.158081,254.690598 316.335083,271.239929 320.603760,275.573914   C311.759460,258.717896 309.251465,240.711197 307.229279,221.802505   C302.363586,230.365509 302.353088,238.460403 304.899933,247.542953  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M274.500671,396.574646   C286.963196,415.045074 285.829773,434.298676 278.831146,453.762909   C270.664703,476.474945 256.901398,495.912354 242.090073,514.670288   C239.097244,518.460571 236.169540,522.303101 233.136063,526.060303   C231.490646,528.098267 229.552399,529.105591 227.190659,526.982422   C218.288116,518.979248 209.105560,511.263306 200.542526,502.912140   C187.048859,489.752197 174.087662,476.123505 166.444641,458.383331   C156.043381,434.240967 161.455994,406.409576 180.151321,387.802490   C190.232513,377.768890 201.702972,370.634277 216.001190,368.580658   C232.317963,366.237061 246.629242,371.222717 259.519928,380.792145   C265.275116,385.064514 270.279022,390.246796 274.500671,396.574646  M270.111511,448.688721   C273.494934,439.211700 275.735168,429.751984 273.783966,419.434662   C269.450958,396.523376 247.532883,377.483643 224.508514,377.272308   C196.675735,377.016815 169.687241,403.677368 169.366348,432.061920   C169.178329,448.693420 176.550171,462.594299 186.400482,475.322510   C198.762421,491.296173 214.725952,503.835846 228.342575,519.405884   C231.731857,514.526672 234.817688,510.048584 237.939819,505.595978   C250.358124,487.885681 263.602539,470.646332 270.111511,448.688721  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M268.184570,264.692261   C263.403320,256.042816 259.688568,247.375244 258.048065,237.937180   C257.793610,236.473297 257.732849,234.964874 257.708099,233.474976   C257.683228,231.980225 257.628845,230.265732 259.674011,230.047867   C261.365875,229.867676 261.906219,231.281570 262.233612,232.579468   C266.036224,247.655365 275.620697,259.506989 284.123840,271.966095   C286.183136,274.983429 288.184631,278.042664 290.126160,281.136932   C291.085968,282.666595 292.319214,284.402466 290.548950,286.071564   C288.527618,287.977386 286.794220,286.380554 285.322113,285.108795   C278.612976,279.312927 272.995819,272.574951 268.184570,264.692261  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M422.774048,520.756104   C426.566620,519.338745 429.967102,517.983032 433.421143,516.781555   C435.046661,516.216064 436.933350,516.054504 437.830536,517.884216   C438.796814,519.854797 437.206360,520.980591 435.737274,521.813965   C419.484192,531.034180 402.227448,536.329712 383.323730,534.997253   C381.406860,534.862122 378.881775,534.990051 378.944336,532.135681   C378.998962,529.644592 381.273926,529.775818 383.073883,529.550293   C396.451202,527.874451 409.649963,525.385864 422.774048,520.756104  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M461.444946,397.607086   C462.898071,399.453491 464.172974,400.991547 465.314789,402.622772   C466.087769,403.726990 466.747223,405.024597 465.586670,406.249878   C464.398041,407.504761 463.121490,406.826080 461.988739,406.068451   C460.468445,405.051605 458.965485,403.999176 457.529327,402.867859   C448.762848,395.961975 439.537231,389.712646 430.178680,383.650909   C429.480682,383.198822 428.768738,382.752808 428.137115,382.216980   C426.802521,381.084869 424.567780,380.163544 425.701538,377.949738   C426.682404,376.034332 428.633881,377.059357 430.200378,377.421600   C435.936646,378.748199 441.226990,381.136047 446.153076,384.324280   C451.771729,387.960663 456.821716,392.270813 461.444946,397.607086  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M331.258423,330.748291   C338.386261,337.063568 345.877808,342.278900 353.648651,347.119263   C355.265076,348.126160 357.774048,349.003601 356.681824,351.506836   C355.484283,354.251465 353.114685,353.158081 351.090668,352.305603   C338.407990,346.963745 328.054993,338.547577 319.257355,328.098663   C317.903656,326.490875 316.818085,324.612793 318.715271,322.817902   C320.816620,320.829895 322.705750,322.171234 324.337189,323.775970   C326.587677,325.989624 328.779907,328.262573 331.258423,330.748291  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M487.357727,455.598755   C486.539673,449.881042 485.791626,444.610718 484.950836,438.686859   C497.915192,446.600403 495.071930,487.436340 481.711487,496.848175   C479.381775,494.982452 480.942993,493.011749 481.625946,491.148407   C485.781036,479.811768 488.443237,468.234680 487.357727,455.598755  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M332.794983,535.159851   C332.167145,537.445068 330.464050,537.841492 328.844757,538.074829   C317.365997,539.728699 305.903320,541.613586 294.244659,541.343872   C292.512085,541.303833 290.006744,541.954834 289.666687,539.559692   C289.258789,536.686646 291.982971,536.946045 293.860474,536.593262   C304.949036,534.510193 316.078766,532.783264 327.388885,532.474731   C329.604858,532.414307 331.793427,532.102234 332.794983,535.159851  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M242.463745,525.204712   C248.270767,526.019165 253.691452,526.864075 259.115845,527.684509   C261.379578,528.026855 263.000610,529.132629 262.706390,531.579041   C262.427216,533.900391 260.633179,535.101318 258.424652,534.938049   C252.572861,534.505554 246.813614,533.363708 241.675079,530.430420   C238.850174,528.817810 238.162338,526.666626 242.463745,525.204712  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M464.984131,231.101593   C466.890900,223.205353 472.447083,220.039734 479.438385,218.932220   C484.939240,218.060791 488.103119,221.100510 487.837646,226.456451   C487.813568,226.942078 487.913239,227.435989 487.975616,227.923477   C489.007599,235.989990 486.821899,240.044968 480.780060,241.265579   C473.070038,242.823242 467.023254,239.086441 464.984131,231.101593  M475.500061,224.981766   C472.334442,226.533630 468.829834,228.067490 469.762115,232.472595   C470.519562,236.051849 476.240295,238.043884 480.761688,236.695923   C484.470398,235.590240 485.847473,231.947556 484.480988,227.273071   C482.986328,222.159927 479.602142,223.445404 475.500061,224.981766  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M365.354980,193.141907   C357.407501,190.718979 353.937805,185.812897 354.710602,178.854156   C355.513275,171.626312 364.131439,166.622910 369.690491,172.206512   C370.382507,172.901581 371.313812,173.352554 372.101105,173.959564   C376.404480,177.277481 378.328247,182.303635 376.754028,186.599915   C374.888947,191.690048 370.961395,193.552490 365.354980,193.141907  M368.882843,188.579147   C372.723328,187.008011 373.851898,183.986099 372.178772,180.513428   C370.654144,177.348984 368.879456,173.447876 364.394196,174.044937   C360.777344,174.526443 359.304474,177.473541 359.280151,181.001740   C359.250458,185.311859 361.577881,187.765472 365.651123,188.678619   C366.442047,188.855911 367.299957,188.734695 368.882843,188.579147  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M428.397308,220.808258   C423.561462,219.822830 419.960266,217.544250 417.434875,213.795319   C414.758179,209.821869 415.122803,205.920456 418.371185,202.390442   C422.034546,198.409500 428.787140,197.698563 435.100616,201.064285   C439.133209,203.214066 439.741974,207.305618 439.413971,211.496506   C438.940094,217.551910 435.605408,220.469681 428.397308,220.808258  M425.192993,203.257278   C421.795563,204.110626 420.004028,206.179733 420.669403,209.758102   C421.315399,213.232254 426.036743,216.863724 429.509064,216.592697   C432.955750,216.323669 434.850922,214.111801 435.567688,210.927231   C436.867096,205.153793 434.223511,203.043488 425.192993,203.257278  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M416.570007,134.368866   C422.492584,139.057877 428.131592,143.526215 433.978699,148.159409   C431.413971,150.172501 430.397308,148.646698 429.376831,147.765411   C414.799957,135.177475 398.453674,125.833626 379.881012,120.486763   C377.366058,119.762733 374.756775,119.044853 372.603333,116.778198   C374.395782,115.006325 376.323303,115.863640 378.127075,116.191238   C392.437164,118.790199 404.420929,126.346184 416.570007,134.368866  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M309.923889,150.859711   C307.942169,153.334824 306.430145,155.751236 304.097290,157.423187   C303.109711,158.130966 302.012115,158.612396 300.959534,157.600021   C300.131134,156.803253 300.253174,155.743759 300.700928,154.823456   C303.566467,148.933258 307.944733,144.178436 312.391296,139.492264   C313.098358,138.747116 314.222260,138.520844 315.152130,139.116745   C316.433197,139.937729 316.073914,141.168976 315.459167,142.181900   C313.741608,145.011948 311.923035,147.780701 309.923889,150.859711  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M295.301086,131.322266   C297.924591,129.089828 298.543060,125.027962 303.638916,124.730240   C300.685303,130.886276 296.552490,134.867279 291.276733,139.536057   C291.250031,135.193893 293.837830,133.746338 295.301086,131.322266  z"/>' +
      '<path fill="' + C + '" opacity="1.000" stroke="none" d=" M201.596939,405.550598   C215.843063,394.165680 229.201355,394.667480 241.811035,404.770447   C253.279724,413.959137 256.287384,430.934357 249.228317,444.190002   C243.525116,454.899567 229.921249,459.934631 215.790359,456.889801   C204.473801,454.451385 196.308029,448.505371 192.837219,437.165955   C189.112701,424.997559 192.272095,414.566345 201.596939,405.550598  M210.815948,404.313812   C209.493927,405.325348 208.069687,406.228760 206.866470,407.366028   C199.049377,414.754547 195.364136,423.571472 198.027328,434.361176   C200.646896,444.974243 208.204575,450.126801 218.438293,451.398926   C227.304855,452.501129 236.348877,452.711884 242.686523,444.608734   C250.649155,434.427826 249.279282,418.319946 239.917603,409.440521   C232.463135,402.370056 218.570587,399.677094 210.815948,404.313812  z"/>' +
      '</svg>';

    var airportIcon = L.divIcon({
      className: 'airport-icon',
      html: '<div class="mountain-label">Ngurah Rai<br>Airport</div>' + airportSvg,
      iconSize: [72, 62],
      iconAnchor: [36, 62],
      interactive: false
    });
    L.marker([-8.7482, 115.1671], { icon: airportIcon, interactive: false }).addTo(map);
  }

  function createMarkers(spotsData) {
    markers.forEach(function(m) { map.removeLayer(m.layer); });
    markers = [];
    var BATCH_SIZE = 20;
    var index = 0;

    function addBatch() {
      var end = Math.min(index + BATCH_SIZE, spotsData.length);
      for (var i = index; i < end; i++) {
        var spot = spotsData[i];
        var markerIcon = createMarkerIcon(spot.location, spot.name);
        var layer = L.marker([spot.lat, spot.lng], { icon: markerIcon }).addTo(map);
        layer.on('click', (function(s, l) {
          return function() { animateToMarker(s, l); };
        })(spot, layer));
        markers.push({ layer: layer, spot: spot });
      }
      index = end;
      if (index < spotsData.length) {
        requestAnimationFrame(addBatch);
      }
    }

    if (spotsData.length > 0) {
      requestAnimationFrame(addBatch);
    }
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

  function initSliderDots() {
    var dotsContainer = document.getElementById('slider-dots');
    dotsContainer.innerHTML = '';
    for (var i = 0; i < totalSlides; i++) {
      var dot = document.createElement('span');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.dataset.index = i;
      dot.addEventListener('click', function() {
        stopAutoSlide();
        currentSlide = parseInt(this.dataset.index);
        updateSlider();
        startAutoSlide();
      });
      dotsContainer.appendChild(dot);
    }
    document.getElementById('slider-prev').style.display = totalSlides > 1 ? 'flex' : 'none';
    document.getElementById('slider-next').style.display = totalSlides > 1 ? 'flex' : 'none';
  }

  var lazyObserver = null;
  var lazyImageQueue = [];
  var lazyImageTimer = null;

  function initLazyLoad() {
    if (!('IntersectionObserver' in window)) return;
    lazyObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          var src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            lazyObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '200px' });
  }

  function observeLazyImage(img) {
    if (lazyObserver) {
      lazyObserver.observe(img);
    } else {
      img.src = img.dataset.src;
    }
  }

  function buildSliderTrack(images) {
    var track = document.getElementById('panel-slider-track');
    track.innerHTML = '';

    images.forEach(function(src, i) {
      var img = document.createElement('img');
      img.alt = '';
      if (i <= 1) {
        img.src = src;
        img.classList.add('loaded');
      } else {
        img.dataset.src = src;
        img.src = PLACEHOLDER_IMG || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        img.classList.add('lazy');
        observeLazyImage(img);
      }
      track.appendChild(img);
    });
    setupSliderTouch();
  }

  function setupSliderTouch() {
    var container = document.querySelector('.panel-slider');
    var track = document.getElementById('panel-slider-track');
    var startX = 0;
    var isDragging = false;

    container.addEventListener('touchstart', function(e) {
      stopAutoSlide();
      startX = e.touches[0].clientX;
      isDragging = true;
      gsap.killTweensOf(track);
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var diff = e.touches[0].clientX - startX;
      var offset = -(currentSlide * container.offsetWidth) + diff;
      gsap.set(track, { x: offset });
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      if (!isDragging) return;
      isDragging = false;
      var diff = e.changedTouches[0].clientX - startX;
      if (diff < -40 && currentSlide < totalSlides - 1) {
        currentSlide++;
      } else if (diff > 40 && currentSlide > 0) {
        currentSlide--;
      }
      updateSlider();
      startAutoSlide();
    }, { passive: true });
  }

  function updateSlider() {
    var track = document.getElementById('panel-slider-track');
    gsap.to(track, {
      x: -(currentSlide * 100) + '%',
      duration: 0.5,
      ease: 'power2.out'
    });
    document.querySelectorAll('.slider-dot').forEach(function(dot, i) {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function sliderPrev() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlider();
  }

  function sliderNext() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
  }

  function openPanel(spot) {
    currentSlide = 0;
    totalSlides = spot.images.length;
    buildSliderTrack(spot.images);
    document.getElementById('panel-title').textContent = spot.name;
    document.getElementById('panel-desc').textContent = spot.description;
    document.getElementById('panel-rating').textContent = '0';
    document.getElementById('panel-coords').textContent = spot.lat.toFixed(4) + 'S, ' + spot.lng.toFixed(4) + 'E';
    document.getElementById('panel-duration').textContent = spot.duration || '';
    if (spot.location) {
      document.getElementById('panel-duration').textContent = (spot.duration || '') + ' \u2014 ' + spot.location;
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

    updateBookmarkUI(spot.id);

    initSliderDots();
    updateSlider();
    startAutoSlide();

    spotPanel.classList.remove('hidden');

    var tl = gsap.timeline();
    tl.fromTo(spotPanel, { x: '100%', opacity: 0 },
      { x: '0%', opacity: 1, duration: 0.5, ease: 'power3.out' });
    tl.fromTo('.slider-dots', { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' }, '-=0.2');
    tl.fromTo('.panel-area', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.2');
    tl.fromTo('#panel-title', { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, '-=0.15');
    tl.fromTo('#panel-desc', { y: 5, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }, '-=0.1');
    tl.fromTo('.btn-explore', { y: 5, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }, '-=0.1');

    var obj = { val: 0 };
    gsap.to(obj, { val: spot.rating, duration: 0.8, delay: 0.2, ease: 'power2.out',
      onUpdate: function() { document.getElementById('panel-rating').textContent = obj.val.toFixed(1); }
    });
  }

  function closePanel() {
    stopAutoSlide();
    gsap.to(spotPanel, { x: '100%', opacity: 0, duration: 0.4, ease: 'power3.in',
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
      activeFilters[tax] = [];
    }
    showFavoritesOnly = false;
    var favBtn = document.getElementById('btn-favorites');
    if (favBtn) {
      favBtn.classList.remove('active');
      favBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
    document.querySelectorAll('.filter-option.selected').forEach(function(opt) {
      opt.classList.remove('selected');
    });
    document.querySelectorAll('.filter-count').forEach(function(c) {
      c.classList.remove('visible');
    });
    applyFilters();
  }

  /* ========== SEARCH ========== */
  function searchSpots(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    return spots.filter(function(spot) {
      return (spot.name && spot.name.toLowerCase().indexOf(q) !== -1) ||
             (spot.location && spot.location.toLowerCase().indexOf(q) !== -1) ||
             (spot.interest && spot.interest.toLowerCase().indexOf(q) !== -1) ||
             (spot.description && spot.description.toLowerCase().indexOf(q) !== -1);
    });
  }

  function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.substring(0, idx) + '<mark>' + text.substring(idx, idx + query.length) + '</mark>' + text.substring(idx + query.length);
  }

  function renderSearchResults(results, query) {
    var dropdown = document.getElementById('search-dropdown');
    var input = document.getElementById('search-input');
    var VISIBLE_LIMIT = 50;

    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-empty"><i class="fas fa-search" aria-hidden="true"></i>No results found for "' + escapeHtml(query) + '"</div>';
      dropdown.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    var visibleResults = results.slice(0, VISIBLE_LIMIT);
    var hasMore = results.length > VISIBLE_LIMIT;

    var html = '';
    visibleResults.forEach(function(spot) {
      var meta = spot.interest || spot.category || '';
      if (spot.location) meta += (meta ? ' \u2014 ' : '') + spot.location;
      html += '<div class="search-result" data-lat="' + spot.lat + '" data-lng="' + spot.lng + '" data-id="' + spot.id + '" role="option">' +
        '<div class="search-result-icon"><i class="fas fa-map-marker-alt" aria-hidden="true"></i></div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + highlightMatch(spot.name, query) + '</div>' +
          '<div class="search-result-meta">' + escapeHtml(meta) + '</div>' +
        '</div>' +
      '</div>';
    });

    if (hasMore) {
      html += '<div class="search-more">Showing ' + VISIBLE_LIMIT + ' of ' + results.length + ' results</div>';
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');

    dropdown.querySelectorAll('.search-result').forEach(function(el) {
      el.addEventListener('click', function() {
        var lat = parseFloat(this.dataset.lat);
        var lng = parseFloat(this.dataset.lng);
        var id = parseInt(this.dataset.id);
        var spot = spots.find(function(s) { return s.id === id; });
        if (spot) {
          var marker = markers.find(function(m) { return m.spot.id === id; });
          if (marker) {
            animateToMarker(spot, marker.layer);
            map.setView([lat, lng], 14, { animate: true, duration: 0.8 });
          }
        }
        closeSearch();
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function closeSearch() {
    var dropdown = document.getElementById('search-dropdown');
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.value = '';
    input.setAttribute('aria-expanded', 'false');
    input.blur();
    clear.classList.remove('visible');
  }

  function debounce(fn, delay) {
    var timer = null;
    return function() {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
    };
  }

  function setupSearch() {
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    var wrapper = document.getElementById('search-wrapper');

    var debouncedSearch = debounce(function(val) {
      if (val.length >= 2) {
        var results = searchSpots(val);
        renderSearchResults(results, val);
      } else {
        document.getElementById('search-dropdown').classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
      }
    }, 200);

    input.addEventListener('input', function() {
      var val = this.value.trim();
      clear.classList.toggle('visible', val.length > 0);
      debouncedSearch(val);
    });

    input.addEventListener('focus', function() {
      var val = this.value.trim();
      if (val.length >= 2) {
        var results = searchSpots(val);
        renderSearchResults(results, val);
      }
    });

    clear.addEventListener('click', function(e) {
      e.stopPropagation();
      closeSearch();
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        document.getElementById('search-dropdown').classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeSearch();
      }
      if (e.key === 'Enter') {
        var first = document.querySelector('.search-result');
        if (first) first.click();
      }
    });
  }

  function setupLegend() {
    var panel = document.getElementById('legend-panel');
    var toggle = document.getElementById('legend-toggle');
    var closeBtn = document.getElementById('legend-close');

    toggle.addEventListener('click', function() {
      panel.classList.remove('hidden');
      toggle.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      gsap.fromTo(panel, { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    });

    closeBtn.addEventListener('click', function() {
      gsap.to(panel, {
        x: -15, opacity: 0, duration: 0.2, ease: 'power2.in',
        onComplete: function() {
          panel.classList.add('hidden');
          toggle.classList.remove('hidden');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      map.fitBounds(BALI_BOUNDS, { padding: [30, 30], animate: true, duration: 0.8 });
    });

    var items = panel.querySelectorAll('.legend-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        var lat = parseFloat(this.getAttribute('data-lat'));
        var lng = parseFloat(this.getAttribute('data-lng'));
        map.flyTo([lat, lng], 13, { duration: 1.2, ease: 'power2.inOut' });
      });
    });
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

    document.getElementById('btn-filter-reset').addEventListener('click', function() {
      resetAllFilters();
    });

    document.getElementById('close-panel').addEventListener('click', closePanel);

    document.getElementById('slider-prev').addEventListener('click', function() {
      stopAutoSlide();
      sliderPrev();
      startAutoSlide();
    });
    document.getElementById('slider-next').addEventListener('click', function() {
      stopAutoSlide();
      sliderNext();
      startAutoSlide();
    });

    var sliderArea = document.querySelector('.panel-image');
    sliderArea.addEventListener('mouseenter', stopAutoSlide);
    sliderArea.addEventListener('mouseleave', startAutoSlide);
    sliderArea.addEventListener('touchstart', function() {
      stopAutoSlide();
    }, { passive: true });
    sliderArea.addEventListener('touchend', function() {
      setTimeout(startAutoSlide, 1000);
    }, { passive: true });

    document.getElementById('btn-reset').addEventListener('click', function() {
      closePanel();
      showDecorations();
      resetAllFilters();
      map.fitBounds(BALI_BOUNDS, { padding: [30, 30], animate: true, duration: 1 });
    });

    document.getElementById('btn-refresh').addEventListener('click', function() {
      if (isLoading) return;
      resetAllFilters();
      loadAllData();
    });

    document.getElementById('btn-favorites').addEventListener('click', function() {
      showFavoritesOnly = !showFavoritesOnly;
      this.classList.toggle('active', showFavoritesOnly);
      this.setAttribute('aria-pressed', showFavoritesOnly ? 'true' : 'false');
      if (showFavoritesOnly) {
        this.innerHTML = '<i class="fas fa-heart" aria-hidden="true"></i>';
      } else {
        this.innerHTML = '<i class="far fa-heart" aria-hidden="true"></i>';
      }
      applyFilters();
    });

    document.getElementById('btn-locate').addEventListener('click', function() {
      if (!navigator.geolocation) return;
      var btn = this;
      btn.classList.add('spinning');
      navigator.geolocation.getCurrentPosition(function(pos) {
        btn.classList.remove('spinning');
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        map.flyTo([lat, lng], 13, { duration: 1.2 });

        if (userMarker) map.removeLayer(userMarker);

        var markerHtml = '<div class="user-marker">' +
          '<div class="user-marker-pulse"></div>' +
          '<div class="user-marker-dot"></div>' +
          '</div>';

        var icon = L.divIcon({
          className: 'user-marker-icon',
          html: markerHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        userMarker = L.marker([lat, lng], { icon: icon, interactive: false }).addTo(map);
      }, function() {
        btn.classList.remove('spinning');
      }, { enableHighAccuracy: true, timeout: 10000 });
    });

    document.getElementById('btn-bookmark').addEventListener('click', function() {
      var title = document.getElementById('panel-title').textContent;
      var found = markers.find(function(m) { return m.spot.name === title; });
      if (found) {
        toggleBookmark(found.spot.id);
      }
    });

    document.getElementById('btn-directions').addEventListener('click', function() {
      var title = document.getElementById('panel-title').textContent;
      var found = markers.find(function(m) { return m.spot.name === title; });
      if (!found) return;

      var destLat = found.spot.lat;
      var destLng = found.spot.lng;

      if (userMarker) {
        var ll = userMarker.getLatLng();
        window.open('https://www.google.com/maps/dir/' + ll.lat + ',' + ll.lng + '/' + destLat + ',' + destLng, '_blank');
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
          window.open('https://www.google.com/maps/dir/' + pos.coords.latitude + ',' + pos.coords.longitude + '/' + destLat + ',' + destLng, '_blank');
        }, function() {
          window.open('https://www.google.com/maps/dir/?api=1&destination=' + destLat + ',' + destLng, '_blank');
        }, { timeout: 5000 });
      } else {
        window.open('https://www.google.com/maps/dir/?api=1&destination=' + destLat + ',' + destLng, '_blank');
      }
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

  function setupKeyboardNav() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var panel = document.getElementById('spot-panel');
        var legend = document.getElementById('legend-panel');
        if (!panel.classList.contains('hidden')) {
          closePanel();
          document.getElementById('close-panel').focus();
        } else if (!legend.classList.contains('hidden')) {
          legend.classList.add('hidden');
          document.getElementById('legend-toggle').setAttribute('aria-expanded', 'false');
          document.getElementById('legend-toggle').focus();
        } else {
          var openDropdown = document.querySelector('.filter-options:not(.hidden)');
          if (openDropdown) {
            openDropdown.classList.add('hidden');
            openDropdown.closest('.filter-dropdown').querySelector('.filter-trigger').setAttribute('aria-expanded', 'false');
          }
        }
      }
    });

    document.getElementById('slider-prev').addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') { stopAutoSlide(); sliderPrev(); startAutoSlide(); }
      if (e.key === 'ArrowRight') { stopAutoSlide(); sliderNext(); startAutoSlide(); }
    });
    document.getElementById('slider-next').addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') { stopAutoSlide(); sliderPrev(); startAutoSlide(); }
      if (e.key === 'ArrowRight') { stopAutoSlide(); sliderNext(); startAutoSlide(); }
    });

    var legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(function(item) {
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });
  }

  function revealUI() {
    var tl = gsap.timeline({ delay: 2 });
    tl.fromTo('#main-header', { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    tl.fromTo('.logo', { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.3');
    tl.fromTo('.controls button', { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.08 }, '-=0.2');

    gsap.fromTo('#filter-bar', { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 2.2 });
    gsap.fromTo('.filter-dropdown', { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.04, delay: 2.4 });

    gsap.fromTo('.deco-floral', { opacity: 0, scale: 0.8 },
      { opacity: 0.7, scale: 1, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.1, delay: 2.8 });
    gsap.fromTo('.deco-vine', { opacity: 0, scaleY: 0.5 },
      { opacity: 0.6, scaleY: 1, duration: 0.7, ease: 'power2.out', stagger: 0.1, delay: 3 });
    gsap.fromTo('.deco-divider', { opacity: 0, scaleX: 0 },
      { opacity: 0.5, scaleX: 1, duration: 0.6, ease: 'power2.out', delay: 3.1 });
    gsap.fromTo('.deco-text', { y: 10, opacity: 0 },
      { y: 0, opacity: 0.6, duration: 0.6, ease: 'power2.out', stagger: 0.2, delay: 3.2 });

    gsap.fromTo('#legend-toggle', { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)', delay: 3.5 });
  }

  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', function() {
  //     navigator.serviceWorker.register('/sw.js').then(function(reg) {
  //       reg.update();
  //     }).catch(function() {});
  //   });
  // }

  window.addEventListener('DOMContentLoaded', init);
})();
