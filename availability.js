(() => {
  'use strict';
  const host = document.querySelector('#park-map .park-map-card');
  if (!host) return;
  const image = host.querySelector('img');
  if (!image) return;
  const positions = [[78.1,74.1],[80,69],[81.2,64],[82.4,59.1],[83.2,54.8],[83.8,50],[84.1,45.6],[84.4,40.7],[84.6,35.5],[73.1,26.6],[72.2,32.5],[71.2,39.2],[69.9,44.8],[69.2,51.5],[68,57.5],[66.7,63.2],[56.6,39],[56.6,44.8],[56,50.8],[55.5,57.3],[10.2,77.8],[10.2,71.7],[10.2,66],[10.2,60.2],[10.2,54.4],[10.2,48.5],[10.2,42.8],[10.2,37.1],[10.2,31.8],[10.2,26.1],[10.2,20.5],[10.2,14.3],[10.2,8.6],[22.3,64.4],[22.3,69.6],[22.6,75.5]];
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
  const summary = document.createElement('p'); summary.className = 'availability-summary'; summary.setAttribute('role','status'); summary.textContent = 'Checking current availability…';
  const help = document.createElement('p'); help.className = 'availability-help'; help.textContent = 'The whole park is shown below. Green spots are available; use the large spot buttons below the map to check each site. Available spots appear first. We do not take reservations.';
  const scroll = document.createElement('div'); scroll.className = 'availability-scroll'; scroll.setAttribute('aria-label','Full park map showing all 36 spots.');
  const canvas = document.createElement('div'); canvas.className='availability-canvas';
  image.parentNode.insertBefore(summary,image); summary.after(help,scroll); scroll.append(canvas); canvas.append(image);
  const details = document.createElement('p'); details.className='availability-detail'; details.setAttribute('aria-live','polite'); details.textContent='Choose a spot to see its status.';
  const grid = document.createElement('div'); grid.className='availability-grid'; grid.setAttribute('aria-label','All 36 spots');
  const updated = document.createElement('p'); updated.className='availability-updated';
  scroll.after(details,grid,updated);
  let statuses = new Map(), selectedSpot = null;
  const markers = positions.map(([x,y],i)=>{
    const spot=i+1;
    const make = cls => {const b=document.createElement('button'); b.type='button'; b.className=cls; b.dataset.spot=spot; b.textContent=spot; b.addEventListener('click',()=>{selectedSpot=spot;details.textContent=`Spot ${spot}: ${statuses.get(spot)||'Status unavailable'}.`;}); return b;};
    const pin=make('availability-pin'); pin.style.left=x+'%'; pin.style.top=y+'%'; canvas.append(pin);
    const item=make('availability-item'); labelItem(item,spot,'Checking…'); grid.append(item);
    return {spot,pin,item};
  });
  function unavailable(){statuses=new Map(); summary.textContent='Availability could not be confirmed. Please contact the park.'; markers.forEach(({spot,pin,item})=>{for(const b of [pin,item]){b.dataset.status='unknown';b.setAttribute('aria-label',`Spot ${spot}: status unavailable`);}labelItem(item,spot,'Check status');}); updated.textContent='No availability is assumed when the live update cannot be checked.';details.textContent='Please contact the park for current availability.';}
  function validate(data){if(data?.version!==1||!Array.isArray(data.spots)||data.spots.length!==36||!Number.isFinite(Date.parse(data.updatedAt)))throw Error('Invalid feed');const age=Date.now()-Date.parse(data.updatedAt);if(age>2*60*60*1000||age < -5*60*1000)throw Error('Stale feed');const seen=new Set();for(const s of data.spots){if(!Number.isInteger(s.spot)||s.spot<1||s.spot>36||seen.has(s.spot)||!['Occupied','Available'].includes(s.status))throw Error('Invalid spot');seen.add(s.spot);}return data;}
  async function refresh(){try{const res=await fetch('occupancy.json?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('Unavailable');const data=validate(await res.json());statuses=new Map(data.spots.map(s=>[s.spot,s.status]));const available=data.spots.filter(s=>s.status==='Available').length;summary.textContent=`${available} available · ${36-available} occupied · 36 spots`+(available ? ' — Available: '+data.spots.filter(s=>s.status==='Available').map(s=>'Spot '+s.spot).join(', ') : '');markers.forEach(({spot,pin,item})=>{const status=statuses.get(spot);for(const b of [pin,item]){b.dataset.status=status.toLowerCase();b.setAttribute('aria-label',`Spot ${spot}: ${status}`);}labelItem(item,spot,status);});[...markers].sort((a,b)=>(statuses.get(a.spot)==='Available'?0:1)-(statuses.get(b.spot)==='Available'?0:1)||a.spot-b.spot).forEach(({item})=>grid.append(item));if(selectedSpot)details.textContent=`Spot ${selectedSpot}: ${statuses.get(selectedSpot)}.`;updated.textContent=`Last occupancy update: ${new Date(data.updatedAt).toLocaleString()}. Checked just now. Rentec is checked about every 15 minutes; updates can take longer. Please confirm availability with the park.`;}catch{unavailable();}}
  refresh(); setInterval(()=>{if(!document.hidden)refresh();},60000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
