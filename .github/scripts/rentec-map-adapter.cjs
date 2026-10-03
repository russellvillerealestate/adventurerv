'use strict';

// Server-side only. Never publish Rentec responses or credentials to the website.
// Sources: Rentec API v3 /properties (sub_of, occupied, archived filters),
// and the 36 property IDs verified in the Rentec property list on 2026-10-03.
const PARENT = 59706150;
const expected = new Map(Array.from({length: 36}, (_, i) => {
  const spot = i + 1;
  return [String(spot <= 3 ? 59706150 + spot : 59706152 + spot), spot];
}));

function rows(response) {
  if (!response || !Array.isArray(response.data)) throw Error('Invalid Rentec response');
  return response.data;
}

function checkedProperties(response, requireAll) {
  const seen = new Map();
  for (const row of rows(response)) {
    const id = String(row.property_id);
    if (!expected.has(id) || seen.has(id)) throw Error('Unexpected or duplicate property');
    if (Number(row.sub_of) !== PARENT || row.archived !== false) {
      throw Error('Wrong park or archived property');
    }
    const spot = expected.get(id);
    if (row.nickname !== `Site ${String(spot).padStart(2, '0')}`) {
      throw Error('Site identity changed; review before publishing');
    }
    seen.set(id, spot);
  }
  if (requireAll && seen.size !== 36) throw Error('Incomplete park data');
  return seen;
}

function publicFeed(allResponse, occupiedResponse, now = new Date()) {
  const all = checkedProperties(allResponse, true);
  // occupiedResponse MUST originate from GET /properties?sub_of=59706150&occupied=true.
  // Use Rentec's current-occupancy filter, not payment status or guessed move-out dates.
  const occupied = checkedProperties(occupiedResponse, false);
  if (!Number.isFinite(now.getTime())) throw Error('Invalid timestamp');
  return {
    version: 1,
    updatedAt: now.toISOString(),
    spots: [...all].map(([id, spot]) => ({
      spot, status: occupied.has(id) ? 'Occupied' : 'Available'
    })).sort((a, b) => a.spot - b.spot)
  };
}

module.exports = {publicFeed};
