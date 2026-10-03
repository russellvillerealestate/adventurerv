'use strict';
const assert = require('node:assert/strict');
const {publicFeed} = require('./rentec-map-adapter.cjs');
const properties = Array.from({length:36}, (_, i) => ({
  property_id: i < 3 ? 59706151 + i : 59706153 + i,
  sub_of: 59706150, archived:false,
  nickname:`Site ${String(i+1).padStart(2,'0')}`,
  renters:[{renter_name:'PRIVATE NAME', renter_id:123}], notes:'PRIVATE NOTES'
}));
const wrap = data => ({data});
const feed = publicFeed(wrap(properties), wrap(properties.slice(1)), new Date('2026-10-03T12:00:00Z'));
assert.equal(feed.spots[0].status,'Available');
assert.equal(feed.spots[1].status,'Occupied');
assert.equal(feed.spots.length,36);
assert.ok(!JSON.stringify(feed).includes('PRIVATE'));
assert.deepEqual(Object.keys(feed.spots[0]),['spot','status']);
assert.throws(()=>publicFeed(wrap(properties.slice(1)),wrap([])), /Incomplete/);
assert.throws(()=>publicFeed(wrap([...properties,properties[0]]),wrap([])), /duplicate/);
assert.throws(()=>publicFeed(wrap(properties),wrap([{...properties[0],sub_of:9}])), /Wrong park/);
assert.throws(()=>publicFeed(wrap(properties),wrap([{...properties[0],archived:true}])), /archived/);
assert.throws(()=>publicFeed(wrap(properties),wrap([{...properties[0],nickname:'Site 99'}])), /identity/);
assert.throws(()=>publicFeed(wrap(properties),{error:'unavailable'}), /Invalid/);
console.log('Passed: privacy, complete inventory, occupancy, duplicate, wrong-park, archive, identity and failure checks.');
