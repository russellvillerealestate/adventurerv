'use strict';
const fs = require('node:fs/promises');
const {publicFeed} = require('./rentec-map-adapter.cjs');
async function getProperties(key, occupied) {
  const url = new URL('https://secure.rentecdirect.com/api/v3/properties');
  url.searchParams.set('sub_of', '59706150');
  url.searchParams.set('archived', 'false');
  if (occupied !== undefined) url.searchParams.set('occupied', String(occupied));
  const response = await fetch(url, {headers: {'X-API-Key': key}, redirect:'error', signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('Rentec occupancy check failed (HTTP '+response.status+')');
  return response.json();
}
async function refresh(outputPath) {
  const key = process.env.RENTEC_OCCUPANCY_KEY;
  if (!key) throw Error('Rentec connection is not configured');
  const all = await getProperties(key);
  const occupied = await getProperties(key,true);
  const vacant = await getProperties(key,false);
  const feed = publicFeed(all, occupied);
  if (!Array.isArray(vacant.data)) throw Error('Vacancy response unavailable');
  const occupiedIds = new Set(occupied.data.map(r=>String(r.property_id)));
  const vacantIds = new Set(vacant.data.map(r=>String(r.property_id)));
  if(vacantIds.size!==vacant.data.length || all.data.some(r=>occupiedIds.has(String(r.property_id))===vacantIds.has(String(r.property_id))) || occupiedIds.size+vacantIds.size!==36) throw Error('Occupancy changed during check or data incomplete; try again');
  // Validate vacant identities through the same strict allowlist as occupied sites.
  publicFeed(all,vacant);
  await fs.writeFile(outputPath,JSON.stringify(feed,null,2)+'\n',{mode:0o644});
  console.log('Verified all 36 sites; published only site numbers and occupancy.');
}
if(require.main===module)refresh(process.argv[2]||'occupancy.json').catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={refresh};
