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
  let currentSlide = 0;
  let totalSlides = 0;

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

  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.querySelector('.loader-progress');
  const spotPanel = document.getElementById('spot-panel');

  async function init() {
    simulateLoading();
    initMap();
    await loadGeoJSON();
    addMountainMarkers();
    await loadAllData();
    setupSearch();
    setupLegend();
    setupEvents();
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
    } catch (e) {
      console.warn('Gagal load taxonomy terms:', e);
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
        });
        if (!wasOpen) {
          dropdown.classList.add('open');
        }
      });
    });

    document.addEventListener('click', function() {
      document.querySelectorAll('.filter-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
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
    var hasActiveFilter = Object.values(activeFilters).some(function(v) { return v.length > 0; });

    if (hasActiveFilter) {
      hideDecorations();
    } else {
      showDecorations();
    }

    var visibleCount = 0;
    markers.forEach(function(m) {
      var show = true;
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
          images: getGalleryImage(item),
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
    if (countEl) countEl.textContent = 'Failed to load data';
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

  function initSliderDots() {
    var dotsContainer = document.getElementById('slider-dots');
    dotsContainer.innerHTML = '';
    for (var i = 0; i < totalSlides; i++) {
      var dot = document.createElement('span');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.dataset.index = i;
      dot.addEventListener('click', function() {
        currentSlide = parseInt(this.dataset.index);
        updateSlider();
      });
      dotsContainer.appendChild(dot);
    }
    document.getElementById('slider-prev').style.display = totalSlides > 1 ? 'flex' : 'none';
    document.getElementById('slider-next').style.display = totalSlides > 1 ? 'flex' : 'none';
  }

  function buildSliderTrack(images) {
    var track = document.getElementById('panel-slider-track');
    track.innerHTML = '';
    images.forEach(function(src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      track.appendChild(img);
    });
  }

  function updateSlider() {
    var track = document.getElementById('panel-slider-track');
    track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
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

    initSliderDots();
    updateSlider();

    spotPanel.classList.remove('hidden');

    var tl = gsap.timeline();
    tl.fromTo(spotPanel, { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.5, ease: 'power3.out' });
    tl.fromTo('.panel-slider-track', { x: 30 }, { x: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2');
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
      activeFilters[tax] = [];
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
    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-empty"><i class="fas fa-search"></i>No results found for "' + query + '"</div>';
      dropdown.classList.remove('hidden');
      return;
    }
    var html = '';
    results.forEach(function(spot) {
      var meta = spot.interest || spot.category || '';
      if (spot.location) meta += (meta ? ' \u2014 ' : '') + spot.location;
      html += '<div class="search-result" data-lat="' + spot.lat + '" data-lng="' + spot.lng + '" data-id="' + spot.id + '">' +
        '<div class="search-result-icon"><i class="fas fa-map-marker-alt"></i></div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + highlightMatch(spot.name, query) + '</div>' +
          '<div class="search-result-meta">' + meta + '</div>' +
        '</div>' +
      '</div>';
    });
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');

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

  function closeSearch() {
    var dropdown = document.getElementById('search-dropdown');
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    input.value = '';
    input.blur();
    clear.classList.remove('visible');
  }

  function setupSearch() {
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    var wrapper = document.getElementById('search-wrapper');

    input.addEventListener('input', function() {
      var val = this.value.trim();
      clear.classList.toggle('visible', val.length > 0);
      if (val.length >= 2) {
        var results = searchSpots(val);
        renderSearchResults(results, val);
      } else {
        document.getElementById('search-dropdown').classList.add('hidden');
      }
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
      gsap.fromTo(panel, { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    });

    closeBtn.addEventListener('click', function() {
      gsap.to(panel, {
        x: -15, opacity: 0, duration: 0.2, ease: 'power2.in',
        onComplete: function() {
          panel.classList.add('hidden');
          toggle.classList.remove('hidden');
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

    document.getElementById('slider-prev').addEventListener('click', sliderPrev);
    document.getElementById('slider-next').addEventListener('click', sliderNext);

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

    document.getElementById('btn-locate').addEventListener('click', function() {
      if (!navigator.geolocation) return;
      var btn = this;
      btn.classList.add('spinning');
      navigator.geolocation.getCurrentPosition(function(pos) {
        btn.classList.remove('spinning');
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1.2 });
        L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
          radius: 8, color: '#009345', fillColor: '#009345', fillOpacity: 0.8, weight: 3, opacity: 1
        }).addTo(map).bindPopup('📍 Your Location');
      }, function() {
        btn.classList.remove('spinning');
      }, { enableHighAccuracy: true, timeout: 10000 });
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

  window.addEventListener('DOMContentLoaded', init);
})();
