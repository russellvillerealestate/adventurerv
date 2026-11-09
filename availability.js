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
  const summary = document.createElement('p'); summary.className = 'availability-summary'; summary.setAttribute('role','status'); summary.textContent = 'Checking current availability…';
  const help = document.createElement('p'); help.className = 'availability-help'; help.textContent = 'All 36 spots are shown below. Please ask the park about current openings. This map does not confirm future dates or reserve a spot.';
  const scroll = document.createElement('div'); scroll.className = 'availability-scroll'; scroll.setAttribute('aria-label','Full park map showing all 36 spots.');
  const canvas = document.createElement('div'); canvas.className='availability-canvas';
  image.parentNode.insertBefore(summary,image); summary.after(help,scroll); scroll.append(canvas); canvas.append(image);
  const details = document.createElement('p'); details.className='availability-detail'; details.setAttribute('aria-live','polite'); details.textContent='Choose a spot to see its status.';
  const grid = document.createElement('div'); grid.className='availability-grid'; grid.setAttribute('aria-label','All 36 spots');
  const updated = document.createElement('p'); updated.className='availability-updated';
  scroll.after(details,grid,updated);
  let statuses = new Map(), selectedSpot = null, lastCheck = NaN, ownerOpening = null;
  const inquire=document.createElement('a');inquire.href='signup.html';inquire.className='btn';inquire.textContent='Ask about Spot 22 — start the camper questionnaire';inquire.hidden=true;details.after(inquire);
  function ownerActive(){const a=Date.parse(ownerOpening?.recordedAt),b=Date.parse(ownerOpening?.expiresAt),n=Date.now();return ownerOpening?.site===22&&ownerOpening?.status==='AvailableNow'&&ownerOpening?.authority==='owner-confirmed'&&Number.isFinite(a)&&Number.isFinite(b)&&a<=n&&n<b&&b>a&&b-a<=7200000;}
  function detail(spot){return spot===22&&ownerActive()?'Spot 22: owner-confirmed available now. Submit an inquiry; park confirmation is required before arrival. No future dates are reserved.':`Spot ${spot}: contact the park to confirm availability and arrival timing.`;}
  const markers = positions.map(([x,y],i)=>{
    const spot=i+1;
    const make = cls => {const b=document.createElement('button'); b.type='button'; b.className=cls; b.dataset.spot=spot; b.textContent=spot; b.addEventListener('click',()=>{selectedSpot=spot;details.textContent=detail(spot);}); return b;};
    const pin=make('availability-pin'); pin.style.left=x+'%'; pin.style.top=y+'%'; canvas.append(pin);
    const item=make('availability-item'); labelItem(item,spot,'Checking…'); grid.append(item);
    return {spot,pin,item};
  });
  function unavailable(){inquire.hidden=true;ownerOpening=null;lastCheck=NaN;statuses=new Map(); summary.textContent='Availability could not be confirmed. Please contact the park.'; markers.forEach(({spot,pin,item})=>{for(const b of [pin,item]){b.dataset.status='unknown';b.setAttribute('aria-label',`Spot ${spot}: status unavailable`);}labelItem(item,spot,'Check status');}); updated.textContent='No availability is assumed when the live update cannot be checked.';details.textContent='Please contact the park for current availability.';}
  function validate(data){
    if(data?.version!==3||data.source!=='Innago'||data.status!=='RequestOnly'||!Array.isArray(data.spots)||data.spots.length!==36)throw Error('Invalid feed');
    const t=Date.parse(data.updatedAt),age=Date.now()-t;
    if(!Number.isFinite(t)||age<0||age>=7200000)throw Error('Stale feed');
    const seen=new Set();for(const row of data.spots){if(!Number.isInteger(row.spot)||row.spot<1||row.spot>36||seen.has(row.spot)||row.status!=='Unknown')throw Error('Invalid spot');seen.add(row.spot);}return data;
  }
  async function refresh(){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);try{const res=await fetch('availability-v3.json?t='+Date.now(),{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('Unavailable');const data=validate(await res.json());try{const o=await fetch('owner-opening.json?t='+Date.now(),{cache:'no-store',signal:controller.signal});ownerOpening=o.ok?await o.json():null;}catch{ownerOpening=null;}lastCheck=Date.parse(data.updatedAt);statuses=new Map(data.spots.map(s=>[s.spot,s.status]));if(ownerActive())statuses.set(22,'Available');inquire.hidden=!ownerActive();summary.textContent=ownerActive()?'Spot 22 available now — owner-confirmed · Other spots: ask the park':'36 spots · Contact the park for current openings';markers.forEach(({spot,pin,item})=>{const status=statuses.get(spot);for(const b of [pin,item]){b.dataset.status=status.toLowerCase();b.setAttribute('aria-label',`Spot ${spot}: ${status}`);}labelItem(item,spot,spot===22&&ownerActive()?'Available now · owner-confirmed':'Ask the park');});[...markers].sort((a,b)=>(statuses.get(a.spot)==='Available'?0:1)-(statuses.get(b.spot)==='Available'?0:1)||a.spot-b.spot).forEach(({item})=>grid.append(item));if(selectedSpot)details.textContent=detail(selectedSpot);updated.textContent=`Innago snapshot checked: ${new Date(data.updatedAt).toLocaleString()}. Published after verified reads. Automatic refresh is pending. Owner-confirmed openings are labelled separately; confirm arrival with the park.`;}catch{unavailable();}finally{clearTimeout(timeout);}}
  setInterval(()=>{if(!ownerActive()&&statuses.get(22)==='Available'){statuses.set(22,'Unknown');inquire.hidden=true;const m=markers.find(m=>m.spot===22);for(const b of [m.pin,m.item]){b.dataset.status='unknown';b.setAttribute('aria-label','Spot 22: ask the park');}labelItem(m.item,22,'Ask the park');summary.textContent='36 spots · Contact the park for current openings';if(selectedSpot===22)details.textContent=detail(22);}if(Number.isFinite(lastCheck)&&(Date.now()<lastCheck||Date.now()-lastCheck>=7200000))unavailable();},1000);
  refresh(); setInterval(()=>{if(!document.hidden)refresh();},60000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();

