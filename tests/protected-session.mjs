import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto as crypto} from 'node:crypto';
const source=await readFile(new URL('../scripts/protection/service-worker.js', import.meta.url),'utf8');
const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const iv=crypto.getRandomValues(new Uint8Array(12));
const plain=new TextEncoder().encode('story image');
const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);
const manifest={files:{'story.webp':{file:'vault/a.bin',iv:Buffer.from(iv).toString('base64')}}};
let restores=0,fetches=0,expired=0;
function worker(fail=false){const handlers={};const client={url:'https://site.test/app/',postMessage(message,ports){if(message.type==='restore-session'){restores++;ports[0].postMessage({key,manifest});}else if(message.type==='session-expired')expired++;}};
const self={location:{href:'https://site.test/app/service-worker.js'},clients:{matchAll:async()=>[client]},addEventListener:(name,fn)=>handlers[name]=fn};
vm.runInNewContext(source,{self,URL,Response,Uint8Array,Map,Number,Math,atob,crypto,MessageChannel,setTimeout,clearTimeout,fetch:async()=>{fetches++;return new Response(fail?'missing':cipher,{status:fail?404:200});}});
return {handlers,async request(){let promise;handlers.fetch({request:new Request('https://site.test/app/story.webp'),respondWith:p=>promise=p});return promise;}};}
const first=worker();assert.equal(await (await first.request()).text(),'story image');assert.equal(restores,1);assert.equal(fetches,1);assert.equal(await (await first.request()).text(),'story image');assert.equal(fetches,1);
// A new worker has none of the previous worker's globals.
const restarted=worker();const response=await restarted.request();assert.equal(response.headers.get('Content-Type'),'image/webp');assert.equal(await response.text(),'story image');assert.equal(restores,2);
let recovered;restarted.handlers.message({data:{type:'read-session'},ports:[{postMessage:value=>recovered=value}]});assert.equal(recovered.key.extractable,false);assert.equal(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv},recovered.key,cipher)),"story image");
const failed=worker(true);assert.equal((await failed.request()).status,503);assert.equal(expired,1);assert.equal((await failed.request()).status,503);assert.equal(expired,1);
restarted.handlers.message({data:{type:'lock'},ports:[]});let locked;restarted.handlers.message({data:{type:'read-session'},ports:[{postMessage:value=>locked=value}]});assert.equal(locked,null);
console.log('OK: a suspended worker recovers its key from an unlocked tab, decrypts a Story and reuses its cache; expired publication sends one recovery notice; locking clears the session.');

// Check the actual tab-side handoff, including expiry and explicit re-opening.
const listeners = new Map();
let reloads = 0, lockedByTab = 0;
const controller = { postMessage(message, ports) {
  if (message.type === 'read-session') ports[0].postMessage({ key, manifest });
  if (message.type === 'lock') { lockedByTab++; ports[0].postMessage('ready'); }
} };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: {
  controller, addEventListener: (type, listener) => listeners.set(type, listener),
} } });
globalThis.window = new EventTarget();
window.location = { reload: () => reloads++ };
const { initializeProtectedSession, reopenProtectedSite } = await import('../src/services/protected-session.js');
await initializeProtectedSession();
async function askTab() {
  const channel = new MessageChannel();
  const answer = new Promise(resolve => { channel.port1.onmessage = event => { channel.port1.close(); resolve(event.data); }; });
  listeners.get('message')({ data: { type: 'restore-session' }, ports: [channel.port2] });
  const value = await answer; channel.port2.close(); return value;
}
const tabSession = await askTab();
assert.equal(tabSession.key.extractable, false);
assert.equal(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, tabSession.key, cipher)), 'story image');
let notice = false; window.addEventListener('protected-session-expired', () => notice = true);
listeners.get('message')({ data: { type: 'session-expired' } });
assert.equal(await askTab(), null); assert(notice);
await reopenProtectedSite(); assert.equal(lockedByTab, 1); assert.equal(reloads, 1);
console.log('OK: the tab retains the key only in memory, hands it back after suspension, forgets expired sessions and unlocks the refresh path.');
