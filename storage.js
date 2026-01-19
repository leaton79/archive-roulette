/* ==========================================================================
   STORAGE.JS - Persistence Layer for Archive Roulette
   
   Handles:
   - Favorites (Chrome sync storage - follows your Google account)
   - Session history (local storage - last 50 items)
   - Filter settings (sync storage)
   - Export/Import functionality
   ========================================================================== */

/**
 * StorageManager - Unified interface for all persistence operations
 */
const StorageManager = {
  
  MAX_HISTORY_ITEMS: 50,
  MAX_FAVORITES: 200,
  
  // ===== HISTORY OPERATIONS =====
  
  async addToHistory(item) {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      
      const historyEntry = {
        id: item.identifier,
        title: item.title || 'Untitled',
        type: item.mediatype || 'unknown',
        date: item.date || item.year || '',
        thumbnail: item.thumbnail || '',
        timestamp: Date.now()
      };
      
      const filtered = history.filter(h => h.id !== item.identifier);
      const updated = [historyEntry, ...filtered].slice(0, this.MAX_HISTORY_ITEMS);
      
      await chrome.storage.local.set({ history: updated });
      return updated;
    } catch (error) {
      console.error('Failed to add to history:', error);
      return [];
    }
  },
  
  async getHistory() {
    try {
      const { history = [] } = await chrome.storage.local.get('history');
      return history;
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  },
  
  async clearHistory() {
    try {
      await chrome.storage.local.set({ history: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  },
  
  // ===== FAVORITES OPERATIONS =====
  
  async addToFavorites(item) {
    try {
      const { favorites = [] } = await chrome.storage.sync.get('favorites');
      
      if (favorites.some(f => f.id === item.identifier)) {
        return { success: false, reason: 'already_exists', favorites };
      }
      
      if (favorites.length >= this.MAX_FAVORITES) {
        return { success: false, reason: 'limit_reached', favorites };
      }
      
      const favoriteEntry = {
        id: item.identifier,
        title: item.title || 'Untitled',
        type: item.mediatype || 'unknown',
        date: item.date || item.year || '',
        thumbnail: item.thumbnail || '',
        addedAt: Date.now()
      };
      
      const updated = [favoriteEntry, ...favorites];
      await chrome.storage.sync.set({ favorites: updated });
      
      return { success: true, favorites: updated };
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      return { success: false, reason: 'error', favorites: [] };
    }
  },
  
  async removeFromFavorites(identifier) {
    try {
      const { favorites = [] } = await chrome.storage.sync.get('favorites');
      const updated = favorites.filter(f => f.id !== identifier);
      await chrome.storage.sync.set({ favorites: updated });
      return updated;
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      return [];
    }
  },
  
  async isFavorited(identifier) {
    try {
      const { favorites = [] } = await chrome.storage.sync.get('favorites');
      return favorites.some(f => f.id === identifier);
    } catch (error) {
      console.error('Failed to check favorite status:', error);
      return false;
    }
  },
  
  async getFavorites() {
    try {
      const { favorites = [] } = await chrome.storage.sync.get('favorites');
      return favorites;
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  },
  
  // ===== FILTER SETTINGS =====
  
  async saveFilters(filters) {
    try {
      await chrome.storage.sync.set({ filters });
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  },
  
  async getFilters() {
    try {
      const { filters } = await chrome.storage.sync.get('filters');
      return filters || this.getDefaultFilters();
    } catch (error) {
      console.error('Failed to get filters:', error);
      return this.getDefaultFilters();
    }
  },
  
  getDefaultFilters() {
    return {
      mediaType: 'all',
      yearStart: null,
      yearEnd: null,
      query: '',
      collection: '',
      language: ''
    };
  },
  
  // ===== EXPORT / IMPORT =====
  
  async exportFavorites() {
    const favorites = await this.getFavorites();
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'Archive Roulette',
      favorites
    };
    return JSON.stringify(exportData, null, 2);
  },
  
  async importFavorites(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.favorites || !Array.isArray(data.favorites)) {
        return { success: false, reason: 'invalid_format' };
      }
      
      const { favorites: existing = [] } = await chrome.storage.sync.get('favorites');
      
      const existingIds = new Set(existing.map(f => f.id));
      const newItems = data.favorites.filter(f => !existingIds.has(f.id));
      
      const merged = [...existing, ...newItems].slice(0, this.MAX_FAVORITES);
      
      await chrome.storage.sync.set({ favorites: merged });
      
      return { 
        success: true, 
        imported: newItems.length,
        total: merged.length,
        skipped: data.favorites.length - newItems.length
      };
    } catch (error) {
      console.error('Failed to import favorites:', error);
      return { success: false, reason: 'parse_error' };
    }
  }
};

window.StorageManager = StorageManager;
