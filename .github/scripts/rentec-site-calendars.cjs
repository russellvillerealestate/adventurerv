'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

// Public, one-way occupancy blocks only. No tenant, payment, or credential data.
// These feeds do not import Hipcamp reservations into Rentec or prevent races
// between the two services. Keep owner approval until both calendars are checked.
function calendars(feed, now = new Date()) {
  if (!feed || feed.version !== 1 || !Array.isArray(feed.spots) || feed.spots.length !== 36) throw Error('Incomplete occupancy');
  const age = now.getTime() - Date.parse(feed.updatedAt);
  if (!Number.isFinite(age) || age < -60000 || age > 2 * 3600000) throw Error('Stale occupancy');
  const sites = new Map();
  for (const row of feed.spots) {
    if (!Number.isInteger(row.spot) || row.spot < 1 || row.spot > 36 || sites.has(row.spot) || !['Occupied','Available'].includes(row.status)) throw Error('Invalid site');
    sites.set(row.spot, row.status);
  }
  const stamp = new Date(feed.updatedAt).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
  return Array.from({length:36}, (_,i) => {
    const site = i+1;
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Adventure RV//Occupancy//EN','CALSCALE:GREGORIAN',`X-WR-CALNAME:Adventure RV Site ${site}`];
    if (sites.get(site) === 'Occupied') lines.push(
      'BEGIN:VEVENT', `UID:rentec-occupied-site-${site}@stayarv.com`, `DTSTAMP:${stamp}`,
      // A resident has no assumed departure date. Use fixed boundaries so a
      // calendar importer cannot interpret each refresh as a new reservation.
      'DTSTART;VALUE=DATE:20200101','DTEND;VALUE=DATE:21000101',
      'SUMMARY:Unavailable','STATUS:CONFIRMED','TRANSP:OPAQUE','END:VEVENT');
    lines.push('END:VCALENDAR','');
    return {name:`site-${site}.ics`, content:lines.join('\r\n')};
  });
}
async function writeCalendars(source, directory) {
  const files = calendars(JSON.parse(await fs.readFile(source,'utf8')));
  await fs.mkdir(directory,{recursive:true});
  await Promise.all(files.map(file => fs.writeFile(path.join(directory,file.name),file.content)));
  console.log('Generated 36 public site calendars without resident information.');
}
if(require.main === module) writeCalendars(process.argv[2] || 'occupancy.json', process.argv[3] || 'site-calendars').catch(e => {console.error(e.message);process.exitCode=1;});
module.exports={calendars};
