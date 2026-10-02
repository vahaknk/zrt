// Converts server-rendered Paris-time schedule blurbs (workshop/cloud detail
// pages, library cards) to the member's registered timezone (<body data-tz>),
// or the browser's own timezone when none is on file. Each element carrying
// a data-schedule attribute holds a JSON list of {start, end} UTC instants
// (one per weekly occurrence); this groups occurrences that land on the same
// local time together, mirroring how the server-rendered fallback grouped
// them by Paris time.
(function () {
  var WEEKDAY_LABEL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  var tz = document.body.dataset.tz || undefined;
  var tzCity = tz ? tz.split('/').pop().replace(/_/g, ' ') : null;

  var formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch (e) {
    tz = undefined;
    tzCity = null;
    formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }

  function parts(d) {
    var out = {};
    formatter.formatToParts(d).forEach(function (p) {
      out[p.type] = p.value;
    });
    return { day: WEEKDAY_INDEX[out.weekday], time: out.hour + ':' + out.minute };
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
      var start = parts(new Date(entry.start));
      var end = parts(new Date(entry.end));
      var key = start.time + '–' + end.time;
      (groups[key] = groups[key] || []).push(start.day);
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

    el.textContent = clauses.join(', ') + (tzCity ? ' (' + tzCity + ')' : '');
  });
})();
