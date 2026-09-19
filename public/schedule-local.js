// Converts server-rendered Paris-time schedule blurbs (workshop/cloud detail
// pages, library cards) to the viewer's own timezone. Each element carrying
// a data-schedule attribute holds a JSON list of {start, end} UTC instants
// (one per weekly occurrence); this groups occurrences that land on the same
// local time together, mirroring how the server-rendered fallback grouped
// them by Paris time.
(function () {
  var WEEKDAY_LABEL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function fmt(d) {
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  document.querySelectorAll('[data-schedule]').forEach(function (el) {
    var entries;
    try {
      entries = JSON.parse(el.getAttribute('data-schedule'));
    } catch (e) {
      return;
    }
    if (!Array.isArray(entries) || entries.length === 0) return;

    var groups = {};
    entries.forEach(function (entry) {
      var start = new Date(entry.start);
      var end = new Date(entry.end);
      var key = fmt(start) + '–' + fmt(end);
      var localDay = (start.getDay() + 6) % 7; // Monday=0
      (groups[key] = groups[key] || []).push(localDay);
    });

    var clauses = Object.keys(groups).map(function (key) {
      var days = groups[key].slice().sort(function (a, b) {
        return a - b;
      });
      var dayLabel = days.map(function (d) {
        return WEEKDAY_LABEL[d];
      }).join(' & ');
      return dayLabel + ' · ' + key;
    });

    el.textContent = clauses.join(', ');
  });
})();
