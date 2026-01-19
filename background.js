/* ==========================================================================
   BACKGROUND.JS - Service Worker for Archive Roulette
   ========================================================================== */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Archive Roulette installed:', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      favorites: [],
      filters: {
        mediaType: 'all',
        yearStart: null,
        yearEnd: null,
        query: '',
        collection: '',
        language: ''
      }
    });
    
    chrome.storage.local.set({
      history: []
    });
    
    console.log('Default storage initialized');
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'newtab.html' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  sendResponse({ received: true });
});
