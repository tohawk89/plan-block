"use strict";(()=>{function $(r,t,e){let n=t.args??{};switch(t.type){case"create":case"link":{if(r.has(t.block))return;let i=n.parent??null,o=t.type==="link"?"link":String(n.type),s=e?.types[o],l={};for(let d of s?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);r.set(t.block,{id:t.block,type:o,parent:i,order:W(r,i,n.after??null,null),source:t.type==="link"?n.source??null:null,attachable:n.attachable??null,payload:{...l,...n.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:s&&(s.rule==="all"||s.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let i=r.get(t.block);if(!i)return;r.set(i.id,{...i,payload:{...i.payload,...n.payload??{}}});return}case"move":{let i=r.get(t.block);if(!i)return;let o="parent"in n?n.parent??null:i.parent;r.set(i.id,{...i,parent:o,order:W(r,o,n.after??null,i.id)});return}case"check":case"uncheck":{let i=P(r,t.block);i&&G(r,i,t.type==="check",e);return}case"check_all":case"uncheck_all":{let i=P(r,t.block);if(!i)return;let o=t.type==="check_all";for(let s of L(r,i.id)){if(s.excluded)continue;let l=P(r,s.id);if(!l)continue;let d=o?[l]:[...U(r,l.id).reverse(),l];for(let p of d)p.type!=="link"&&e?.types[p.type]?.checkable&&G(r,p,o,e)}return}case"exclude":case"include":{let i=r.get(t.block);i&&r.set(i.id,{...i,excluded:t.type==="exclude"});return}case"delete":{let i=r.get(t.block);if(!i)return;let o=new Set([i.id,...U(r,i.id).map(s=>s.id)]);for(let s of r.values())s.source&&o.has(s.source)&&o.add(s.id);for(let s of o)r.delete(s);return}case"restore":return}}function P(r,t){let e=r.get(t);return e?.source?r.get(e.source)??e:e}function L(r,t){let e=[];for(let n of r.values())n.parent===t&&e.push(n);return e.sort((n,i)=>n.order-i.order||(n.id<i.id?-1:n.id>i.id?1:0))}function U(r,t){let e=[],n=[t],i=new Set;for(;n.length;){let o=n.pop();if(!i.has(o)){i.add(o);for(let s of L(r,o))e.push(s),n.push(s.id)}}return e}function G(r,t,e,n){let o=(n?.types[t.type]?.rule??"none")==="any"&&L(r,t.id).some(s=>!s.excluded&&s.done);r.set(t.id,{...t,checked:e,checked_at:e?new Date().toISOString():null,done:e||o})}function W(r,t,e,n){let i=L(r,t).filter(d=>d.id!==n);if(e===null){let d=i[0];return d?d.order/2:1024}let o=i.findIndex(d=>d.id===e),s=i[o];if(!s)return(i.at(-1)?.order??0)+1024;let l=i[o+1];return l?(s.order+l.order)/2:s.order+1024}var J="0123456789abcdefghjkmnpqrstvwxyz";function y(r=Date.now()){let t="",e=r;for(let o=0;o<10;o++)t=J.charAt(e%32)+t,e=Math.floor(e/32);let n=new Uint8Array(16);crypto.getRandomValues(n);let i="";for(let o of n)i+=J.charAt(o%32);return t+i}var _=class{constructor(t,e,n){this.backend=t;this.planId=e;this.options=n}editorId=y();releaseLock=null;stopped=!1;get prefix(){return`plan-block:queue:${this.planId}:`}get ownKey(){return this.prefix+this.editorId}get legacyKey(){return`plan-block:queue:${this.planId}`}start(){this.options.locks?.request(V(this.planId,this.editorId),()=>new Promise(t=>this.releaseLock=t)).catch(()=>{})}stop(){this.stopped=!0,this.releaseLock?.(),this.releaseLock=null}save(t){if(!this.stopped)try{if(t.length){let e={v:2,heartbeat:Date.now(),commands:t};this.backend.setItem(this.ownKey,JSON.stringify(e))}else this.backend.removeItem(this.ownKey)}catch{}}async adoptOrphans(){let t=async()=>{let n=await this.liveEditors(),i=[];for(let o of this.keys()){if(o===this.ownKey)continue;let s=o===this.legacyKey;if(!s&&!o.startsWith(this.prefix))continue;let l=me(this.backend.getItem(o)),d=s?null:o.slice(this.prefix.length);if(!(l&&d!==null&&(n?n.has(V(this.planId,d)):Date.now()-l.heartbeat<this.options.staleMs))){l&&i.push(...l.commands);try{this.backend.removeItem(o)}catch{}}}return i};if(this.stopped)return[];let e=this.options.locks;if(!e)return t();try{return await e.request(`plan-block:adopt:${this.planId}`,t)}catch{return[]}}async liveEditors(){let t=this.options.locks;if(!t)return null;let e=await t.query();return new Set([...e.held??[],...e.pending??[]].map(n=>n.name??""))}keys(){let t=[];try{for(let e=0;e<this.backend.length;e++){let n=this.backend.key(e);n!==null&&t.push(n)}}catch{}return t}};function V(r,t){return`plan-block:editor:${r}:${t}`}function me(r){if(!r)return null;try{let t=JSON.parse(r);if(Array.isArray(t))return{v:2,heartbeat:0,commands:t};if(t&&Array.isArray(t.commands))return t}catch{}return null}function Z(){try{let r=typeof navigator<"u"?navigator.locks:void 0;return r&&typeof r.request=="function"&&typeof r.query=="function"?r:null}catch{return null}}var h=class extends Error{constructor(e){super(e.message);this.error=e;this.name="RejectedError"}},m=class extends Error{constructor(e,n){super(e);this.status=n;this.name="TransportError"}},k=class{constructor(t){this.options=t;this.endpoint=t.endpoint.replace(/\/+$/,""),this.fetchFn=t.fetch??((e,n)=>fetch(e,n))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(t,e){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:t,commands:e})}deleteImpact(t){return this.request("GET",`/plans/${this.options.plan}/blocks/${t}/delete-impact`)}async request(t,e,n){let i={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},o=this.options.csrfToken!==void 0?this.options.csrfToken:be();o&&(i["X-CSRF-TOKEN"]=o);let s=fe();s&&(i["X-Socket-ID"]=s),n!==void 0&&(i["Content-Type"]="application/json");let l;try{l=await this.fetchFn(this.endpoint+e,{method:t,headers:i,credentials:"same-origin",body:n===void 0?void 0:JSON.stringify(n)})}catch(u){throw new m(u instanceof Error?u.message:"Network error")}if(l.ok)return await l.json();let d=await l.json().catch(()=>null);if(l.status===422)throw new h(d?.error??{reason:"invalid_request",message:d?.message??"The request was invalid."});let c={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[l.status];throw c?new h(c):new m(d?.message??`Server error (${l.status})`,l.status)}};function fe(){try{return globalThis.Echo?.socketId?.()??null}catch{return null}}function be(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var E=class extends EventTarget{constructor(e){super();this.options=e;this.storage=e.storage!==void 0?e.storage:ge(),this.retry=e.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;queue=null;queueTimer=null;retry;onOnline=()=>this.retryNow();async load(){let[e,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...e,manifest:n})}hydrate(e){this.plan=e.plan,this.manifest=e.manifest,this.confirmed=new Map(e.blocks.map(n=>[n.id,n])),this.recompute(),this.emit("change"),this.startQueue(),this.pending.length&&this.scheduleFlush()}applyRemote(e){if(!this.plan||this.destroyed||e.plan!==this.plan.id||e.version<=this.plan.version)return"ignored";if(e.previous_version!==this.plan.version||!e.blocks)return this.reload().catch(()=>{}),"reloading";for(let n of e.blocks)this.confirmed.set(n.id,n);for(let n of e.deleted??[])this.confirmed.delete(n);return this.plan={...this.plan,version:e.version},this.recompute(),this.emit("change"),this.emit("remote",{change:e}),"applied"}async reload(){let[e,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=e.plan,this.manifest=n,this.confirmed=new Map(e.blocks.map(i=>[i.id,i])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),this.queueTimer&&clearInterval(this.queueTimer),this.queue?.stop(),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}snapshotCache=null;subscribe(e){return this.addEventListener("change",e),this.addEventListener("sync",e),()=>{this.removeEventListener("change",e),this.removeEventListener("sync",e)}}getSnapshot(){return this.snapshotCache??={plan:this.plan,blocks:this.all(),syncState:this.syncState,pendingCount:this.pendingCount}}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(e){return this.view.get(e)}all(){return[...this.view.values()]}children(e){return L(this.view,e)}resolve(e){return P(this.view,e)}type(e){return this.manifest?.types[e]}create(e,n={}){let i=n.id??y();return this.dispatch("create",i,{type:e,parent:n.parent??null,after:n.after??null,payload:n.payload??{},...n.attachable?{attachable:n.attachable}:{}}),i}link(e,n,i=null){let o=y();return this.dispatch("link",o,{source:e,parent:n,after:i}),o}update(e,n){this.dispatch("update",e,{payload:n})}move(e,n){this.dispatch("move",e,"parent"in n?{parent:n.parent??null,after:n.after}:{after:n.after})}check(e){this.dispatch("check",e)}uncheck(e){this.dispatch("uncheck",e)}setChecked(e,n){this.dispatch(n?"check":"uncheck",e)}checkAll(e){this.dispatch("check_all",e)}uncheckAll(e){this.dispatch("uncheck_all",e)}exclude(e){this.dispatch("exclude",e)}include(e){this.dispatch("include",e)}delete(e){this.dispatch("delete",e)}restore(e){this.dispatch("restore",e)}deleteImpact(e){return this.options.transport.deleteImpact(e)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let e;try{e=await this.options.transport.send(this.version,this.inflight)}catch(n){n instanceof h?this.handleRejection(n.error):this.handleNetworkError(n);return}this.applyResult(e),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(e,n,i){let o={id:y(),type:e,block:n,...i?{args:i}:{}};this.pending.push(o),this.persistQueue(),$(this.view,o,this.manifest),this.emit("change"),this.emit("command",{command:o}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(e){if(e.full)this.confirmed=new Map(e.blocks.map(n=>[n.id,n]));else{for(let n of e.blocks)this.confirmed.set(n.id,n);for(let n of e.deleted)this.confirmed.delete(n)}this.plan&&(this.plan={...this.plan,version:e.version})}handleRejection(e){let n=this.inflight;if(this.inflight=[],e.reason==="unauthenticated"||e.reason==="session_expired"){this.pending=[...n,...this.pending],this.persistQueue(),this.setSync("offline",e.message),this.emit("error",{error:e,command:null});return}let i=n.findIndex(l=>l.id===e.command),o=i>=0?n[i]:void 0,s=o?n.filter(l=>l!==o):[];this.pending=[...s,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:e,command:o??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(e){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",e instanceof m?e.message:String(e));let n=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),n)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let e of[...this.inflight,...this.pending])$(this.view,e,this.manifest)}persistQueue(){this.queue?.save([...this.inflight,...this.pending])}startQueue(){if(!this.storage||!this.plan||this.queue||this.destroyed)return;let e=this.options.persistence??{},n=e.intervalMs??5e3;this.queue=new _(this.storage,this.plan.id,{staleMs:e.staleMs??n*3,locks:e.locks!==void 0?e.locks:Z()}),this.queue.start(),this.adoptOrphans(),this.queueTimer=setInterval(()=>{this.persistQueue(),this.adoptOrphans()},n)}async adoptOrphans(){let e=await this.queue?.adoptOrphans()??[];if(this.destroyed||!e.length)return;let n=new Set([...this.inflight,...this.pending].map(o=>o.id)),i=e.filter(o=>!n.has(o.id));i.length&&(this.pending.push(...i),this.persistQueue(),this.recompute(),this.emit("change"),this.scheduleFlush())}setSync(e,n){this.syncState=e,this.emit("sync",{state:e,pending:this.pendingCount,message:n})}emit(e,n={}){(e==="change"||e==="sync")&&(this.snapshotCache=null),this.dispatchEvent(new CustomEvent(e,{detail:n}))}};function ge(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var S=class{constructor(t,e=3e4){this.wire=t;this.timeoutMs=e}planData=null;async loadPlan(){let{plan:t,blocks:e}=await this.loadPlanData();return{plan:t,blocks:e}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(t,e){let n=await this.call("runCommands",e,t);if(!n.ok)throw new h(n.error);return n}deleteImpact(t){return this.call("deleteImpact",t)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(t,...e){let n=typeof this.wire=="function"?await this.wire():this.wire,i;try{return await Promise.race([n.$call(t,...e),new Promise((o,s)=>{i=setTimeout(()=>s(new m("Livewire request timed out")),this.timeoutMs)})])}catch(o){throw ve(o)}finally{clearTimeout(i)}}};function ve(r){if(r instanceof h||r instanceof m)return r;let t=typeof r=="object"&&r!==null&&"status"in r?r.status:null,n=t!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[t]:void 0;return n?new h(n):new m(t?`Server error (${t})`:r instanceof Error?r.message:"Network error",t??void 0)}function ee(r){return{subscribe(t,e,n,i){let o=u=>n(u),s=r.private(t);s.listen(`.${e}`,o);let l=r.connector?.pusher?.connection,d=l?.state==="connected",p=!1,c=u=>{u.current==="connected"?(d&&p&&i(),d=!0,p=!1):d&&(p=!0)};return l?.bind("state_change",c),()=>{s.stopListening(`.${e}`,o),l?.unbind("state_change",c)}}}}function te(r,t){let e=r.manifest?.realtime;return!e?.enabled||!r.plan?()=>{}:t.subscribe(e.channel_prefix+r.plan.id,e.event,n=>r.applyRemote(n),()=>void r.reload().catch(()=>{}))}function a(r,t={},...e){let n=document.createElement(r);for(let[i,o]of Object.entries(t))o===!1||o===null||o===void 0||(i.startsWith(".")?n[i.slice(1)]=o:n.setAttribute(i,o===!0?"":String(o)));for(let i of e)i==null||i===!1||n.append(i instanceof Node?i:String(i));return n}function R(r,t,e,n){let i=r.type(e);if(!i)return!1;if(t===null)return i.root;let o=r.get(t),s=o?r.type(o.type):void 0;if(!o||!s||n&&(t===n||ye(r,t,n)))return!1;let l=s.children,d=l.allow.includes(e)||l.any_content&&!i.structural,p=i.parents===null||i.parents.includes(o.type);if(!d||!p)return!1;let c=l.max[e];return c===void 0?!0:r.children(t).filter(g=>g.type===e&&g.id!==n).length<c}function ye(r,t,e){let n=r.get(t),i=new Set;for(;n?.parent&&!i.has(n.id);){if(n.parent===e)return!0;i.add(n.id),n=r.get(n.parent)}return!1}var ke=4,B=56,ne=14,H=class{constructor(t){this.host=t}state=null;get dragging(){return this.state?.started??!1}onPointerDown=t=>{if(t.pointerType==="mouse"&&t.button!==0)return;let e=this.host.store,n=t.target?.closest("[data-pb-drag-handle]");if(!n||!e||this.host.readonly||this.state)return;let i=n.closest("[data-pb-key]"),o=i?.dataset.pbId;if(!(!i||!o||!e.get(o))){t.preventDefault();try{n.setPointerCapture?.(t.pointerId)}catch{}this.state={id:o,el:i,pointerId:t.pointerId,startX:t.clientX,startY:t.clientY,x:t.clientX,y:t.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=t=>{let e=this.state;if(!(!e||t.pointerId!==e.pointerId)){if(e.x=t.clientX,e.y=t.clientY,!e.started){if(Math.hypot(e.x-e.startX,e.y-e.startY)<ke)return;this.begin(e)}t.preventDefault(),this.positionGhost(e),this.updateDrop(e)}};onPointerUp=t=>{this.state&&t.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=t=>{t.key==="Escape"&&this.state&&(t.preventDefault(),t.stopPropagation(),this.finish(!1))};begin(t){t.started=!0;let e=t.el.getBoundingClientRect();t.offsetX=t.startX-e.left,t.offsetY=t.startY-e.top;let n=t.el.cloneNode(!0);for(let o of[n,...n.querySelectorAll("*")])for(let s of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])o.removeAttribute(s);n.classList.add("pb-drag-ghost"),n.setAttribute("aria-hidden","true"),n.style.width=`${e.width}px`,t.ghost=n,t.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(n);let i=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(i))};t.frame=requestAnimationFrame(i)}positionGhost(t){t.ghost&&(t.ghost.style.transform=`translate(${t.x-t.offsetX}px, ${t.y-t.offsetY}px)`)}autoScroll(t){let e=window.innerHeight,n=0;t.y<B?n=-ne*(1-t.y/B):t.y>e-B&&(n=ne*(1-(e-t.y)/B)),n!==0&&(window.scrollBy(0,n),this.updateDrop(t))}updateDrop(t){let e=this.findDrop(t);t.drop&&(t.drop.el!==e?.el||t.drop.position!==e?.position)&&delete t.drop.el.dataset.pbDrop,e&&(e.el.dataset.pbDrop=e.position),t.drop=e}findDrop(t){let e=this.host.store,n=e?.get(t.id);if(!e||!n)return null;let i=this.host.root,o=(i instanceof ShadowRoot?i:document).elementFromPoint(t.x,t.y);if(!o||(i instanceof ShadowRoot,!i.contains(o)))return null;let s=o.closest("[data-pb-key]");for(;s;){if(s===t.el||t.el.contains(s))return null;let l=s.dataset.pbId,d=e.get(l);if(!d)return null;if(R(e,d.parent,n.type,n.id)){let c=s.getBoundingClientRect(),u=t.y<c.top+c.height/2?"before":"after";return{el:s,position:u,parent:d.parent,after:this.afterFor(d.parent,l,u,n.id)}}let p=e.resolve(l)??d;if(R(e,p.id,n.type,n.id)){let c=e.children(p.id).filter(u=>u.id!==n.id).at(-1);return{el:s,position:"inside",parent:p.id,after:c?.id??null}}s=s.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(t,e,n,i){if(n==="after")return e;let o=this.host.store.children(t).filter(l=>l.id!==i),s=o.findIndex(l=>l.id===e);return s>0?o[s-1].id:null}finish(t){let e=this.state;if(!e||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(e.frame),e.ghost?.remove(),delete e.el.dataset.pbDragging,e.drop&&delete e.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!t||!e.started||!e.drop))return;let n=this.host.store?.get(e.id);if(!n)return;let{parent:i,after:o}=e.drop,s=this.host.store.children(n.parent),l=s[s.findIndex(d=>d.id===n.id)-1]?.id??null;(i!==n.parent||o!==l)&&this.host.move(n.id,i,o)}};var T={addDay:"+ Day",addPool:"+ Pool",add:r=>`+ ${r}`,newItem:r=>`New ${r.toLowerCase()}`,day:r=>`Day ${r}`,pool:"Pool",checkAll:"Check all items",markDone:r=>`Mark "${r}" done`,progress:(r,t)=>`${r}/${t}`,poolProgress:(r,t)=>`${r} of ${t} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip (do not count)",include:"Count again",addToDay:"Add to day\u2026",linked:"linked",doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day or a pool to start.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:r=>`This also appears in ${r}. Delete it everywhere?`};var ie=new Map;function F(r,t){ie.set(r,t)}function oe(r){return ie.get(r)??Me[r]??xe}function we(r){return r?.fields.find(t=>t.type==="text")??r?.fields.find(t=>t.type==="textarea")}function N(r){let t=we(r.type),e=t?r.target.payload[t.name]:void 0;return typeof e=="string"&&e!==""?e:r.type?.label??r.target.type}function x(r,t){let e=t??N(r);return r.readonly?a("span",{class:"pb-title"},e):a("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:r.labels.edit},e)}function b(r,t,e,n={}){return a("button",{type:"button",class:`pb-button pb-button--ghost${r==="delete"?" pb-button--danger":""}`,"data-pb-action":r,"aria-label":t,title:t,...n},a("span",{"aria-hidden":"true"},e))}function A(r,t={}){if(r.readonly)return null;let{labels:e,block:n,store:i}=r,o=i.children(null).filter(l=>l.type==="timeline"),s=n.parent?i.get(n.parent):void 0;return a("div",{class:"pb-actions"},t.linkable&&s?.type==="pool"&&o.length>0?a("select",{class:"pb-select","data-pb-action":"link","aria-label":e.addToDay},a("option",{value:""},e.addToDay),...o.map(l=>a("option",{value:l.id},z(i,l,e)))):null,b("move-up",e.moveUp,"\u2191"),b("move-down",e.moveDown,"\u2193"),r.type?.root?null:b(n.excluded?"include":"exclude",n.excluded?e.include:e.exclude,n.excluded?"\u21BA":"\u2298"),b("delete",e.delete,"\u2715"))}function O(r,t){if(r.readonly)return null;let e=t.filter(n=>Ee(r,n)).map(n=>a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":n,"data-pb-parent":r.target.id},r.labels.add(r.store.type(n)?.label??n)));return e.length?a("div",{class:"pb-footer"},...e):null}function Ee(r,t){return R(r.store,r.target.id,t)}function M(r){return r.readonly||r.editing?null:a("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":r.labels.dragHandle,title:r.labels.dragHandle},a("span",{"aria-hidden":"true"},"\u283F"))}function j(r){return r.type?.checkable?a("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":r.target.checked,"aria-label":r.labels.markDone(N(r)),disabled:r.readonly}):null}function D(r){return r.isLink?a("span",{class:"pb-badge",title:r.labels.linked},`\u2197 ${r.labels.linked}`):null}function C(r){let{labels:t,target:e}=r;return a("form",{class:"pb-form","data-pb-form":""},...(r.type?.fields??[]).map(n=>se(n,e.payload[n.name])),a("div",{class:"pb-actions"},a("button",{type:"submit",class:"pb-button pb-button--primary"},t.save),a("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},t.cancel)))}function se(r,t){let e={name:r.name,class:"pb-input",required:r.required,"data-pb-field":r.type},n=t==null?"":String(t),i;switch(r.type){case"textarea":i=a("textarea",{...e,rows:3,maxlength:r.max},n);break;case"select":i=a("select",e,r.required?null:a("option",{value:""},"\u2014"),...(r.options??[]).map(o=>a("option",{value:String(o.value),selected:String(o.value)===n},o.label)));break;case"toggle":i=a("input",{name:r.name,type:"checkbox","data-pb-field":"toggle",".checked":t===!0||t===1||t==="1"});break;case"number":i=a("input",{...e,type:"number",step:"any",min:r.min,max:r.max,value:n});break;default:i=a("input",{...e,type:r.type==="text"?"text":r.type,maxlength:r.type==="text"||r.type==="url"?r.max:void 0,value:n})}return a("label",{class:"pb-field"},r.label,i)}function z(r,t,e){let n=typeof t.payload.label=="string"&&t.payload.label!==""?` \xB7 ${t.payload.label}`:"",i=t.day?.number??r.children(null).filter(o=>o.type==="timeline").indexOf(t)+1;return e.day(i)+n}function ae(r){if(!r)return null;let t=new Date(`${r}T00:00:00`);return Number.isNaN(t.getTime())?r:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(t)}var I={title:x,titleOf:N,iconButton:b,itemActions:A,addButtons:O,dragHandle:M,checkbox:j,linkBadge:D,editForm:C,fieldInput:se,dayTitle:z,formatDate:ae},Se=r=>{let{target:t,labels:e,store:n}=r,i=t.progress??{state:"none",done:0,total:0},o=ae(t.day?.date??null);return a("section",{class:"pb-group pb-day"},a("header",{class:"pb-group__header"},M(r),a("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":i.state==="all",".indeterminate":i.state==="some","aria-label":e.checkAll,disabled:r.readonly||i.total===0}),a("div",{class:"pb-group__title"},r.editing?null:x(r,z(n,t,e)),o?a("span",{class:"pb-muted"},o):null,D(r)),a("span",{class:"pb-progress","data-state":i.state},e.progress(i.done,i.total)),r.readonly?null:a("div",{class:"pb-actions"},b("move-up",e.moveUp,"\u2191"),b("move-down",e.moveDown,"\u2193"),b("delete",e.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},C(r)):null,r.children,O(r,["place","note",...le(r)]))},Le=r=>{let{target:t,labels:e}=r,n=t.progress??{state:"none",done:0,total:0},i=typeof t.payload.label=="string"&&t.payload.label!==""?t.payload.label:e.pool;return a("section",{class:"pb-group pb-pool"},a("header",{class:"pb-group__header"},M(r),a("div",{class:"pb-group__title"},r.editing?null:x(r,i),D(r)),a("span",{class:"pb-progress"},e.poolProgress(n.done,n.total)),r.readonly?null:a("div",{class:"pb-actions"},b("move-up",e.moveUp,"\u2191"),b("move-down",e.moveDown,"\u2193"),b("delete",e.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},C(r)):null,r.children,O(r,["place","note",...le(r)]))},re=r=>{let{target:t,labels:e}=r,n=typeof t.payload.time=="string"?t.payload.time:null,i=typeof t.payload.maps_url=="string"?t.payload.maps_url:null,o=typeof t.payload.notes=="string"?t.payload.notes:null;return a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),j(r),a("div",{class:"pb-item__main"},r.editing?C(r):a("div",{},x(r)," ",D(r),t.done&&!t.checked?a("span",{class:"pb-badge pb-badge--done"},e.doneViaBackup):null,n||i?a("div",{class:"pb-meta"},n?a("span",{},n):null,i?a("a",{href:i,target:"_blank",rel:"noopener noreferrer"},e.openMap):null):null,o?a("div",{class:"pb-notes"},o):null)),r.editing?null:A(r,{linkable:!0})),r.children,r.editing||r.isLink?null:O(r,["backup","note"]))},Te=r=>a("div",{class:"pb-item pb-note-item"},a("div",{class:"pb-item__row"},M(r),a("div",{class:"pb-item__main"},r.editing?C(r):a("div",{class:"pb-note"},x(r))),r.editing?null:A(r))),xe=r=>a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),j(r),a("div",{class:"pb-item__main"},r.editing?C(r):a("div",{},x(r)," ",D(r))),r.editing?null:A(r,{linkable:!0})),r.children);function le(r){let t=["timeline","pool","link","place","backup","note"];return Object.keys(r.store.manifest?.types??{}).filter(e=>!t.includes(e))}var Me={timeline:Se,pool:Le,place:re,backup:re,note:Te};var K=`/*
 * Plan Block default styles. Everything sits in its own cascade layer and
 * uses .pb- classes, so host styles win where they overlap and Tailwind or
 * Bootstrap resets do not need to be fought. Theme with --pb-* variables.
 */
@layer plan-block {
  plan-block,
  :host {
    --pb-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --pb-text: #1f2328;
    --pb-muted: #656d76;
    --pb-bg: #ffffff;
    --pb-surface: #f6f8fa;
    --pb-border: #d0d7de;
    --pb-accent: #0969da;
    --pb-done: #1a7f37;
    --pb-danger: #cf222e;
    --pb-radius: 8px;
    --pb-gap: 0.5rem;

    display: block;
    font-family: var(--pb-font);
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--pb-text);
  }

  .pb-root,
  .pb-root * {
    box-sizing: border-box;
  }

  .pb-toolbar,
  .pb-footer,
  .pb-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: calc(var(--pb-gap) / 2);
  }

  .pb-toolbar {
    margin-bottom: var(--pb-gap);
  }

  .pb-list {
    display: grid;
    gap: calc(var(--pb-gap) * 1.5);
  }

  .pb-button {
    appearance: none;
    border: 1px solid var(--pb-border);
    background: var(--pb-bg);
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1;
    padding: 0.4rem 0.6rem;
    border-radius: calc(var(--pb-radius) - 2px);
    cursor: pointer;
    min-height: 2rem;
  }

  .pb-button:hover {
    border-color: var(--pb-accent);
  }

  .pb-button:focus-visible,
  .pb-check:focus-visible,
  .pb-title:focus-visible,
  .pb-select:focus-visible {
    outline: 2px solid var(--pb-accent);
    outline-offset: 1px;
  }

  .pb-button--primary {
    background: var(--pb-accent);
    border-color: var(--pb-accent);
    color: #fff;
  }

  .pb-button--ghost {
    border-color: transparent;
    background: transparent;
    color: var(--pb-muted);
    min-width: 2rem;
  }

  .pb-button--ghost:hover {
    color: var(--pb-text);
    background: var(--pb-surface);
  }

  .pb-button--danger:hover {
    color: var(--pb-danger);
  }

  .pb-group {
    border: 1px solid var(--pb-border);
    border-radius: var(--pb-radius);
    background: var(--pb-bg);
    overflow: hidden;
  }

  .pb-group__header {
    display: flex;
    align-items: center;
    gap: var(--pb-gap);
    padding: 0.6rem 0.75rem;
    background: var(--pb-surface);
    border-bottom: 1px solid var(--pb-border);
  }

  .pb-group__title {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.5rem;
  }

  .pb-group > .pb-children {
    padding: 0.25rem 0.75rem;
  }

  .pb-group > .pb-footer {
    padding: 0.5rem 0.75rem 0.75rem;
  }

  .pb-children:empty {
    display: none;
  }

  .pb-progress {
    font-size: 0.8125rem;
    color: var(--pb-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .pb-progress[data-state='all'] {
    color: var(--pb-done);
    font-weight: 600;
  }

  .pb-muted {
    color: var(--pb-muted);
    font-size: 0.8125rem;
  }

  .pb-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--pb-surface);
  }

  .pb-item:last-child {
    border-bottom: 0;
  }

  .pb-item__row {
    display: flex;
    align-items: flex-start;
    gap: var(--pb-gap);
  }

  .pb-item__main {
    flex: 1;
    min-width: 0;
  }

  .pb-item > .pb-children {
    margin: 0.25rem 0 0 1.75rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--pb-surface);
  }

  .pb-item > .pb-footer {
    margin: 0.25rem 0 0 1.75rem;
  }

  /* With a mouse, an item's add buttons appear on hover or keyboard focus.
     Touch devices cannot hover, so they always see them. */
  @media (hover: hover) {
    .pb-item > .pb-footer {
      height: 0;
      margin-top: 0;
      overflow: hidden;
      opacity: 0;
    }

    .pb-item:hover > .pb-footer,
    .pb-item:focus-within > .pb-footer {
      height: auto;
      margin-top: 0.25rem;
      overflow: visible;
      opacity: 1;
    }
  }

  .pb-check {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0.15rem 0 0;
    accent-color: var(--pb-done);
    cursor: pointer;
    flex: none;
  }

  .pb-title {
    all: unset;
    cursor: text;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  [data-pb-done] > .pb-item__row .pb-title {
    color: var(--pb-muted);
  }

  [data-pb-checked] > .pb-item__row .pb-title {
    text-decoration: line-through;
  }

  [data-pb-excluded] > .pb-item__row .pb-item__main {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .pb-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.75rem;
    font-size: 0.8125rem;
    color: var(--pb-muted);
  }

  .pb-meta a {
    color: var(--pb-accent);
  }

  .pb-badge {
    display: inline-block;
    font-size: 0.6875rem;
    line-height: 1;
    padding: 0.2rem 0.4rem;
    border-radius: 999px;
    background: var(--pb-surface);
    color: var(--pb-muted);
    border: 1px solid var(--pb-border);
    vertical-align: middle;
  }

  .pb-badge--done {
    color: var(--pb-done);
    border-color: currentColor;
  }

  .pb-note {
    padding: 0.35rem 0;
    font-size: 0.875rem;
    color: var(--pb-muted);
    white-space: pre-wrap;
  }

  .pb-notes {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--pb-muted);
    white-space: pre-wrap;
  }

  .pb-select {
    font: inherit;
    font-size: 0.8125rem;
    border: 1px solid var(--pb-border);
    border-radius: calc(var(--pb-radius) - 2px);
    background: var(--pb-bg);
    color: inherit;
    padding: 0.3rem;
    min-height: 2rem;
    max-width: 10rem;
  }

  .pb-form {
    display: grid;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .pb-field {
    display: grid;
    gap: 0.2rem;
    font-size: 0.8125rem;
    color: var(--pb-muted);
  }

  .pb-input {
    font: inherit;
    color: var(--pb-text);
    border: 1px solid var(--pb-border);
    border-radius: calc(var(--pb-radius) - 2px);
    padding: 0.4rem 0.5rem;
    background: var(--pb-bg);
    width: 100%;
  }

  .pb-input:focus {
    outline: 2px solid var(--pb-accent);
    outline-offset: -1px;
  }

  .pb-empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--pb-muted);
    border: 1px dashed var(--pb-border);
    border-radius: var(--pb-radius);
  }

  .pb-status {
    min-height: 1.25rem;
    margin-top: var(--pb-gap);
    font-size: 0.8125rem;
    color: var(--pb-muted);
  }

  .pb-status[data-state='offline'] {
    color: var(--pb-danger);
  }

  .pb-toast {
    position: sticky;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--pb-gap);
    margin-top: var(--pb-gap);
    padding: 0.6rem 0.75rem;
    border-radius: var(--pb-radius);
    background: var(--pb-text);
    color: var(--pb-bg);
    font-size: 0.875rem;
  }

  .pb-toast[data-kind='error'] {
    background: var(--pb-danger);
  }

  .pb-toast .pb-button {
    background: transparent;
    color: inherit;
    border-color: currentColor;
  }

  /* ---- Drag and drop ---------------------------------------------------- */

  .pb-drag-handle {
    appearance: none;
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    min-height: 1.75rem;
    margin: -0.15rem -0.25rem 0 -0.4rem;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--pb-muted);
    font: inherit;
    font-size: 1rem;
    line-height: 1;
    cursor: grab;
    opacity: 0.55;
    /* Let pointer events (not scrolling) handle touches on the handle. */
    touch-action: none;
    user-select: none;
  }

  .pb-drag-handle:hover,
  .pb-drag-handle:focus-visible {
    opacity: 1;
    background: var(--pb-surface);
  }

  .pb-drag-handle:focus-visible {
    outline: 2px solid var(--pb-accent);
    outline-offset: 1px;
  }

  .pb-root--dragging,
  .pb-root--dragging * {
    cursor: grabbing !important;
    user-select: none;
  }

  [data-pb-dragging] {
    opacity: 0.35;
  }

  .pb-drag-ghost {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 2147483647;
    pointer-events: none;
    margin: 0;
    background: var(--pb-bg);
    border: 1px solid var(--pb-border);
    border-radius: var(--pb-radius);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);
    opacity: 0.95;
    padding: 0.25rem 0.75rem;
    font-family: var(--pb-font);
    color: var(--pb-text);
  }

  [data-pb-drop='before'] {
    box-shadow: inset 0 3px 0 var(--pb-accent);
  }

  [data-pb-drop='after'] {
    box-shadow: inset 0 -3px 0 var(--pb-accent);
  }

  [data-pb-drop='inside'] {
    outline: 2px dashed var(--pb-accent);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    .pb-drag-ghost {
      transition: box-shadow 120ms;
    }
  }

  .pb-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (max-width: 480px) {
    .pb-item__row {
      flex-wrap: wrap;
    }

    .pb-item__row > .pb-actions {
      width: 100%;
      padding-left: 1.75rem;
    }
  }
}
`;var de=!1,w=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly"];_store=null;ownsStore=!1;_labels=T;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new H(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;get store(){return this._store}set store(t){this.detachStore(),this._store=t,this.ownsStore=!1,t&&(this.attachStore(t),this.state=t.plan?"ready":"idle",this.scheduleRender())}realtime=void 0;stopRealtime=null;get labels(){return this._labels}set labels(t){this._labels={...T,...t},this.cache.clear(),this.scheduleRender()}get isReadOnly(){return this.hasAttribute("readonly")}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():(this.scheduleRender(),this._store?.plan&&this.connectRealtime())}disconnectedCallback(){this.disconnectRealtime(),window.removeEventListener("plan-block-refresh",this.onRefresh),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(t,e,n){e===n||!this.isConnected||((t==="plan"||t==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(this.cache.clear(),this.scheduleRender()))}async boot(){let t=this.getAttribute("plan");t&&await this.useStore(new E({transport:this.createTransport(t)}),{initial:this.readInitialData()??void 0,owned:!0})}async useStore(t,e={}){if(this._store&&this._store!==t&&this.ownsStore&&this._store.destroy(),this.detachStore(),this._store=t,this.ownsStore=e.owned??!1,this.attachStore(t),e.initial){t.hydrate(e.initial),this.state="ready",this.render(),this.connectRealtime(),this.emit("ready",{plan:t.plan});return}if(t.plan){this.state="ready",this.render(),this.connectRealtime();return}this.state="loading",this.render();try{if(await t.load(),this._store!==t)return;this.state="ready",this.connectRealtime(),this.emit("ready",{plan:t.plan})}catch(n){if(this._store!==t)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:n instanceof Error?n.message:String(n)}})}this.render()}createTransport(t){if(this.getAttribute("transport")==="livewire"){let e=this.parentElement;for(;e&&!e.hasAttribute("wire:id");)e=e.parentElement;let n=e?.getAttribute("wire:id")??"";return new S(()=>Re(n))}return new k({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:t})}onRefresh=t=>{let e=t.detail,n=Array.isArray(e)?e[0]?.plan:e?.plan;this._store?.plan&&(!n||n===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let t=ce(this,"script[data-pb-initial]")[0];if(!t?.textContent)return null;try{return JSON.parse(t.textContent)}catch{return null}finally{t.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=t=>{let{command:e}=t.detail;this.emit(e.type.replace(/_/g,"-"),{id:e.block,command:e})};onError=t=>{let{error:e}=t.detail;this.showToast({message:e.message,kind:"error"}),this.emit("error",t.detail)};onSync=t=>{this.emit("sync",t.detail),this.scheduleRender()};attachStore(t){t.addEventListener("change",this.onChange),t.addEventListener("command",this.onCommand),t.addEventListener("error",this.onError),t.addEventListener("sync",this.onSync)}connectRealtime(){this.disconnectRealtime();let t=this._store;if(!t?.plan||this.realtime===null||this.getAttribute("realtime")==="off"||!this.isConnected)return;let e=globalThis.Echo,n=this.realtime!==void 0?this.realtime:e?ee(e):null;n&&(this.stopRealtime=te(t,n))}disconnectRealtime(){this.stopRealtime?.(),this.stopRealtime=null}detachStore(){this.disconnectRealtime();let t=this._store;t&&(t.removeEventListener("change",this.onChange),t.removeEventListener("command",this.onCommand),t.removeEventListener("error",this.onError),t.removeEventListener("sync",this.onSync),this.cache.clear())}adoptStyles(){let t=this.root instanceof ShadowRoot?this.root:document;if(!(t===document&&de)){try{let e=new CSSStyleSheet;e.replaceSync(K),t.adoptedStyleSheets=[...t.adoptedStyleSheets,e]}catch{let e=a("style",{"data-plan-block":""},K);t===document?document.head.append(e):t.prepend(e)}t===document&&(de=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let c of ce(this,"[data-pb-fallback]"))c.remove();this.container=a("div",{class:"pb-root"}),this.root.append(this.container)}let t=this._store,e=this._labels;if(!t||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(a("div",{class:"pb-empty"},e.loading));return}if(this.state==="failed"||!t.plan){this.container.replaceChildren(a("div",{class:"pb-empty",role:"alert"},e.loadFailed));return}let n=this.captureFocus(),i=new Set,o=t.children(null).map(c=>this.renderBlock(c,"",i,0));for(let c of this.cache.keys())i.has(c)||this.cache.delete(c);let s=this.ensure("list",()=>a("div",{class:"pb-list"}));Q(s,o.length?o:[a("div",{class:"pb-empty"},e.empty)]);let l=this.isReadOnly?null:this.ensure("toolbar",()=>a("div",{class:"pb-toolbar"},a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},e.addDay),a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},e.addPool))),d=a("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":t.syncState},t.syncState==="saving"?e.saving:t.syncState==="offline"?e.offline:""),p=this.toast?a("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},a("span",{},this.toast.message),a("div",{class:"pb-actions"},this.toast.action?a("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,a("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},e.dismiss))):null;Q(this.container,[l,s,d,p].filter(c=>c!==null)),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${Y(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(n)}captureFocus(){let t=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!t||!this.container?.contains(t))return null;let e=t.closest("[data-pb-key]")?.dataset.pbKey;if(!e)return null;let n=t.dataset?.pbAction,i=t.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":n?`[data-pb-action="${Y(n)}"]`:null;return i?{key:e,selector:i,el:t}:null}restoreFocus(t){if(!t||(this.root instanceof ShadowRoot?this.root:document).activeElement===t.el)return;if(t.el.isConnected){t.el.focus();return}let n=this.root.querySelector(`[data-pb-key="${Y(t.key)}"]`);[...n?.querySelectorAll(t.selector)??[]].find(o=>o.closest("[data-pb-key]")===n)?.focus()}persistent=new Map;ensure(t,e){let n=this.persistent.get(t);return n||(n=e(),this.persistent.set(t,n)),n}renderBlock(t,e,n,i){let o=this._store,s=e+t.id,l=t.type==="link",d=(l?o.resolve(t.id):t)??t,p=o.type(d.type),c=this.editingKey===s;n.add(s);let u=JSON.stringify([t,l?d:null,c,this.isReadOnly,t.parent?o.children(t.parent).length:0,o.children(d.id).map(f=>f.type).join(),o.children(null).filter(f=>f.type==="timeline").map(f=>f.id+(f.payload.label??"")).join()]),g=this.cache.get(s);if(!g||g.signature!==u){let f=g?.children??a("div",{class:"pb-children","data-pb-children":""}),he={block:t,target:d,type:p,isLink:l,children:f,editing:c,readonly:this.isReadOnly,store:o,labels:this._labels,h:a,parts:I},v=oe(d.type)(he);v.classList.add("pb-block"),v.dataset.pbId=t.id,v.dataset.pbKey=s,v.dataset.pbType=d.type,q(v,"pbLink",l),q(v,"pbChecked",d.checked),q(v,"pbDone",d.done),q(v,"pbExcluded",t.excluded),g={signature:u,el:v,children:f},this.cache.set(s,g)}let pe=l?`${s}>`:e,ue=i>20?[]:o.children(d.id).map(f=>this.renderBlock(f,pe,n,i+1));return Q(g.children,ue),g.el}dragHost(){let t=this;return{get root(){return t.root},get container(){return t.container},get store(){return t._store},get readonly(){return t.isReadOnly},move:(e,n,i)=>t._store?.move(e,{parent:n,after:i})}}listen(){this.listening=!0,this.root.addEventListener("click",t=>this.onClick(t)),this.root.addEventListener("change",t=>this.onInputChange(t)),this.root.addEventListener("submit",t=>this.onSubmit(t)),this.root.addEventListener("pointerdown",t=>this.drag.onPointerDown(t)),this.root.addEventListener("keydown",t=>{let e=t.key;if(e==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let i=t.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(e==="ArrowUp"||e==="ArrowDown")&&i?.dataset.pbId&&!this.isReadOnly&&(t.preventDefault(),this.shift(i.dataset.pbId,e==="ArrowUp"?-1:1))})}actionTarget(t){let e=t.target?.closest("[data-pb-action]");if(!e||!this.root.contains(e))return null;let n=e.closest("[data-pb-key]");return{action:e.dataset.pbAction,el:e,id:n?.dataset.pbId??null,key:n?.dataset.pbKey??null}}onClick(t){let e=this.actionTarget(t),n=this._store;if(!e||!n)return;let{action:i,el:o,id:s,key:l}=e;if(!(i==="toggle-check"||i==="check-all"||i==="link")){switch(i){case"add":return this.add(o.dataset.pbType,o.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return n.restore(o.dataset.pbTarget??s),this.showToast(null)}if(s)switch(i){case"check":return n.check(s);case"uncheck":return n.uncheck(s);case"exclude":return n.exclude(s);case"include":return n.include(s);case"move-up":case"move-down":return this.shift(s,i==="move-up"?-1:1);case"delete":this.confirmDelete(s);return}}}onInputChange(t){let e=this.actionTarget(t),n=this._store;if(!e?.id||!n)return;let i=e.el;if(e.action==="toggle-check")n.setChecked(e.id,i.checked);else if(e.action==="check-all")i.checked?n.checkAll(e.id):n.uncheckAll(e.id);else if(e.action==="link"){let o=e.el.value;o&&(n.link(e.id,o,n.children(o).at(-1)?.id??null),e.el.value="")}}onSubmit(t){let e=t.target?.closest("[data-pb-form]");if(!e||!this._store)return;t.preventDefault();let n=e.closest("[data-pb-key]"),i=n?.dataset.pbId?this._store.resolve(n.dataset.pbId):void 0,o=i?this._store.type(i.type):void 0;if(!i||!o)return;let s={};for(let l of o.fields){let d=Pe(e,l),p=i.payload[l.name]??null;d!==p&&(s[l.name]=d)}Object.keys(s).length&&this._store.update(i.id,s),this.editingKey=null,this.scheduleRender()}add(t,e,n){let i=this._store,o=i.type(t),s=o?.fields.find(c=>c.type==="text"||c.type==="textarea"),l=s?.required?{[s.name]:this._labels.newItem(o?.label??t)}:{},d=i.children(e).at(-1)?.id??null,p=i.create(t,{parent:e,after:d,payload:l});if(s){let c=n?this.cache.get(n):void 0,u=n&&e&&c?.el.dataset.pbLink!==void 0?`${n}>`:n&&e?n.slice(0,-e.length):"";this.editingKey=u+p,this.focusEditor=!0}}shift(t,e){let n=this._store,i=n.get(t);if(!i)return;let o=n.children(i.parent),s=o.findIndex(l=>l.id===t);e===-1&&s>0?n.move(t,{after:s>=2?o[s-2].id:null}):e===1&&s<o.length-1&&n.move(t,{after:o[s+1].id})}async confirmDelete(t){let e=this._store,n=[];try{let i=await e.deleteImpact(t);n=[...new Set(i.links.map(o=>o.day?this._labels.day(o.day.number):this._labels.pool))]}catch{}n.length&&!window.confirm(this._labels.confirmDeleteLinked(n.join(", ")))||(e.delete(t),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:t}}))}showToast(t){this.toast=t,this.toastTimer&&clearTimeout(this.toastTimer),t&&(this.toastTimer=setTimeout(()=>this.showToast(null),t.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(t,e){this.dispatchEvent(new CustomEvent(`plan-block:${t}`,{detail:e,bubbles:!0,composed:!0}))}};function Pe(r,t){let e=r.elements.namedItem(t.name);if(!e)return null;if(t.type==="toggle")return e.checked;let n=e.value.trim();return n===""?null:t.type==="number"?Number(n):n}function Q(r,t){let e=r.children;e.length===t.length&&t.every((n,i)=>e[i]===n)||r.replaceChildren(...t)}function Re(r,t=1e4){let e=()=>window.Livewire?.find(r);return new Promise((n,i)=>{let o=e();if(o)return n(o);let s=Date.now(),l=()=>{let c=e();c?(p(),n(c)):Date.now()-s>t&&(p(),i(new Error(`Livewire component ${r||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),p=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function ce(r,t){return Array.from(r.children).filter(e=>e.matches(t))}function q(r,t,e){e?r.dataset[t]="":delete r.dataset[t]}function Y(r){return r.replace(/["\\]/g,"\\$&")}function X(r="plan-block"){typeof customElements<"u"&&!customElements.get(r)&&customElements.define(r,r==="plan-block"?w:class extends w{})}X();var De={PlanStore:E,HttpTransport:k,LivewireTransport:S,RejectedError:h,TransportError:m,PlanBlockElement:w,renderer:F,parts:I,h:a,defaultLabels:T,defineElement:X,ulid:y};window.PlanBlock=De;})();
