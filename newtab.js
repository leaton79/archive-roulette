/* ==========================================================================
   NEWTAB.JS - Main Application Logic for Archive Roulette
   
   IMPROVED RANDOMIZATION STRATEGY (v2):
   - Uses curated "seed" collections known for quality content
   - Excludes test content, low-quality uploads, and spam
   - Tracks recently seen items to avoid repetition
   - Fetches full metadata from /metadata/ endpoint
   - Supports language filtering
   ========================================================================== */

const ArchiveRoulette = {
  
  // ===== CONFIGURATION =====
  
  API_BASE: 'https://archive.org',
  
  MEDIA_TYPES: {
    'all': null,
    'image': 'image',
    'audio': 'audio',
    'movies': 'movies',
    'texts': 'texts',
    'software': 'software',
    'web': 'web',
    'collection:newspapers': 'collection:newspapers',
    'collection:magazine_rack': 'collection:magazine_rack'
  },
  
  // Curated collections for quality results
  CURATED_COLLECTIONS: {
    image: [
      'flickrcommons', 'brooklynmuseum', 'nypl', 'smithsonian',
      'library_of_congress', 'nasa', 'biodiversity', 'artvee',
      'moma', 'metropolitanmuseumofart-gallery', 'rijksmuseum'
    ],
    audio: [
      'librivoxaudio', 'GratefulDead', 'etree', 'audio_music',
      'oldtimeradio', 'opensource_audio', '78rpm', 'audio_bookspoetry'
    ],
    movies: [
      'prelinger', 'classic_tv', 'feature_films', 'silent_films',
      'stock_footage', 'computersandtechvideos', 'newsandpublicaffairs',
      'animationandcartoons', 'classic_cartoons'
    ],
    texts: [
      'gutenberg', 'americana', 'biodiversity', 'medicalheritagelibrary',
      'iacl', 'magazine_rack', 'pulpmagazinearchive', 'sciencefiction'
    ],
    software: [
      'softwarelibrary_msdos_games', 'softwarelibrary_apple',
      'softwarelibrary_c64', 'internetarcade', 'consolelivingroom',
      'softwarelibrary'
    ]
  },
  
  // Patterns to EXCLUDE
  EXCLUSION_PATTERNS: [
    /^test/i, /test$/i, /^TEST/, /TESTIMAGES/i, /testfile/i,
    /^IMG_\d+$/i, /^DSC_?\d+$/i, /^DCIM/i, /^P\d{7,}/,
    /^Screenshot/i, /^Untitled/i, /^undefined$/i, /^null$/i,
    /^\d{8}[_\s]\d{6}$/, /^\d{14,}$/, /^MVI_\d+/i, /^MOV_\d+/i,
    /^VID_\d+/i, /^IMG-\d+/i, /^WA\d+/i, /^photo\d*$/i,
    /^image\d*$/i, /^video\d*$/i, /^audio\d*$/i, /^file\d*$/i,
    /example/i, /sample/i, /placeholder/i, /dummy/i,
    /^cover$/i, /^front$/i, /^back$/i, /^PHOTOS$/i
  ],
  
  LOW_QUALITY_INDICATORS: [
    /^\W*$/,
    /^.{1,3}$/,
    /^\d+$/,
    /^[a-f0-9]{8,}$/i,
  ],
  
  LANGUAGES: {
    '': 'Any Language',
    'eng': 'English',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'rus': 'Russian',
    'jpn': 'Japanese',
    'zho': 'Chinese',
    'ara': 'Arabic',
    'hin': 'Hindi',
    'nld': 'Dutch',
    'pol': 'Polish',
    'kor': 'Korean',
    'swe': 'Swedish',
    'dan': 'Danish',
    'nor': 'Norwegian',
    'fin': 'Finnish',
    'lat': 'Latin',
    'grc': 'Ancient Greek'
  },
  
  recentlySeenIds: new Set(),
  MAX_RECENT_IDS: 500,
  
  currentItem: null,
  currentFilters: null,
  isLoading: false,
  retryCount: 0,
  MAX_RETRIES: 5,
  
  // ===== INITIALIZATION =====
  
  async init() {
    console.log('Archive Roulette initializing...');
    
    this.cacheElements();
    this.currentFilters = await StorageManager.getFilters();
    this.bindEvents();
    this.populateLanguageDropdown();
    this.restoreFilterUI();
    await this.loadSidebar();
    await this.fetchRandomItem();
    
    console.log('Archive Roulette ready!');
  },
  
  cacheElements() {
    this.els = {
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      errorText: document.getElementById('error-text'),
      itemCard: document.getElementById('item-card'),
      
      thumbnail: document.getElementById('item-thumbnail'),
      badge: document.getElementById('item-badge'),
      title: document.getElementById('item-title'),
      date: document.getElementById('item-date'),
      description: document.getElementById('item-description'),
      collection: document.getElementById('item-collection'),
      link: document.getElementById('item-link'),
      deepDive: document.getElementById('deep-dive-content'),
      
      btnFavorite: document.getElementById('btn-favorite'),
      btnNext: document.getElementById('btn-next'),
      btnShare: document.getElementById('btn-share'),
      btnRetry: document.getElementById('btn-retry'),
      btnApplyFilters: document.getElementById('apply-filters'),
      btnClearFilters: document.getElementById('clear-filters'),
      btnExport: document.getElementById('btn-export'),
      importFile: document.getElementById('import-file'),
      
      yearStart: document.getElementById('year-start'),
      yearEnd: document.getElementById('year-end'),
      queryText: document.getElementById('query-text'),
      collectionInput: document.getElementById('collection-input'),
      languageSelect: document.getElementById('language-select'),
      
      historyList: document.getElementById('history-list'),
      favoritesList: document.getElementById('favorites-list'),
      historyPanel: document.getElementById('history-panel'),
      favoritesPanel: document.getElementById('favorites-panel')
    };
  },
  
  populateLanguageDropdown() {
    if (!this.els.languageSelect) return;
    
    this.els.languageSelect.innerHTML = Object.entries(this.LANGUAGES)
      .map(([code, name]) => `<option value="${code}">${name}</option>`)
      .join('');
  },
  
  restoreFilterUI() {
    if (this.currentFilters.yearStart) {
      this.els.yearStart.value = this.currentFilters.yearStart;
    }
    if (this.currentFilters.yearEnd) {
      this.els.yearEnd.value = this.currentFilters.yearEnd;
    }
    if (this.currentFilters.query) {
      this.els.queryText.value = this.currentFilters.query;
    }
    if (this.currentFilters.collection) {
      this.els.collectionInput.value = this.currentFilters.collection;
    }
    if (this.currentFilters.language && this.els.languageSelect) {
      this.els.languageSelect.value = this.currentFilters.language;
    }
    
    const activeType = this.currentFilters.mediaType || 'all';
    document.querySelectorAll('.toggle').forEach(t => {
      t.classList.toggle('active', t.dataset.type === activeType);
    });
  },
  
  bindEvents() {
    document.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => this.handleToggleClick(e));
    });
    
    this.els.btnNext.addEventListener('click', () => this.fetchRandomItem());
    this.els.btnRetry.addEventListener('click', () => this.fetchRandomItem());
    this.els.btnFavorite.addEventListener('click', () => this.toggleFavorite());
    this.els.btnShare.addEventListener('click', () => this.copyShareLink());
    
    this.els.btnApplyFilters.addEventListener('click', () => this.applyAdvancedFilters());
    this.els.btnClearFilters.addEventListener('click', () => this.clearFilters());
    
    this.els.btnExport.addEventListener('click', () => this.exportFavorites());
    this.els.importFile.addEventListener('change', (e) => this.importFavorites(e));
    
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.handleTabClick(e));
    });
  },
  
  // ===== IMPROVED RANDOMIZATION =====
  
  async fetchRandomItem() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.retryCount = 0;
    this.showLoading();
    
    try {
      const item = await this.findQualityItem();
      
      if (!item) {
        throw new Error('Could not find a suitable item. Try adjusting your filters.');
      }
      
      const fullMetadata = await this.fetchFullMetadata(item.identifier);
      const enrichedItem = { ...item, ...fullMetadata };
      enrichedItem.thumbnail = `${this.API_BASE}/services/img/${item.identifier}`;
      
      this.markAsSeen(item.identifier);
      
      this.currentItem = enrichedItem;
      await this.displayItem(enrichedItem);
      
      await StorageManager.addToHistory(enrichedItem);
      await this.loadHistory();
      
    } catch (error) {
      console.error('Failed to fetch random item:', error);
      this.showError(error.message || 'Failed to connect to the Internet Archive.');
    } finally {
      this.isLoading = false;
    }
  },
  
  async findQualityItem() {
    while (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      
      const candidates = await this.fetchCandidates();
      
      if (!candidates || candidates.length === 0) {
        continue;
      }
      
      const qualityItems = candidates.filter(item => this.passesQualityCheck(item));
      const freshItems = qualityItems.filter(item => !this.recentlySeenIds.has(item.identifier));
      
      const pool = freshItems.length > 0 ? freshItems : 
                   qualityItems.length > 0 ? qualityItems : candidates;
      
      if (pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex];
      }
    }
    
    return null;
  },
  
  async fetchCandidates() {
    const mediaType = this.currentFilters.mediaType || 'all';
    const hasUserFilters = this.currentFilters.query || 
                           this.currentFilters.collection ||
                           this.currentFilters.yearStart ||
                           this.currentFilters.yearEnd;
    
    if (hasUserFilters || mediaType.startsWith('collection:')) {
      return await this.searchWithFilters();
    } else {
      return await this.searchCuratedCollections(mediaType);
    }
  },
  
  async searchCuratedCollections(mediaType) {
    let collections;
    
    if (mediaType === 'all') {
      const types = Object.keys(this.CURATED_COLLECTIONS);
      const randomType = types[Math.floor(Math.random() * types.length)];
      collections = this.CURATED_COLLECTIONS[randomType];
    } else if (this.CURATED_COLLECTIONS[mediaType]) {
      collections = this.CURATED_COLLECTIONS[mediaType];
    } else {
      return await this.searchWithFilters();
    }
    
    const collection = collections[Math.floor(Math.random() * collections.length)];
    
    const queryParts = [`collection:${collection}`];
    
    if (this.currentFilters.language) {
      queryParts.push(`language:${this.currentFilters.language}`);
    }
    
    const query = queryParts.join(' AND ');
    
    return await this.executeSearch(query);
  },
  
  async searchWithFilters() {
    const query = this.buildSearchQuery();
    return await this.executeSearch(query);
  },
  
  async executeSearch(query) {
    try {
      const countUrl = `${this.API_BASE}/advancedsearch.php?` + new URLSearchParams({
        q: query,
        output: 'json',
        rows: 0
      });
      
      const countResponse = await fetch(countUrl);
      const countData = await countResponse.json();
      const totalResults = countData.response?.numFound || 0;
      
      if (totalResults === 0) {
        return [];
      }
      
      const maxOffset = Math.min(totalResults, 10000);
      const randomOffset = this.getRandomOffset(maxOffset);
      
      const searchUrl = `${this.API_BASE}/advancedsearch.php?` + new URLSearchParams({
        q: query,
        output: 'json',
        rows: 100,
        start: randomOffset,
        fl: 'identifier,title,description,mediatype,date,year,collection,creator,subject,language',
        sort: this.getRandomSort()
      });
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      return searchData.response?.docs || [];
      
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  },
  
  getRandomOffset(max) {
    const strategy = Math.floor(Math.random() * 4);
    
    switch (strategy) {
      case 0:
        return Math.floor(Math.random() * max);
      case 1:
        return Math.floor(Math.pow(Math.random(), 2) * max);
      case 2:
        return Math.floor(max * 0.25 + Math.random() * max * 0.5);
      case 3:
        const chunkSize = Math.min(1000, max);
        const chunkStart = Math.floor(Math.random() * (max - chunkSize));
        return chunkStart + Math.floor(Math.random() * chunkSize);
      default:
        return Math.floor(Math.random() * max);
    }
  },
  
  getRandomSort() {
    const sorts = [
      'downloads desc',
      'date desc',
      'date asc',
      'titleSorter asc',
      'titleSorter desc',
      'addeddate desc',
      'avg_rating desc',
      'num_reviews desc'
    ];
    return sorts[Math.floor(Math.random() * sorts.length)];
  },
  
  passesQualityCheck(item) {
    const title = item.title || '';
    
    if (!title.trim()) {
      return false;
    }
    
    for (const pattern of this.EXCLUSION_PATTERNS) {
      if (pattern.test(title)) {
        return false;
      }
    }
    
    for (const pattern of this.LOW_QUALITY_INDICATORS) {
      if (pattern.test(title)) {
        return false;
      }
    }
    
    if (title.length < 4) {
      return false;
    }
    
    return true;
  },
  
  markAsSeen(identifier) {
    this.recentlySeenIds.add(identifier);
    
    if (this.recentlySeenIds.size > this.MAX_RECENT_IDS) {
      const iterator = this.recentlySeenIds.values();
      for (let i = 0; i < 100; i++) {
        this.recentlySeenIds.delete(iterator.next().value);
      }
    }
  },
  
  async fetchFullMetadata(identifier) {
    try {
      const url = `${this.API_BASE}/metadata/${identifier}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.metadata) {
        return {};
      }
      
      const meta = data.metadata;
      const files = data.files || [];
      
      return {
        identifier: meta.identifier,
        title: meta.title,
        description: meta.description,
        mediatype: meta.mediatype,
        date: meta.date,
        year: meta.year,
        publicdate: meta.publicdate,
        addeddate: meta.addeddate,
        creator: meta.creator,
        contributor: meta.contributor,
        publisher: meta.publisher,
        sponsor: meta.sponsor,
        collection: meta.collection,
        subject: meta.subject,
        language: meta.language,
        runtime: meta.runtime,
        sound: meta.sound,
        color: meta.color,
        licenseurl: meta.licenseurl,
        rights: meta.rights,
        credits: meta.credits,
        source: meta.source,
        downloads: meta.downloads,
        num_reviews: meta.num_reviews,
        avg_rating: meta.avg_rating,
        notes: meta.notes,
        volume: meta.volume,
        issue: meta.issue,
        edition: meta.edition,
        isbn: meta.isbn,
        issn: meta.issn,
        lccn: meta.lccn,
        oclc: meta.oclc_id,
        scanner: meta.scanner,
        scanningcenter: meta.scanningcenter,
        ppi: meta.ppi,
        ocr: meta.ocr,
        files: files.slice(0, 20).map(f => ({
          name: f.name,
          format: f.format,
          size: f.size,
          length: f.length
        })),
        _rawMetadata: meta
      };
      
    } catch (error) {
      console.error('Failed to fetch full metadata:', error);
      return {};
    }
  },
  
  buildSearchQuery() {
    const parts = [];
    
    const mediaType = this.currentFilters.mediaType || 'all';
    if (mediaType !== 'all') {
      if (mediaType.startsWith('collection:')) {
        parts.push(mediaType);
      } else {
        parts.push(`mediatype:${mediaType}`);
      }
    }
    
    if (this.currentFilters.yearStart || this.currentFilters.yearEnd) {
      const start = this.currentFilters.yearStart || '1800';
      const end = this.currentFilters.yearEnd || '2025';
      parts.push(`year:[${start} TO ${end}]`);
    }
    
    if (this.currentFilters.language) {
      parts.push(`language:${this.currentFilters.language}`);
    }
    
    if (this.currentFilters.query && this.currentFilters.query.trim()) {
      parts.push(`(${this.currentFilters.query.trim()})`);
    }
    
    if (this.currentFilters.collection && this.currentFilters.collection.trim()) {
      parts.push(`collection:${this.currentFilters.collection.trim()}`);
    }
    
    if (parts.length === 0) {
      parts.push('title:* AND downloads:[1 TO *]');
    }
    
    return parts.join(' AND ');
  },
  
  // ===== UI RENDERING =====
  
  async displayItem(item) {
    this.els.thumbnail.src = item.thumbnail;
    this.els.thumbnail.alt = item.title || 'Archive item';
    
    this.els.thumbnail.onerror = () => {
      this.els.thumbnail.src = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
          <rect fill="#e8e0d0" width="200" height="150"/>
          <text x="100" y="75" text-anchor="middle" fill="#8b7355" font-family="serif" font-size="14">
            No Preview
          </text>
        </svg>
      `);
    };
    
    const mediaType = this.formatMediaType(item.mediatype);
    const language = item.language ? ` • ${this.formatLanguage(item.language)}` : '';
    this.els.badge.textContent = mediaType + language;
    
    this.els.title.textContent = item.title || 'Untitled';
    this.els.date.textContent = this.formatDateRich(item);
    this.els.description.textContent = this.truncateText(this.getDescription(item), 300);
    this.els.collection.textContent = this.formatCollectionRich(item);
    
    this.els.link.href = `${this.API_BASE}/details/${item.identifier}`;
    
    const isFavorited = await StorageManager.isFavorited(item.identifier);
    this.els.btnFavorite.textContent = isFavorited ? '♥' : '♡';
    this.els.btnFavorite.classList.toggle('favorited', isFavorited);
    
    this.renderDeepDive(item);
    
    this.hideLoading();
    this.els.itemCard.hidden = false;
    this.els.error.hidden = true;
  },
  
  renderDeepDive(item) {
    const sections = [];
    
    const basicFields = [
      { key: 'Title', value: item.title },
      { key: 'Identifier', value: item.identifier },
      { key: 'Media Type', value: this.formatMediaType(item.mediatype) },
      { key: 'Language', value: this.formatLanguage(item.language) }
    ];
    sections.push({ title: 'Basic Information', fields: basicFields });
    
    const dateFields = [
      { key: 'Date', value: item.date },
      { key: 'Year', value: item.year },
      { key: 'Published', value: this.formatTimestamp(item.publicdate) },
      { key: 'Added to Archive', value: this.formatTimestamp(item.addeddate) }
    ];
    sections.push({ title: 'Dates', fields: dateFields });
    
    const attributionFields = [
      { key: 'Creator', value: this.formatArray(item.creator) },
      { key: 'Contributor', value: this.formatArray(item.contributor) },
      { key: 'Publisher', value: this.formatArray(item.publisher) },
      { key: 'Sponsor', value: this.formatArray(item.sponsor) },
      { key: 'Credits', value: item.credits }
    ];
    sections.push({ title: 'Attribution', fields: attributionFields });
    
    const classificationFields = [
      { key: 'Collection', value: this.formatArray(item.collection) },
      { key: 'Subject', value: this.formatArray(item.subject) },
      { key: 'Volume', value: item.volume },
      { key: 'Issue', value: item.issue },
      { key: 'Edition', value: item.edition }
    ];
    sections.push({ title: 'Classification', fields: classificationFields });
    
    if (item.runtime || item.sound || item.color) {
      const technicalFields = [
        { key: 'Runtime', value: item.runtime },
        { key: 'Sound', value: item.sound },
        { key: 'Color', value: item.color }
      ];
      sections.push({ title: 'Technical Details', fields: technicalFields });
    }
    
    if (item.isbn || item.issn || item.lccn || item.oclc) {
      const idFields = [
        { key: 'ISBN', value: item.isbn },
        { key: 'ISSN', value: item.issn },
        { key: 'LCCN', value: item.lccn },
        { key: 'OCLC', value: item.oclc }
      ];
      sections.push({ title: 'Library Identifiers', fields: idFields });
    }
    
    if (item.scanner || item.scanningcenter) {
      const scanFields = [
        { key: 'Scanner', value: item.scanner },
        { key: 'Scanning Center', value: item.scanningcenter },
        { key: 'PPI', value: item.ppi },
        { key: 'OCR', value: item.ocr }
      ];
      sections.push({ title: 'Digitization', fields: scanFields });
    }
    
    if (item.downloads || item.num_reviews || item.avg_rating) {
      const statsFields = [
        { key: 'Downloads', value: item.downloads ? item.downloads.toLocaleString() : null },
        { key: 'Reviews', value: item.num_reviews },
        { key: 'Average Rating', value: item.avg_rating ? `${item.avg_rating}/5` : null }
      ];
      sections.push({ title: 'Statistics', fields: statsFields });
    }
    
    const rightsFields = [
      { key: 'Rights', value: item.rights },
      { key: 'License', value: item.licenseurl ? `<a href="${item.licenseurl}" target="_blank" rel="noopener">View License</a>` : null },
      { key: 'Source', value: item.source }
    ];
    sections.push({ title: 'Rights & Source', fields: rightsFields });
    
    const description = this.getDescription(item);
    if (description && description.length > 50) {
      sections.push({ 
        title: 'Full Description', 
        fields: [{ key: '', value: description }],
        isDescription: true
      });
    }
    
    if (item.notes) {
      sections.push({
        title: 'Notes',
        fields: [{ key: '', value: this.formatArray(item.notes) }],
        isDescription: true
      });
    }
    
    if (item.files && item.files.length > 0) {
      const fileList = item.files
        .filter(f => f.name && f.format)
        .slice(0, 10)
        .map(f => {
          const size = f.size ? ` (${this.formatFileSize(f.size)})` : '';
          const length = f.length ? ` [${f.length}]` : '';
          return `${f.name}${size}${length} — ${f.format}`;
        })
        .join('\n');
      
      if (fileList) {
        sections.push({
          title: 'Files',
          fields: [{ key: '', value: fileList }],
          isDescription: true
        });
      }
    }
    
    let html = '';
    
    for (const section of sections) {
      const validFields = section.fields.filter(f => f.value);
      
      if (validFields.length === 0) continue;
      
      html += `<div class="metadata-section">`;
      html += `<h4 class="metadata-section-title">${section.title}</h4>`;
      
      if (section.isDescription) {
        for (const field of validFields) {
          html += `<div class="metadata-description">${this.escapeHtml(field.value)}</div>`;
        }
      } else {
        for (const field of validFields) {
          const value = field.key === 'License' ? field.value : this.escapeHtml(field.value);
          html += `
            <div class="metadata-row">
              <span class="metadata-key">${field.key}</span>
              <span class="metadata-value">${value}</span>
            </div>
          `;
        }
      }
      
      html += `</div>`;
    }
    
    this.els.deepDive.innerHTML = html;
  },
  
  // ===== UI STATE =====
  
  showLoading() {
    this.els.loading.hidden = false;
    this.els.itemCard.hidden = true;
    this.els.error.hidden = true;
  },
  
  hideLoading() {
    this.els.loading.hidden = true;
  },
  
  showError(message) {
    this.els.loading.hidden = true;
    this.els.itemCard.hidden = true;
    this.els.error.hidden = false;
    this.els.errorText.textContent = message;
  },
  
  // ===== EVENT HANDLERS =====
  
  handleToggleClick(event) {
    const toggle = event.target;
    const mediaType = toggle.dataset.type;
    
    document.querySelectorAll('.toggle').forEach(t => t.classList.remove('active'));
    toggle.classList.add('active');
    
    this.currentFilters.mediaType = mediaType;
    StorageManager.saveFilters(this.currentFilters);
    this.recentlySeenIds.clear();
    this.fetchRandomItem();
  },
  
  applyAdvancedFilters() {
    const yearStart = this.els.yearStart.value.trim();
    const yearEnd = this.els.yearEnd.value.trim();
    
    this.currentFilters = {
      ...this.currentFilters,
      yearStart: yearStart ? parseInt(yearStart, 10) : null,
      yearEnd: yearEnd ? parseInt(yearEnd, 10) : null,
      query: this.els.queryText.value.trim(),
      collection: this.els.collectionInput.value.trim(),
      language: this.els.languageSelect ? this.els.languageSelect.value : ''
    };
    
    StorageManager.saveFilters(this.currentFilters);
    this.recentlySeenIds.clear();
    this.fetchRandomItem();
  },
  
  clearFilters() {
    this.currentFilters = StorageManager.getDefaultFilters();
    StorageManager.saveFilters(this.currentFilters);
    
    this.els.yearStart.value = '';
    this.els.yearEnd.value = '';
    this.els.queryText.value = '';
    this.els.collectionInput.value = '';
    if (this.els.languageSelect) {
      this.els.languageSelect.value = '';
    }
    
    document.querySelectorAll('.toggle').forEach(t => t.classList.remove('active'));
    document.querySelector('.toggle[data-type="all"]').classList.add('active');
    
    this.recentlySeenIds.clear();
    this.fetchRandomItem();
  },
  
  async toggleFavorite() {
    if (!this.currentItem) return;
    
    const isFavorited = await StorageManager.isFavorited(this.currentItem.identifier);
    
    if (isFavorited) {
      await StorageManager.removeFromFavorites(this.currentItem.identifier);
      this.els.btnFavorite.textContent = '♡';
      this.els.btnFavorite.classList.remove('favorited');
      this.showToast('Removed from favorites');
    } else {
      const result = await StorageManager.addToFavorites(this.currentItem);
      if (result.success) {
        this.els.btnFavorite.textContent = '♥';
        this.els.btnFavorite.classList.add('favorited');
        this.showToast('Added to favorites');
      } else if (result.reason === 'limit_reached') {
        this.showToast('Favorites limit reached (200)');
      }
    }
    
    await this.loadFavorites();
  },
  
  async copyShareLink() {
    if (!this.currentItem) return;
    
    const url = `${this.API_BASE}/details/${this.currentItem.identifier}`;
    
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('Link copied to clipboard');
    } catch (error) {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.showToast('Link copied to clipboard');
    }
  },
  
  handleTabClick(event) {
    const tab = event.target;
    const tabName = tab.dataset.tab;
    
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    this.els.historyPanel.hidden = (tabName !== 'history');
    this.els.favoritesPanel.hidden = (tabName !== 'favorites');
  },
  
  // ===== SIDEBAR =====
  
  async loadSidebar() {
    await this.loadHistory();
    await this.loadFavorites();
  },
  
  async loadHistory() {
    const history = await StorageManager.getHistory();
    
    if (history.length === 0) {
      this.els.historyList.innerHTML = '<li class="empty-state">No discoveries yet</li>';
      return;
    }
    
    this.els.historyList.innerHTML = history.map(item => `
      <li data-id="${this.escapeHtml(item.id)}" title="${this.escapeHtml(item.title)}">
        <span class="history-item-title">${this.escapeHtml(item.title)}</span>
        <span class="history-item-type">${this.escapeHtml(item.type)}</span>
      </li>
    `).join('');
    
    this.els.historyList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', () => this.loadItemById(li.dataset.id));
    });
  },
  
  async loadFavorites() {
    const favorites = await StorageManager.getFavorites();
    
    if (favorites.length === 0) {
      this.els.favoritesList.innerHTML = '<li class="empty-state">No favorites saved</li>';
      return;
    }
    
    this.els.favoritesList.innerHTML = favorites.map(item => `
      <li data-id="${this.escapeHtml(item.id)}" title="${this.escapeHtml(item.title)}">
        <span class="favorite-item-title">${this.escapeHtml(item.title)}</span>
        <span class="favorite-item-type">${this.escapeHtml(item.type)}</span>
      </li>
    `).join('');
    
    this.els.favoritesList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', () => this.loadItemById(li.dataset.id));
    });
  },
  
  async loadItemById(identifier) {
    this.showLoading();
    
    try {
      const fullMetadata = await this.fetchFullMetadata(identifier);
      
      if (!fullMetadata.identifier) {
        throw new Error('Item not found');
      }
      
      fullMetadata.thumbnail = `${this.API_BASE}/services/img/${identifier}`;
      
      this.currentItem = fullMetadata;
      await this.displayItem(fullMetadata);
      
    } catch (error) {
      console.error('Failed to load item:', error);
      this.showError('Failed to load item. It may no longer be available.');
    }
  },
  
  // ===== EXPORT / IMPORT =====
  
  async exportFavorites() {
    const json = await StorageManager.exportFavorites();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `archive-roulette-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('Favorites exported');
  },
  
  async importFavorites(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const result = await StorageManager.importFavorites(text);
      
      if (result.success) {
        await this.loadFavorites();
        this.showToast(`Imported ${result.imported} favorites`);
      } else {
        this.showToast('Invalid file format');
      }
    } catch (error) {
      console.error('Import failed:', error);
      this.showToast('Failed to import favorites');
    }
    
    event.target.value = '';
  },
  
  // ===== UTILITIES =====
  
  formatMediaType(type) {
    const labels = {
      'image': 'Image',
      'audio': 'Audio',
      'movies': 'Video',
      'texts': 'Text',
      'software': 'Software',
      'web': 'Web Archive',
      'data': 'Data',
      'collection': 'Collection'
    };
    return labels[type] || type || 'Unknown';
  },
  
  formatLanguage(lang) {
    if (!lang) return '';
    
    const code = Array.isArray(lang) ? lang[0] : lang;
    
    if (this.LANGUAGES[code]) {
      return this.LANGUAGES[code];
    }
    
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      return displayNames.of(code);
    } catch {
      return code;
    }
  },
  
  formatDateRich(item) {
    const parts = [];
    
    if (item.date) {
      parts.push(item.date);
    } else if (item.year) {
      parts.push(String(item.year));
    }
    
    if (item.publicdate && !parts[0]?.includes(item.publicdate.substring(0, 4))) {
      const pubYear = item.publicdate.substring(0, 4);
      parts.push(`(archived ${pubYear})`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Date unknown';
  },
  
  formatTimestamp(timestamp) {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return timestamp;
    }
  },
  
  getDescription(item) {
    if (!item.description) return 'No description available.';
    if (Array.isArray(item.description)) return item.description.join('\n\n');
    return item.description;
  },
  
  formatArray(value) {
    if (!value) return '';
    if (Array.isArray(value)) {
      const limited = value.slice(0, 10);
      const result = limited.join(', ');
      return value.length > 10 ? result + ` (+${value.length - 10} more)` : result;
    }
    return String(value);
  },
  
  formatCollectionRich(item) {
    const parts = [];
    
    if (item.collection) {
      const collName = Array.isArray(item.collection) ? item.collection[0] : item.collection;
      parts.push(`From: ${collName}`);
    }
    
    if (item.creator) {
      const creator = Array.isArray(item.creator) ? item.creator[0] : item.creator;
      if (creator.length < 50) {
        parts.push(`By: ${creator}`);
      }
    }
    
    return parts.join(' • ');
  },
  
  formatFileSize(bytes) {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = parseInt(bytes, 10);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },
  
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  },
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },
  
  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ArchiveRoulette.init();
});
