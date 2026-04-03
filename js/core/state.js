(function() {
  function createAppState() {
    return {
      currentRoom: localStorage.getItem('currentRoom') || '',
      rooms: (function() {
        var saved = JSON.parse(localStorage.getItem('rooms') || '[]');
        return (saved && saved.length > 10) ? saved : getSalasSUAP();
      })(),
      pinnedRooms: JSON.parse(localStorage.getItem('pinnedRooms') || '[]'),
      hiddenRooms: JSON.parse(localStorage.getItem('hiddenRooms') || '[]'),
      scriptUrl: localStorage.getItem('scriptUrl') || 'https://script.google.com/macros/s/AKfycbzTcYF5PjAKCEnAwAYS-y9Y0NpRqlifK6juO5WZ75n3uMuUTHhEtGtLOlA5XQlhxsH_ZA/exec',
      scans: JSON.parse(localStorage.getItem('scans') || '[]'),
      pendingSync: JSON.parse(localStorage.getItem('pendingSync') || '[]'),
      isOnline: navigator.onLine
    };
  }

  window.createAppState = createAppState;
  window.state = createAppState();
  window.screenHistory = Array.isArray(window.screenHistory) ? window.screenHistory : [];
})();
