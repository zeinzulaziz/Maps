(() => {
  const API_BASE = 'https://jed.or.id/wp-json/wp/v2';
  const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop';

  const DEFAULT_MARKER_COLOR = '#c0392b';

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

  // Custom SVG Icons - Zero network request, lightweight
const ICONS = {
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  my_location: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>',
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>',
  undo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
  bookmark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  bookmark_filled: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  chevron_left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
  chevron_right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
  star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  explore: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  directions: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><path d="M18 6 9 15"/></svg>',
  map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  menu_book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  wifi_off: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 12.55a10 10 0 0 1 5.17-2.39"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  location_on: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>'
};

function icon(name, cls) {
  return '<i class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + (ICONS[name] || '') + '</i>';
}

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
    'KARANGASEM': { fill: '#e0dcd0', border: '#c0b8a0' },
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
  let searchActiveIndex = -1;
  let panelPreviousFocus = null;
  let panelFocusTrapHandler = null;

  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.querySelector('.loader-progress');
  const spotPanel = document.getElementById('spot-panel');

  async function init() {
    simulateLoading();
    initMap();
    initLazyLoad();
    await loadGeoJSON();
    addMountainMarkers();
    addFlyingBirds();
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
        opt.setAttribute('role', 'checkbox');
        opt.setAttribute('tabindex', '0');
        opt.setAttribute('aria-checked', 'false');
        opt.innerHTML = '<span class="filter-check">' + icon('check') + '</span>' + term.name;

        function toggleOption() {
          var isSelected = opt.classList.toggle('selected');
          opt.setAttribute('aria-checked', isSelected ? 'true' : 'false');
          updateActiveFilters(taxonomy, dropdown);
          applyFilters();
        }

        opt.addEventListener('click', function(e) {
          e.stopPropagation();
          toggleOption();
        });

        opt.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            toggleOption();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            var next = opt.nextElementSibling;
            if (next) next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var prev = opt.previousElementSibling;
            if (prev) prev.focus();
          }
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

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.filter-dropdown')) {
        document.querySelectorAll('.filter-dropdown.open').forEach(function(d) {
          d.classList.remove('open');
          d.querySelector('.filter-trigger').setAttribute('aria-expanded', 'false');
        });
      }
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
      btn.innerHTML = icon('bookmark_filled');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('bookmarked');
      btn.innerHTML = icon('bookmark');
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  function updateSpotCount(count) {
    var countEl = document.getElementById('spot-count');
    if (countEl) {
      countEl.textContent = count + ' location' + (count !== 1 ? 's' : '');
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
    var ZoomSlider = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function(map) {
        var c = L.DomUtil.create('div', 'leaflet-control-zoom-slider');
        c.innerHTML = '<button class="zslider-plus" title="Perbesar" type="button">+</button>' +
          '<div class="zslider-track"><div class="zslider-thumb"></div></div>' +
          '<button class="zslider-minus" title="Perkecil" type="button">-</button>';
        L.DomEvent.disableClickPropagation(c);
        var t = c.querySelector('.zslider-track');
        var h = c.querySelector('.zslider-thumb');
        function z2p(z) { return (z - map.getMinZoom()) / (map.getMaxZoom() - map.getMinZoom()); }
        function p2z(p) { return Math.round(map.getMinZoom() + p * (map.getMaxZoom() - map.getMinZoom())); }
        function up() { h.style.bottom = (z2p(map.getZoom()) * 100) + '%'; }
        map.on('zoom', up); up();
        var d = false;
        function gp(e) {
          var r = t.getBoundingClientRect();
          var y = (e.clientY || (e.touches && e.touches[0].clientY)) - r.top;
          return Math.max(0, Math.min(1, 1 - y / r.height));
        }
        t.addEventListener('mousedown', function(e) { d = true; e.preventDefault(); map.setZoom(p2z(gp(e)), { animate: true }); });
        document.addEventListener('mousemove', function(e) { if (!d) return; e.preventDefault(); map.setZoom(p2z(gp(e)), { animate: true }); });
        document.addEventListener('mouseup', function() { d = false; });
        t.addEventListener('touchstart', function(e) { d = true; e.preventDefault(); map.setZoom(p2z(gp(e)), { animate: true }); }, { passive: false });
        document.addEventListener('touchmove', function(e) { if (!d) return; e.preventDefault(); map.setZoom(p2z(gp(e)), { animate: true }); }, { passive: false });
        document.addEventListener('touchend', function() { d = false; });
        c.querySelector('.zslider-plus').addEventListener('click', function() { map.zoomIn({ animate: true }); });
        c.querySelector('.zslider-minus').addEventListener('click', function() { map.zoomOut({ animate: true }); });
        c.addEventListener('dragstart', function(e) { e.preventDefault(); });
        return c;
      }
    });
    new ZoomSlider().addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    var hillshadeLayer = null;
    map.on('zoomend', function() {
      if (map.getZoom() >= 12 && !hillshadeLayer) {
        hillshadeLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          opacity: 0.35,
          attribution: '© Esri'
        }).addTo(map);
      }
    });
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
        var name = feature.properties.alt_name || feature.properties.name || '';
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
    
    var color = DEFAULT_MARKER_COLOR;
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

    var airportIcon = L.divIcon({
      className: 'airport-icon',
      html: '<div class="mountain-label">Ngurah Rai<br>Airport</div><img src="asset/airport.svg" width="72" height="62" alt="Ngurah Rai Airport" style="pointer-events:none">',
      iconSize: [72, 62],
      iconAnchor: [36, 62],
      interactive: false
    });
    L.marker([-8.7482, 115.1671], { icon: airportIcon, interactive: false }).addTo(map);
  }

  function addFlyingBirds() {
    var bc = '#5a4e3e';
    var seagullSvg = '<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">' +
      '<path fill="' + bc + '" d="M70 210 C140 145 210 135 290 165 C330 180 360 195 395 225 C415 242 430 250 448 248 C438 235 432 220 432 205 C432 190 450 180 490 170 C580 145 690 150 820 210 C700 170 600 175 510 200 C470 212 445 208 405 185 C310 130 210 125 70 210Z"/>' +
      '</svg>';
    var isMobile = window.innerWidth < 768;
    var n = isMobile ? 2 + Math.floor(Math.random() * 3) : 8 + Math.floor(Math.random() * 8);
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'flying-bird';
      el.innerHTML = seagullSvg;
      el.style.width = (10 + Math.random() * 55) + 'px';
      document.getElementById('map').appendChild(el);
      flyBird(el);
    }
    function randEdge() {
      return Math.floor(Math.random() * 4);
    }
    function edgePos(edge) {
      var w = window.innerWidth, h = window.innerHeight;
      switch (edge) {
        case 0: return { x: Math.random() * w, y: -80 };
        case 1: return { x: w + 80, y: Math.random() * h };
        case 2: return { x: Math.random() * w, y: h + 80 };
        case 3: return { x: -80, y: Math.random() * h };
      }
    }
    function flyBird(el) {
      var w = window.innerWidth, h = window.innerHeight;
      var spawnEdge = randEdge();
      var exitEdge = (spawnEdge + 1 + Math.floor(Math.random() * 3)) % 4;
      var start = edgePos(spawnEdge);
      var end = edgePos(exitEdge);
      var dur = 5 + Math.random() * 16;
      var s = 0.25 + Math.random() * 0.8;
      var opa = 0.12 + Math.random() * 0.35;
      var facingRight = end.x > start.x;
      gsap.set(el, { x: start.x, y: start.y, scaleX: facingRight ? s : -s, scaleY: s, opacity: 0 });
      gsap.to(el, { opacity: opa, duration: 1.5 + Math.random() * 2.5, ease: 'power2.out' });
      gsap.to(el, {
        x: end.x, y: end.y,
        duration: dur,
        ease: 'none',
        onComplete: function() { flyBird(el); }
      });
    }
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
    gsap.to('.deco-floral', { opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04 });
    gsap.to('.deco-vine', { opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.03 });
    gsap.to('.deco-divider', { opacity: 0, duration: 0.25, ease: 'power2.in', delay: 0.05 });
    gsap.to('.deco-text', { opacity: 0, duration: 0.25, ease: 'power2.in', stagger: 0.06 });
    gsap.to('#temple', { opacity: 0, duration: 0.4, ease: 'power2.in' });
    gsap.to('.community-badge', { opacity: 0, duration: 0.35, ease: 'power2.in' });
  }

  function showDecorations() {
    gsap.to('.deco-floral', { opacity: 0.7, duration: 0.6, ease: 'power2.out', stagger: 0.08 });
    gsap.to('.deco-vine', { opacity: 0.6, duration: 0.5, ease: 'power2.out', stagger: 0.05 });
    gsap.to('.deco-divider', { opacity: 0.5, duration: 0.5, ease: 'power2.out' });
    gsap.to('.deco-text', { opacity: 0.6, duration: 0.5, ease: 'power2.out' });
    gsap.to('#temple', { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to('.community-badge', { opacity: 1, duration: 0.5, ease: 'power2.out' });
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

  function buildSliderTrack(images, spotName) {
    var track = document.getElementById('panel-slider-track');
    track.innerHTML = '';

    images.forEach(function(src, i) {
      var img = document.createElement('img');
      img.alt = spotName + ' - image ' + (i + 1) + ' of ' + images.length;
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
    buildSliderTrack(spot.images, spot.name);
    document.getElementById('panel-title').textContent = spot.name;
    document.getElementById('panel-desc').textContent = spot.description;
    document.getElementById('panel-rating').textContent = '0';
    var interestEl = document.getElementById('panel-interest');
    if (spot.interest) {
      interestEl.textContent = spot.interest;
      interestEl.style.display = 'inline-block';
    } else {
      interestEl.style.display = 'none';
    }
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
    spotPanel.setAttribute('aria-modal', 'true');

    panelPreviousFocus = document.activeElement;

    panelFocusTrapHandler = function(e) {
      if (e.key === 'Tab') {
        var focusables = spotPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    spotPanel.addEventListener('keydown', panelFocusTrapHandler);

    var firstFocusable = spotPanel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();

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

    if (panelFocusTrapHandler) {
      spotPanel.removeEventListener('keydown', panelFocusTrapHandler);
      panelFocusTrapHandler = null;
    }
    spotPanel.setAttribute('aria-modal', 'false');

    gsap.to(spotPanel, { x: '100%', opacity: 0, duration: 0.4, ease: 'power3.in',
      onComplete: function() {
        spotPanel.classList.add('hidden');
        gsap.set(spotPanel, { clearProps: 'all' });
        showDecorations();
        if (panelPreviousFocus && panelPreviousFocus.focus) {
          panelPreviousFocus.focus();
          panelPreviousFocus = null;
        }
      }
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
      favBtn.innerHTML = icon('bookmark');
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
    if (!text || !query) return text ? escapeHtml(text) : '';
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    var before = escapeHtml(text.substring(0, idx));
    var match = escapeHtml(text.substring(idx, idx + query.length));
    var after = escapeHtml(text.substring(idx + query.length));
    return before + '<mark>' + match + '</mark>' + after;
  }

  function renderSearchResults(results, query) {
    var dropdown = document.getElementById('search-dropdown');
    var input = document.getElementById('search-input');
    var VISIBLE_LIMIT = 50;

    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-empty">' + icon('search') + 'No results found for "' + escapeHtml(query) + '"</div>';
      dropdown.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    var visibleResults = results.slice(0, VISIBLE_LIMIT);
    var hasMore = results.length > VISIBLE_LIMIT;

    var html = '';
    searchActiveIndex = -1;
    visibleResults.forEach(function(spot, i) {
      var meta = spot.interest || spot.category || '';
      if (spot.location) meta += (meta ? ' \u2014 ' : '') + spot.location;
      html += '<div class="search-result" id="search-result-' + i + '" data-lat="' + spot.lat + '" data-lng="' + spot.lng + '" data-id="' + spot.id + '" role="option">' +
        '<div class="search-result-icon">' + icon('location_on') + '</div>' +
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

  function updateSearchActiveResult(results) {
    results.forEach(function(r, i) {
      r.classList.toggle('active', i === searchActiveIndex);
      if (i === searchActiveIndex) {
        r.setAttribute('aria-selected', 'true');
        r.scrollIntoView({ block: 'nearest' });
      } else {
        r.removeAttribute('aria-selected');
      }
    });
    var input = document.getElementById('search-input');
    if (searchActiveIndex >= 0) {
      input.setAttribute('aria-activedescendant', 'search-result-' + searchActiveIndex);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function closeSearch() {
    var dropdown = document.getElementById('search-dropdown');
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.value = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    input.blur();
    clear.classList.remove('visible');
    searchActiveIndex = -1;
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
      var dropdown = document.getElementById('search-dropdown');
      var results = dropdown.querySelectorAll('.search-result');
      var count = results.length;

      if (e.key === 'Escape') {
        closeSearch();
        return;
      }

      if (count === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        searchActiveIndex = Math.min(searchActiveIndex + 1, count - 1);
        updateSearchActiveResult(results);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        searchActiveIndex = Math.max(searchActiveIndex - 1, 0);
        updateSearchActiveResult(results);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchActiveIndex >= 0 && searchActiveIndex < count) {
          results[searchActiveIndex].click();
        } else if (count > 0) {
          results[0].click();
        }
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
    map.on('click', function() {
      if (!spotPanel.classList.contains('hidden')) {
        closePanel();
      }
    });

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
        this.innerHTML = icon('bookmark_filled');
      } else {
        this.innerHTML = icon('bookmark');
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

  // === Water Waves Animation (edge-only, short) ===
  const canvas = document.getElementById('water-waves');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function wave(x, t, freq, speed) {
      return Math.sin(x * freq + t * speed) * 4 + Math.sin(x * freq * 1.7 + t * speed * 1.3) * 2;
    }

    function drawWaves(time) {
      ctx.clearRect(0, 0, w, h);
      const t = time * 0.001;
      const gold = 'rgba(201,169,110,';
      const segW = 180;

      // short wave clusters at edges only
      const clusters = [
        // bottom edge
        { x: segW * 0,   y: h - 18, lines: 2 },
        { x: w - segW,   y: h - 18, lines: 2 },
        { x: w * 0.5 - segW / 2, y: h - 14, lines: 1 },
        // top edge
        { x: segW * 0.3, y: 22, lines: 2 },
        { x: w - segW * 1.3, y: 22, lines: 2 },
        // left edge
        { x: 14, y: h * 0.35, lines: 2, vertical: true },
        { x: 14, y: h * 0.7,  lines: 1, vertical: true },
        // right edge
        { x: w - 14, y: h * 0.4, lines: 2, vertical: true },
        { x: w - 14, y: h * 0.75, lines: 1, vertical: true },
      ];

      clusters.forEach(c => {
        for (let i = 0; i < c.lines; i++) {
          ctx.beginPath();
          ctx.strokeStyle = gold + (0.35 - i * 0.08) + ')';
          ctx.lineWidth = 1.2 - i * 0.2;
          if (c.vertical) {
            for (let dy = -40; dy <= 40; dy += 2) {
              const x = c.x + Math.sin(dy * 0.04 + t * 1.2 + i) * 5;
              if (dy === -40) ctx.moveTo(x, c.y + dy);
              else ctx.lineTo(x, c.y + dy);
            }
          } else {
            for (let dx = 0; dx <= segW; dx += 2) {
              const y = c.y + i * 8 + wave(dx, t, 0.035, 1.0 + i * 0.3);
              if (dx === 0) ctx.moveTo(c.x + dx, y);
              else ctx.lineTo(c.x + dx, y);
            }
          }
          ctx.stroke();
        }
      });
    }

    let waveAnimFrame = null;
    let waveRunning = true;
    let lastWaveDraw = 0;

    function drawWavesLoop(time) {
      if (!waveRunning) return;
      if (time - lastWaveDraw < 33) {
        waveAnimFrame = requestAnimationFrame(drawWavesLoop);
        return;
      }
      lastWaveDraw = time;
      drawWaves(time);
      waveAnimFrame = requestAnimationFrame(drawWavesLoop);
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        waveRunning = false;
        if (waveAnimFrame) cancelAnimationFrame(waveAnimFrame);
      } else {
        waveRunning = true;
        waveAnimFrame = requestAnimationFrame(drawWavesLoop);
      }
    });

    window.addEventListener('resize', resize);
    resize();
    waveAnimFrame = requestAnimationFrame(drawWavesLoop);
  }
})();
