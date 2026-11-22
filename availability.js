(() => {
  'use strict';
  const host = document.querySelector('#park-map .park-map-card');
  if (!host) return;
  const image = host.querySelector('img');
  if (!image) return;
  const positions = [[76,73.5],[77.5,67.5],[78.5,61.5],[79.5,55.5],[80.7,50],[81.5,44.5],[82.5,38.8],[83.1,33.5],[71.1,25.2],[70,31.3],[69.3,37],[68.3,42.5],[67,48],[65.7,53.5],[64.5,59],[63.5,64.5],[56.6,39],[56.6,44.8],[56,50.8],[55.5,57.3],[10.2,77.8],[10.2,71.7],[10.2,66],[10.2,60.2],[10.2,54.4],[10.2,48.5],[10.2,42.8],[10.2,37.1],[10.2,31.8],[10.2,26.1],[10.2,20.5],[10.2,14.3],[10.2,8.6],[22.3,64.4],[22.3,69.6],[22.6,75.5]];
  const thirtyAmpSpots = new Set([1,2,3,4,7,8,9,10,15,16]);
  const amperage = spot => thirtyAmpSpots.has(spot) ? '30 amp' : '50/30 amp';
  function labelItem(item, spot, status) {
    const title = document.createElement('span');
    title.textContent = `${spot} · ${status}`;
    const amps = document.createElement('small');
    amps.className = 'availability-amperage' + (thirtyAmpSpots.has(spot) ? ' availability-amperage-30' : '');
    amps.textContent = amperage(spot);
    item.replaceChildren(title, amps);
    item.setAttribute('aria-label', `Spot ${spot}: ${status}, ${amperage(spot)}`);
  }
  const summary = document.createElement('p');
  summary.className = 'availability-summary';
  summary.setAttribute('role', 'status');
  const scroll = document.createElement('div');
  scroll.className = 'availability-scroll';
  scroll.setAttribute('aria-label', 'Adventure RV Park map showing all 36 spots');
  const canvas = document.createElement('div');
  canvas.className = 'availability-canvas';
  image.parentNode.insertBefore(summary, image);
  summary.after(scroll);
  scroll.append(canvas);
  canvas.append(image);

  const details = document.createElement('p');
  details.className = 'availability-detail';
  details.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div');
  grid.className = 'availability-grid';
  grid.setAttribute('aria-label', 'All 36 RV spots');
  scroll.after(details, grid);

  let selectedSpot = null;
  let openSpot = null;
  let refreshing = false;
  let snapshot = null;
  // Spot 22 was reported taken even though its current lease record was not verified.
  const holdFromOnlineEstimates = new Set([22]);
  let estimatedOpenings = new Set();

  const markers = positions.map(([x, y], i) => {
    const spot = i + 1;
    const make = className => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = className;
      b.dataset.spot = spot;
      b.textContent = spot;
      b.addEventListener('click', () => {
        selectedSpot = spot;
        renderDetails();
      });
      return b;
    };
    const pin = make('availability-pin');
    pin.style.left = x + '%';
    pin.style.top = y + '%';
    canvas.append(pin);
    const item = make('availability-item');
    grid.append(item);
    return {spot, pin, item};
  });

  function renderDetails() {
    if (selectedSpot === null) {
      details.textContent = 'Choose a spot to see its details.';
    } else if (selectedSpot === openSpot) {
      details.textContent = `Spot ${selectedSpot}: park-confirmed opening. Contact the park to confirm your arrival date before traveling.`;
    } else if (estimatedOpenings.has(selectedSpot)) {
      details.textContent = `Spot ${selectedSpot}: Open (estimate based on lease records). Contact the park to confirm availability and arrival before traveling.`;
    } else {
      details.textContent = `Spot ${selectedSpot}: check availability with the park. This status does not mean the spot is open or occupied.`;
    }
  }

  function verifiedOpening(record) {
    const recordedAt = Date.parse(record?.recordedAt);
    return record?.status === 'AvailableNow' &&
      record.authority === 'owner-confirmed' &&
      record.validUntil === 'revoked-or-contradicted' &&
      Number.isInteger(record.site) && record.site >= 1 && record.site <= positions.length &&
      Number.isFinite(recordedAt) && recordedAt <= Date.now() ? record.site : null;
  }

  const feedNote = document.createElement('p');
  feedNote.className = 'availability-help';
  summary.after(feedNote);

  const timeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  const exact = (value, keys) => value !== null && typeof value === 'object' &&
    !Array.isArray(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));

  function parseSnapshot(data) {
    if (!exact(data, ['version', 'source', 'status', 'updatedAt', 'spots']) ||
        data.source !== 'Innago' || !Array.isArray(data.spots) ||
        data.spots.length !== positions.length) return null;
    const estimates = data.version === 4 && data.status === 'Indicative';
    const legacy = data.version === 3 && data.status === 'RequestOnly';
    if (!estimates && !legacy) return null;
    if (typeof data.updatedAt !== 'string') return null;
    const checked = Date.parse(data.updatedAt);
    if (!Number.isFinite(checked) || checked > Date.now() ||
        new Date(checked).toISOString() !== data.updatedAt) return null;
    const allowed = estimates ? ['NoLeaseOnFile', 'LeaseOnFile', 'Unknown'] : ['Unknown'];
    const seen = new Set(), possible = new Set();
    for (const row of data.spots) {
      if (!exact(row, ['spot', 'status']) || !Number.isInteger(row.spot) ||
          row.spot < 1 || row.spot > positions.length || !allowed.includes(row.status) ||
          seen.has(row.spot)) return null;
      seen.add(row.spot);
      if (row.status === 'NoLeaseOnFile' && !holdFromOnlineEstimates.has(row.spot)) {
        possible.add(row.spot);
      }
    }
    return {checked, possible, estimates};
  }

  function render(nextOpening, nextSnapshot) {
    openSpot = nextOpening;
    snapshot = nextSnapshot;
    estimatedOpenings = new Set(snapshot?.possible);
    estimatedOpenings.delete(openSpot);
    const count = estimatedOpenings.size;
    const summaryText = openSpot !== null ? `Spot ${openSpot} · Park-confirmed opening` :
      count ? `${count} possible opening${count === 1 ? '' : 's'} · Check with the park` :
        'Current openings: Check availability';
    if (summary.textContent !== summaryText) summary.textContent = summaryText;
    const note = snapshot?.estimates ?
      `Lease records last checked ${timeFormat.format(snapshot.checked)}. Online estimates may lag. Confirm with the park before making plans.` :
      'Please contact the park for current availability and arrival dates.';
    if (feedNote.textContent !== note) feedNote.textContent = note;
    for (const {spot, pin, item} of markers) {
      const open = spot === openSpot, possible = estimatedOpenings.has(spot);
      const label = open ? 'Park-confirmed opening' : possible ? 'Open' : 'Check availability';
      const status = open ? 'available' : possible ? 'potential' : 'unknown';
      if (item.dataset.status === status) continue;
      pin.dataset.status = item.dataset.status = status;
      pin.setAttribute('aria-label', `Spot ${spot}: ${label}, ${amperage(spot)}`);
      labelItem(item, spot, label);
    }
    renderDetails();
  }

  async function readPublicJson(path, signal) {
    try {
      const response = await fetch(path + '?t=' + Date.now(), {cache: 'no-store', signal});
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const [record, feed] = await Promise.all([
        readPublicJson('owner-opening.json', controller.signal),
        readPublicJson('availability-v3.json', controller.signal)
      ]);
      render(verifiedOpening(record), parseSnapshot(feed));
    } finally {
      clearTimeout(timeout);
      refreshing = false;
    }
  }

  render(null, null);
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
