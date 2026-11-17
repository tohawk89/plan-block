"use strict";(()=>{function $(r,e,t){let n=e.args??{};switch(e.type){case"create":case"link":{if(r.has(e.block))return;let i=n.parent??null,o=e.type==="link"?"link":String(n.type),s=t?.types[o],l={};for(let d of s?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);r.set(e.block,{id:e.block,type:o,parent:i,order:W(r,i,n.after??null,null),source:e.type==="link"?n.source??null:null,attachable:n.attachable??null,payload:{...l,...n.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:s&&(s.rule==="all"||s.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let i=r.get(e.block);if(!i)return;r.set(i.id,{...i,payload:{...i.payload,...n.payload??{}}});return}case"move":{let i=r.get(e.block);if(!i)return;let o="parent"in n?n.parent??null:i.parent;r.set(i.id,{...i,parent:o,order:W(r,o,n.after??null,i.id)});return}case"check":case"uncheck":{let i=C(r,e.block);i&&G(r,i,e.type==="check",t);return}case"check_all":case"uncheck_all":{let i=C(r,e.block);if(!i)return;let o=e.type==="check_all";for(let s of T(r,i.id)){if(s.excluded)continue;let l=C(r,s.id);if(!l)continue;let d=o?[l]:[...X(r,l.id).reverse(),l];for(let c of d)c.type!=="link"&&t?.types[c.type]?.checkable&&G(r,c,o,t)}return}case"exclude":case"include":{let i=r.get(e.block);i&&r.set(i.id,{...i,excluded:e.type==="exclude"});return}case"delete":{let i=r.get(e.block);if(!i)return;let o=new Set([i.id,...X(r,i.id).map(s=>s.id)]);for(let s of r.values())s.source&&o.has(s.source)&&o.add(s.id);for(let s of o)r.delete(s);return}case"restore":return}}function C(r,e){let t=r.get(e);return t?.source?r.get(t.source)??t:t}function T(r,e){let t=[];for(let n of r.values())n.parent===e&&t.push(n);return t.sort((n,i)=>n.order-i.order||(n.id<i.id?-1:n.id>i.id?1:0))}function X(r,e){let t=[],n=[e],i=new Set;for(;n.length;){let o=n.pop();if(!i.has(o)){i.add(o);for(let s of T(r,o))t.push(s),n.push(s.id)}}return t}function G(r,e,t,n){let o=(n?.types[e.type]?.rule??"none")==="any"&&T(r,e.id).some(s=>!s.excluded&&s.done);r.set(e.id,{...e,checked:t,checked_at:t?new Date().toISOString():null,done:t||o})}function W(r,e,t,n){let i=T(r,e).filter(d=>d.id!==n);if(t===null){let d=i[0];return d?d.order/2:1024}let o=i.findIndex(d=>d.id===t),s=i[o];if(!s)return(i.at(-1)?.order??0)+1024;let l=i[o+1];return l?(s.order+l.order)/2:s.order+1024}var J="0123456789abcdefghjkmnpqrstvwxyz";function v(r=Date.now()){let e="",t=r;for(let o=0;o<10;o++)e=J.charAt(t%32)+e,t=Math.floor(t/32);let n=new Uint8Array(16);crypto.getRandomValues(n);let i="";for(let o of n)i+=J.charAt(o%32);return e+i}var R=class{constructor(e,t,n){this.backend=e;this.planId=t;this.options=n}editorId=v();releaseLock=null;stopped=!1;get prefix(){return`plan-block:queue:${this.planId}:`}get ownKey(){return this.prefix+this.editorId}get legacyKey(){return`plan-block:queue:${this.planId}`}start(){this.options.locks?.request(V(this.planId,this.editorId),()=>new Promise(e=>this.releaseLock=e)).catch(()=>{})}stop(){this.stopped=!0,this.releaseLock?.(),this.releaseLock=null}save(e){if(!this.stopped)try{if(e.length){let t={v:2,heartbeat:Date.now(),commands:e};this.backend.setItem(this.ownKey,JSON.stringify(t))}else this.backend.removeItem(this.ownKey)}catch{}}async adoptOrphans(){let e=async()=>{let n=await this.liveEditors(),i=[];for(let o of this.keys()){if(o===this.ownKey)continue;let s=o===this.legacyKey;if(!s&&!o.startsWith(this.prefix))continue;let l=ue(this.backend.getItem(o)),d=s?null:o.slice(this.prefix.length);if(!(l&&d!==null&&(n?n.has(V(this.planId,d)):Date.now()-l.heartbeat<this.options.staleMs))){l&&i.push(...l.commands);try{this.backend.removeItem(o)}catch{}}}return i};if(this.stopped)return[];let t=this.options.locks;if(!t)return e();try{return await t.request(`plan-block:adopt:${this.planId}`,e)}catch{return[]}}async liveEditors(){let e=this.options.locks;if(!e)return null;let t=await e.query();return new Set([...t.held??[],...t.pending??[]].map(n=>n.name??""))}keys(){let e=[];try{for(let t=0;t<this.backend.length;t++){let n=this.backend.key(t);n!==null&&e.push(n)}}catch{}return e}};function V(r,e){return`plan-block:editor:${r}:${e}`}function ue(r){if(!r)return null;try{let e=JSON.parse(r);if(Array.isArray(e))return{v:2,heartbeat:0,commands:e};if(e&&Array.isArray(e.commands))return e}catch{}return null}function Z(){try{let r=typeof navigator<"u"?navigator.locks:void 0;return r&&typeof r.request=="function"&&typeof r.query=="function"?r:null}catch{return null}}var u=class extends Error{constructor(t){super(t.message);this.error=t;this.name="RejectedError"}},h=class extends Error{constructor(t,n){super(t);this.status=n;this.name="TransportError"}},k=class{constructor(e){this.options=e;this.endpoint=e.endpoint.replace(/\/+$/,""),this.fetchFn=e.fetch??((t,n)=>fetch(t,n))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(e,t){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:e,commands:t})}deleteImpact(e){return this.request("GET",`/plans/${this.options.plan}/blocks/${e}/delete-impact`)}async request(e,t,n){let i={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},o=this.options.csrfToken!==void 0?this.options.csrfToken:he();o&&(i["X-CSRF-TOKEN"]=o),n!==void 0&&(i["Content-Type"]="application/json");let s;try{s=await this.fetchFn(this.endpoint+t,{method:e,headers:i,credentials:"same-origin",body:n===void 0?void 0:JSON.stringify(n)})}catch(p){throw new h(p instanceof Error?p.message:"Network error")}if(s.ok)return await s.json();let l=await s.json().catch(()=>null);if(s.status===422)throw new u(l?.error??{reason:"invalid_request",message:l?.message??"The request was invalid."});let c={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[s.status];throw c?new u(c):new h(l?.message??`Server error (${s.status})`,s.status)}};function he(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var E=class extends EventTarget{constructor(t){super();this.options=t;this.storage=t.storage!==void 0?t.storage:me(),this.retry=t.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;queue=null;queueTimer=null;retry;onOnline=()=>this.retryNow();async load(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...t,manifest:n})}hydrate(t){this.plan=t.plan,this.manifest=t.manifest,this.confirmed=new Map(t.blocks.map(n=>[n.id,n])),this.recompute(),this.emit("change"),this.startQueue(),this.pending.length&&this.scheduleFlush()}async reload(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=t.plan,this.manifest=n,this.confirmed=new Map(t.blocks.map(i=>[i.id,i])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),this.queueTimer&&clearInterval(this.queueTimer),this.queue?.stop(),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}snapshotCache=null;subscribe(t){return this.addEventListener("change",t),this.addEventListener("sync",t),()=>{this.removeEventListener("change",t),this.removeEventListener("sync",t)}}getSnapshot(){return this.snapshotCache??={plan:this.plan,blocks:this.all(),syncState:this.syncState,pendingCount:this.pendingCount}}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(t){return this.view.get(t)}all(){return[...this.view.values()]}children(t){return T(this.view,t)}resolve(t){return C(this.view,t)}type(t){return this.manifest?.types[t]}create(t,n={}){let i=n.id??v();return this.dispatch("create",i,{type:t,parent:n.parent??null,after:n.after??null,payload:n.payload??{},...n.attachable?{attachable:n.attachable}:{}}),i}link(t,n,i=null){let o=v();return this.dispatch("link",o,{source:t,parent:n,after:i}),o}update(t,n){this.dispatch("update",t,{payload:n})}move(t,n){this.dispatch("move",t,"parent"in n?{parent:n.parent??null,after:n.after}:{after:n.after})}check(t){this.dispatch("check",t)}uncheck(t){this.dispatch("uncheck",t)}setChecked(t,n){this.dispatch(n?"check":"uncheck",t)}checkAll(t){this.dispatch("check_all",t)}uncheckAll(t){this.dispatch("uncheck_all",t)}exclude(t){this.dispatch("exclude",t)}include(t){this.dispatch("include",t)}delete(t){this.dispatch("delete",t)}restore(t){this.dispatch("restore",t)}deleteImpact(t){return this.options.transport.deleteImpact(t)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let t;try{t=await this.options.transport.send(this.version,this.inflight)}catch(n){n instanceof u?this.handleRejection(n.error):this.handleNetworkError(n);return}this.applyResult(t),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(t,n,i){let o={id:v(),type:t,block:n,...i?{args:i}:{}};this.pending.push(o),this.persistQueue(),$(this.view,o,this.manifest),this.emit("change"),this.emit("command",{command:o}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(t){if(t.full)this.confirmed=new Map(t.blocks.map(n=>[n.id,n]));else{for(let n of t.blocks)this.confirmed.set(n.id,n);for(let n of t.deleted)this.confirmed.delete(n)}this.plan&&(this.plan={...this.plan,version:t.version})}handleRejection(t){let n=this.inflight;if(this.inflight=[],t.reason==="unauthenticated"||t.reason==="session_expired"){this.pending=[...n,...this.pending],this.persistQueue(),this.setSync("offline",t.message),this.emit("error",{error:t,command:null});return}let i=n.findIndex(l=>l.id===t.command),o=i>=0?n[i]:void 0,s=o?n.filter(l=>l!==o):[];this.pending=[...s,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:t,command:o??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(t){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",t instanceof h?t.message:String(t));let n=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),n)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let t of[...this.inflight,...this.pending])$(this.view,t,this.manifest)}persistQueue(){this.queue?.save([...this.inflight,...this.pending])}startQueue(){if(!this.storage||!this.plan||this.queue||this.destroyed)return;let t=this.options.persistence??{},n=t.intervalMs??5e3;this.queue=new R(this.storage,this.plan.id,{staleMs:t.staleMs??n*3,locks:t.locks!==void 0?t.locks:Z()}),this.queue.start(),this.adoptOrphans(),this.queueTimer=setInterval(()=>{this.persistQueue(),this.adoptOrphans()},n)}async adoptOrphans(){let t=await this.queue?.adoptOrphans()??[];if(this.destroyed||!t.length)return;let n=new Set([...this.inflight,...this.pending].map(o=>o.id)),i=t.filter(o=>!n.has(o.id));i.length&&(this.pending.push(...i),this.persistQueue(),this.recompute(),this.emit("change"),this.scheduleFlush())}setSync(t,n){this.syncState=t,this.emit("sync",{state:t,pending:this.pendingCount,message:n})}emit(t,n={}){(t==="change"||t==="sync")&&(this.snapshotCache=null),this.dispatchEvent(new CustomEvent(t,{detail:n}))}};function me(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var S=class{constructor(e,t=3e4){this.wire=e;this.timeoutMs=t}planData=null;async loadPlan(){let{plan:e,blocks:t}=await this.loadPlanData();return{plan:e,blocks:t}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(e,t){let n=await this.call("runCommands",t,e);if(!n.ok)throw new u(n.error);return n}deleteImpact(e){return this.call("deleteImpact",e)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(e,...t){let n=typeof this.wire=="function"?await this.wire():this.wire,i;try{return await Promise.race([n.$call(e,...t),new Promise((o,s)=>{i=setTimeout(()=>s(new h("Livewire request timed out")),this.timeoutMs)})])}catch(o){throw fe(o)}finally{clearTimeout(i)}}};function fe(r){if(r instanceof u||r instanceof h)return r;let e=typeof r=="object"&&r!==null&&"status"in r?r.status:null,n=e!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[e]:void 0;return n?new u(n):new h(e?`Server error (${e})`:r instanceof Error?r.message:"Network error",e??void 0)}function a(r,e={},...t){let n=document.createElement(r);for(let[i,o]of Object.entries(e))o===!1||o===null||o===void 0||(i.startsWith(".")?n[i.slice(1)]=o:n.setAttribute(i,o===!0?"":String(o)));for(let i of t)i==null||i===!1||n.append(i instanceof Node?i:String(i));return n}function D(r,e,t,n){let i=r.type(t);if(!i)return!1;if(e===null)return i.root;let o=r.get(e),s=o?r.type(o.type):void 0;if(!o||!s||n&&(e===n||be(r,e,n)))return!1;let l=s.children,d=l.allow.includes(t)||l.any_content&&!i.structural,c=i.parents===null||i.parents.includes(o.type);if(!d||!c)return!1;let p=l.max[t];return p===void 0?!0:r.children(e).filter(g=>g.type===t&&g.id!==n).length<p}function be(r,e,t){let n=r.get(e),i=new Set;for(;n?.parent&&!i.has(n.id);){if(n.parent===t)return!0;i.add(n.id),n=r.get(n.parent)}return!1}var ge=4,B=56,ee=14,H=class{constructor(e){this.host=e}state=null;get dragging(){return this.state?.started??!1}onPointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;let t=this.host.store,n=e.target?.closest("[data-pb-drag-handle]");if(!n||!t||this.host.readonly||this.state)return;let i=n.closest("[data-pb-key]"),o=i?.dataset.pbId;if(!(!i||!o||!t.get(o))){e.preventDefault();try{n.setPointerCapture?.(e.pointerId)}catch{}this.state={id:o,el:i,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=e=>{let t=this.state;if(!(!t||e.pointerId!==t.pointerId)){if(t.x=e.clientX,t.y=e.clientY,!t.started){if(Math.hypot(t.x-t.startX,t.y-t.startY)<ge)return;this.begin(t)}e.preventDefault(),this.positionGhost(t),this.updateDrop(t)}};onPointerUp=e=>{this.state&&e.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=e=>{e.key==="Escape"&&this.state&&(e.preventDefault(),e.stopPropagation(),this.finish(!1))};begin(e){e.started=!0;let t=e.el.getBoundingClientRect();e.offsetX=e.startX-t.left,e.offsetY=e.startY-t.top;let n=e.el.cloneNode(!0);for(let o of[n,...n.querySelectorAll("*")])for(let s of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])o.removeAttribute(s);n.classList.add("pb-drag-ghost"),n.setAttribute("aria-hidden","true"),n.style.width=`${t.width}px`,e.ghost=n,e.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(n);let i=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(i))};e.frame=requestAnimationFrame(i)}positionGhost(e){e.ghost&&(e.ghost.style.transform=`translate(${e.x-e.offsetX}px, ${e.y-e.offsetY}px)`)}autoScroll(e){let t=window.innerHeight,n=0;e.y<B?n=-ee*(1-e.y/B):e.y>t-B&&(n=ee*(1-(t-e.y)/B)),n!==0&&(window.scrollBy(0,n),this.updateDrop(e))}updateDrop(e){let t=this.findDrop(e);e.drop&&(e.drop.el!==t?.el||e.drop.position!==t?.position)&&delete e.drop.el.dataset.pbDrop,t&&(t.el.dataset.pbDrop=t.position),e.drop=t}findDrop(e){let t=this.host.store,n=t?.get(e.id);if(!t||!n)return null;let i=this.host.root,o=(i instanceof ShadowRoot?i:document).elementFromPoint(e.x,e.y);if(!o||(i instanceof ShadowRoot,!i.contains(o)))return null;let s=o.closest("[data-pb-key]");for(;s;){if(s===e.el||e.el.contains(s))return null;let l=s.dataset.pbId,d=t.get(l);if(!d)return null;if(D(t,d.parent,n.type,n.id)){let p=s.getBoundingClientRect(),b=e.y<p.top+p.height/2?"before":"after";return{el:s,position:b,parent:d.parent,after:this.afterFor(d.parent,l,b,n.id)}}let c=t.resolve(l)??d;if(D(t,c.id,n.type,n.id)){let p=t.children(c.id).filter(b=>b.id!==n.id).at(-1);return{el:s,position:"inside",parent:c.id,after:p?.id??null}}s=s.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(e,t,n,i){if(n==="after")return t;let o=this.host.store.children(e).filter(l=>l.id!==i),s=o.findIndex(l=>l.id===t);return s>0?o[s-1].id:null}finish(e){let t=this.state;if(!t||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(t.frame),t.ghost?.remove(),delete t.el.dataset.pbDragging,t.drop&&delete t.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!e||!t.started||!t.drop))return;let n=this.host.store?.get(t.id);if(!n)return;let{parent:i,after:o}=t.drop,s=this.host.store.children(n.parent),l=s[s.findIndex(d=>d.id===n.id)-1]?.id??null;(i!==n.parent||o!==l)&&this.host.move(n.id,i,o)}};var L={addDay:"+ Day",addPool:"+ Pool",add:r=>`+ ${r}`,newItem:r=>`New ${r.toLowerCase()}`,day:r=>`Day ${r}`,pool:"Pool",checkAll:"Check all items",markDone:r=>`Mark "${r}" done`,progress:(r,e)=>`${r}/${e}`,poolProgress:(r,e)=>`${r} of ${e} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip (do not count)",include:"Count again",addToDay:"Add to day\u2026",linked:"linked",doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day or a pool to start.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:r=>`This also appears in ${r}. Delete it everywhere?`};var ne=new Map;function F(r,e){ne.set(r,e)}function re(r){return ne.get(r)??Te[r]??Se}function ye(r){return r?.fields.find(e=>e.type==="text")??r?.fields.find(e=>e.type==="textarea")}function N(r){let e=ye(r.type),t=e?r.target.payload[e.name]:void 0;return typeof t=="string"&&t!==""?t:r.type?.label??r.target.type}function x(r,e){let t=e??N(r);return r.readonly?a("span",{class:"pb-title"},t):a("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:r.labels.edit},t)}function f(r,e,t,n={}){return a("button",{type:"button",class:`pb-button pb-button--ghost${r==="delete"?" pb-button--danger":""}`,"data-pb-action":r,"aria-label":e,title:e,...n},a("span",{"aria-hidden":"true"},t))}function A(r,e={}){if(r.readonly)return null;let{labels:t,block:n,store:i}=r,o=i.children(null).filter(l=>l.type==="timeline"),s=n.parent?i.get(n.parent):void 0;return a("div",{class:"pb-actions"},e.linkable&&s?.type==="pool"&&o.length>0?a("select",{class:"pb-select","data-pb-action":"link","aria-label":t.addToDay},a("option",{value:""},t.addToDay),...o.map(l=>a("option",{value:l.id},z(i,l,t)))):null,f("move-up",t.moveUp,"\u2191"),f("move-down",t.moveDown,"\u2193"),r.type?.root?null:f(n.excluded?"include":"exclude",n.excluded?t.include:t.exclude,n.excluded?"\u21BA":"\u2298"),f("delete",t.delete,"\u2715"))}function O(r,e){if(r.readonly)return null;let t=e.filter(n=>ve(r,n)).map(n=>a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":n,"data-pb-parent":r.target.id},r.labels.add(r.store.type(n)?.label??n)));return t.length?a("div",{class:"pb-footer"},...t):null}function ve(r,e){return D(r.store,r.target.id,e)}function M(r){return r.readonly||r.editing?null:a("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":r.labels.dragHandle,title:r.labels.dragHandle},a("span",{"aria-hidden":"true"},"\u283F"))}function j(r){return r.type?.checkable?a("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":r.target.checked,"aria-label":r.labels.markDone(N(r)),disabled:r.readonly}):null}function I(r){return r.isLink?a("span",{class:"pb-badge",title:r.labels.linked},`\u2197 ${r.labels.linked}`):null}function P(r){let{labels:e,target:t}=r;return a("form",{class:"pb-form","data-pb-form":""},...(r.type?.fields??[]).map(n=>ie(n,t.payload[n.name])),a("div",{class:"pb-actions"},a("button",{type:"submit",class:"pb-button pb-button--primary"},e.save),a("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},e.cancel)))}function ie(r,e){let t={name:r.name,class:"pb-input",required:r.required,"data-pb-field":r.type},n=e==null?"":String(e),i;switch(r.type){case"textarea":i=a("textarea",{...t,rows:3,maxlength:r.max},n);break;case"select":i=a("select",t,r.required?null:a("option",{value:""},"\u2014"),...(r.options??[]).map(o=>a("option",{value:String(o.value),selected:String(o.value)===n},o.label)));break;case"toggle":i=a("input",{name:r.name,type:"checkbox","data-pb-field":"toggle",".checked":e===!0||e===1||e==="1"});break;case"number":i=a("input",{...t,type:"number",step:"any",min:r.min,max:r.max,value:n});break;default:i=a("input",{...t,type:r.type==="text"?"text":r.type,maxlength:r.type==="text"||r.type==="url"?r.max:void 0,value:n})}return a("label",{class:"pb-field"},r.label,i)}function z(r,e,t){let n=typeof e.payload.label=="string"&&e.payload.label!==""?` \xB7 ${e.payload.label}`:"",i=e.day?.number??r.children(null).filter(o=>o.type==="timeline").indexOf(e)+1;return t.day(i)+n}function oe(r){if(!r)return null;let e=new Date(`${r}T00:00:00`);return Number.isNaN(e.getTime())?r:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(e)}var _={title:x,titleOf:N,iconButton:f,itemActions:A,addButtons:O,dragHandle:M,checkbox:j,linkBadge:I,editForm:P,fieldInput:ie,dayTitle:z,formatDate:oe},ke=r=>{let{target:e,labels:t,store:n}=r,i=e.progress??{state:"none",done:0,total:0},o=oe(e.day?.date??null);return a("section",{class:"pb-group pb-day"},a("header",{class:"pb-group__header"},M(r),a("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":i.state==="all",".indeterminate":i.state==="some","aria-label":t.checkAll,disabled:r.readonly||i.total===0}),a("div",{class:"pb-group__title"},r.editing?null:x(r,z(n,e,t)),o?a("span",{class:"pb-muted"},o):null,I(r)),a("span",{class:"pb-progress","data-state":i.state},t.progress(i.done,i.total)),r.readonly?null:a("div",{class:"pb-actions"},f("move-up",t.moveUp,"\u2191"),f("move-down",t.moveDown,"\u2193"),f("delete",t.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},P(r)):null,r.children,O(r,["place","note",...se(r)]))},we=r=>{let{target:e,labels:t}=r,n=e.progress??{state:"none",done:0,total:0},i=typeof e.payload.label=="string"&&e.payload.label!==""?e.payload.label:t.pool;return a("section",{class:"pb-group pb-pool"},a("header",{class:"pb-group__header"},M(r),a("div",{class:"pb-group__title"},r.editing?null:x(r,i),I(r)),a("span",{class:"pb-progress"},t.poolProgress(n.done,n.total)),r.readonly?null:a("div",{class:"pb-actions"},f("move-up",t.moveUp,"\u2191"),f("move-down",t.moveDown,"\u2193"),f("delete",t.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},P(r)):null,r.children,O(r,["place","note",...se(r)]))},te=r=>{let{target:e,labels:t}=r,n=typeof e.payload.time=="string"?e.payload.time:null,i=typeof e.payload.maps_url=="string"?e.payload.maps_url:null,o=typeof e.payload.notes=="string"?e.payload.notes:null;return a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),j(r),a("div",{class:"pb-item__main"},r.editing?P(r):a("div",{},x(r)," ",I(r),e.done&&!e.checked?a("span",{class:"pb-badge pb-badge--done"},t.doneViaBackup):null,n||i?a("div",{class:"pb-meta"},n?a("span",{},n):null,i?a("a",{href:i,target:"_blank",rel:"noopener noreferrer"},t.openMap):null):null,o?a("div",{class:"pb-notes"},o):null)),r.editing?null:A(r,{linkable:!0})),r.children,r.editing||r.isLink?null:O(r,["backup","note"]))},Ee=r=>a("div",{class:"pb-item pb-note-item"},a("div",{class:"pb-item__row"},M(r),a("div",{class:"pb-item__main"},r.editing?P(r):a("div",{class:"pb-note"},x(r))),r.editing?null:A(r))),Se=r=>a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),j(r),a("div",{class:"pb-item__main"},r.editing?P(r):a("div",{},x(r)," ",I(r))),r.editing?null:A(r,{linkable:!0})),r.children);function se(r){let e=["timeline","pool","link","place","backup","note"];return Object.keys(r.store.manifest?.types??{}).filter(t=>!e.includes(t))}var Te={timeline:ke,pool:we,place:te,backup:te,note:Ee};var K=`/*
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
`;var ae=!1,w=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly"];_store=null;ownsStore=!1;_labels=L;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new H(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;get store(){return this._store}set store(e){this.detachStore(),this._store=e,this.ownsStore=!1,e&&(this.attachStore(e),this.state=e.plan?"ready":"idle",this.scheduleRender())}get labels(){return this._labels}set labels(e){this._labels={...L,...e},this.cache.clear(),this.scheduleRender()}get isReadOnly(){return this.hasAttribute("readonly")}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():this.scheduleRender()}disconnectedCallback(){window.removeEventListener("plan-block-refresh",this.onRefresh),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(e,t,n){t===n||!this.isConnected||((e==="plan"||e==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(this.cache.clear(),this.scheduleRender()))}async boot(){let e=this.getAttribute("plan");e&&await this.useStore(new E({transport:this.createTransport(e)}),{initial:this.readInitialData()??void 0,owned:!0})}async useStore(e,t={}){if(this._store&&this._store!==e&&this.ownsStore&&this._store.destroy(),this.detachStore(),this._store=e,this.ownsStore=t.owned??!1,this.attachStore(e),t.initial){e.hydrate(t.initial),this.state="ready",this.render(),this.emit("ready",{plan:e.plan});return}if(e.plan){this.state="ready",this.render();return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.emit("ready",{plan:e.plan})}catch(n){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:n instanceof Error?n.message:String(n)}})}this.render()}createTransport(e){if(this.getAttribute("transport")==="livewire"){let t=this.parentElement;for(;t&&!t.hasAttribute("wire:id");)t=t.parentElement;let n=t?.getAttribute("wire:id")??"";return new S(()=>Me(n))}return new k({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:e})}onRefresh=e=>{let t=e.detail,n=Array.isArray(t)?t[0]?.plan:t?.plan;this._store?.plan&&(!n||n===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let e=le(this,"script[data-pb-initial]")[0];if(!e?.textContent)return null;try{return JSON.parse(e.textContent)}catch{return null}finally{e.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=e=>{let{command:t}=e.detail;this.emit(t.type.replace(/_/g,"-"),{id:t.block,command:t})};onError=e=>{let{error:t}=e.detail;this.showToast({message:t.message,kind:"error"}),this.emit("error",e.detail)};onSync=e=>{this.emit("sync",e.detail),this.scheduleRender()};attachStore(e){e.addEventListener("change",this.onChange),e.addEventListener("command",this.onCommand),e.addEventListener("error",this.onError),e.addEventListener("sync",this.onSync)}detachStore(){let e=this._store;e&&(e.removeEventListener("change",this.onChange),e.removeEventListener("command",this.onCommand),e.removeEventListener("error",this.onError),e.removeEventListener("sync",this.onSync),this.cache.clear())}adoptStyles(){let e=this.root instanceof ShadowRoot?this.root:document;if(!(e===document&&ae)){try{let t=new CSSStyleSheet;t.replaceSync(K),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t]}catch{let t=a("style",{"data-plan-block":""},K);e===document?document.head.append(t):e.prepend(t)}e===document&&(ae=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let p of le(this,"[data-pb-fallback]"))p.remove();this.container=a("div",{class:"pb-root"}),this.root.append(this.container)}let e=this._store,t=this._labels;if(!e||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(a("div",{class:"pb-empty"},t.loading));return}if(this.state==="failed"||!e.plan){this.container.replaceChildren(a("div",{class:"pb-empty",role:"alert"},t.loadFailed));return}let n=this.captureFocus(),i=new Set,o=e.children(null).map(p=>this.renderBlock(p,"",i,0));for(let p of this.cache.keys())i.has(p)||this.cache.delete(p);let s=this.ensure("list",()=>a("div",{class:"pb-list"}));Q(s,o.length?o:[a("div",{class:"pb-empty"},t.empty)]);let l=this.isReadOnly?null:this.ensure("toolbar",()=>a("div",{class:"pb-toolbar"},a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},t.addDay),a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},t.addPool))),d=a("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":e.syncState},e.syncState==="saving"?t.saving:e.syncState==="offline"?t.offline:""),c=this.toast?a("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},a("span",{},this.toast.message),a("div",{class:"pb-actions"},this.toast.action?a("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,a("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},t.dismiss))):null;Q(this.container,[l,s,d,c].filter(p=>p!==null)),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${Y(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(n)}captureFocus(){let e=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!e||!this.container?.contains(e))return null;let t=e.closest("[data-pb-key]")?.dataset.pbKey;if(!t)return null;let n=e.dataset?.pbAction,i=e.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":n?`[data-pb-action="${Y(n)}"]`:null;return i?{key:t,selector:i,el:e}:null}restoreFocus(e){if(!e||(this.root instanceof ShadowRoot?this.root:document).activeElement===e.el)return;if(e.el.isConnected){e.el.focus();return}let n=this.root.querySelector(`[data-pb-key="${Y(e.key)}"]`);[...n?.querySelectorAll(e.selector)??[]].find(o=>o.closest("[data-pb-key]")===n)?.focus()}persistent=new Map;ensure(e,t){let n=this.persistent.get(e);return n||(n=t(),this.persistent.set(e,n)),n}renderBlock(e,t,n,i){let o=this._store,s=t+e.id,l=e.type==="link",d=(l?o.resolve(e.id):e)??e,c=o.type(d.type),p=this.editingKey===s;n.add(s);let b=JSON.stringify([e,l?d:null,p,this.isReadOnly,e.parent?o.children(e.parent).length:0,o.children(d.id).map(m=>m.type).join(),o.children(null).filter(m=>m.type==="timeline").map(m=>m.id+(m.payload.label??"")).join()]),g=this.cache.get(s);if(!g||g.signature!==b){let m=g?.children??a("div",{class:"pb-children","data-pb-children":""}),ce={block:e,target:d,type:c,isLink:l,children:m,editing:p,readonly:this.isReadOnly,store:o,labels:this._labels,h:a,parts:_},y=re(d.type)(ce);y.classList.add("pb-block"),y.dataset.pbId=e.id,y.dataset.pbKey=s,y.dataset.pbType=d.type,q(y,"pbLink",l),q(y,"pbChecked",d.checked),q(y,"pbDone",d.done),q(y,"pbExcluded",e.excluded),g={signature:b,el:y,children:m},this.cache.set(s,g)}let de=l?`${s}>`:t,pe=i>20?[]:o.children(d.id).map(m=>this.renderBlock(m,de,n,i+1));return Q(g.children,pe),g.el}dragHost(){let e=this;return{get root(){return e.root},get container(){return e.container},get store(){return e._store},get readonly(){return e.isReadOnly},move:(t,n,i)=>e._store?.move(t,{parent:n,after:i})}}listen(){this.listening=!0,this.root.addEventListener("click",e=>this.onClick(e)),this.root.addEventListener("change",e=>this.onInputChange(e)),this.root.addEventListener("submit",e=>this.onSubmit(e)),this.root.addEventListener("pointerdown",e=>this.drag.onPointerDown(e)),this.root.addEventListener("keydown",e=>{let t=e.key;if(t==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let i=e.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(t==="ArrowUp"||t==="ArrowDown")&&i?.dataset.pbId&&!this.isReadOnly&&(e.preventDefault(),this.shift(i.dataset.pbId,t==="ArrowUp"?-1:1))})}actionTarget(e){let t=e.target?.closest("[data-pb-action]");if(!t||!this.root.contains(t))return null;let n=t.closest("[data-pb-key]");return{action:t.dataset.pbAction,el:t,id:n?.dataset.pbId??null,key:n?.dataset.pbKey??null}}onClick(e){let t=this.actionTarget(e),n=this._store;if(!t||!n)return;let{action:i,el:o,id:s,key:l}=t;if(!(i==="toggle-check"||i==="check-all"||i==="link")){switch(i){case"add":return this.add(o.dataset.pbType,o.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return n.restore(o.dataset.pbTarget??s),this.showToast(null)}if(s)switch(i){case"check":return n.check(s);case"uncheck":return n.uncheck(s);case"exclude":return n.exclude(s);case"include":return n.include(s);case"move-up":case"move-down":return this.shift(s,i==="move-up"?-1:1);case"delete":this.confirmDelete(s);return}}}onInputChange(e){let t=this.actionTarget(e),n=this._store;if(!t?.id||!n)return;let i=t.el;if(t.action==="toggle-check")n.setChecked(t.id,i.checked);else if(t.action==="check-all")i.checked?n.checkAll(t.id):n.uncheckAll(t.id);else if(t.action==="link"){let o=t.el.value;o&&(n.link(t.id,o,n.children(o).at(-1)?.id??null),t.el.value="")}}onSubmit(e){let t=e.target?.closest("[data-pb-form]");if(!t||!this._store)return;e.preventDefault();let n=t.closest("[data-pb-key]"),i=n?.dataset.pbId?this._store.resolve(n.dataset.pbId):void 0,o=i?this._store.type(i.type):void 0;if(!i||!o)return;let s={};for(let l of o.fields){let d=xe(t,l),c=i.payload[l.name]??null;d!==c&&(s[l.name]=d)}Object.keys(s).length&&this._store.update(i.id,s),this.editingKey=null,this.scheduleRender()}add(e,t,n){let i=this._store,o=i.type(e),s=o?.fields.find(p=>p.type==="text"||p.type==="textarea"),l=s?.required?{[s.name]:this._labels.newItem(o?.label??e)}:{},d=i.children(t).at(-1)?.id??null,c=i.create(e,{parent:t,after:d,payload:l});if(s){let p=n?this.cache.get(n):void 0,b=n&&t&&p?.el.dataset.pbLink!==void 0?`${n}>`:n&&t?n.slice(0,-t.length):"";this.editingKey=b+c,this.focusEditor=!0}}shift(e,t){let n=this._store,i=n.get(e);if(!i)return;let o=n.children(i.parent),s=o.findIndex(l=>l.id===e);t===-1&&s>0?n.move(e,{after:s>=2?o[s-2].id:null}):t===1&&s<o.length-1&&n.move(e,{after:o[s+1].id})}async confirmDelete(e){let t=this._store,n=[];try{let i=await t.deleteImpact(e);n=[...new Set(i.links.map(o=>o.day?this._labels.day(o.day.number):this._labels.pool))]}catch{}n.length&&!window.confirm(this._labels.confirmDeleteLinked(n.join(", ")))||(t.delete(e),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:e}}))}showToast(e){this.toast=e,this.toastTimer&&clearTimeout(this.toastTimer),e&&(this.toastTimer=setTimeout(()=>this.showToast(null),e.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(e,t){this.dispatchEvent(new CustomEvent(`plan-block:${e}`,{detail:t,bubbles:!0,composed:!0}))}};function xe(r,e){let t=r.elements.namedItem(e.name);if(!t)return null;if(e.type==="toggle")return t.checked;let n=t.value.trim();return n===""?null:e.type==="number"?Number(n):n}function Q(r,e){let t=r.children;t.length===e.length&&e.every((n,i)=>t[i]===n)||r.replaceChildren(...e)}function Me(r,e=1e4){let t=()=>window.Livewire?.find(r);return new Promise((n,i)=>{let o=t();if(o)return n(o);let s=Date.now(),l=()=>{let p=t();p?(c(),n(p)):Date.now()-s>e&&(c(),i(new Error(`Livewire component ${r||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),c=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function le(r,e){return Array.from(r.children).filter(t=>t.matches(e))}function q(r,e,t){t?r.dataset[e]="":delete r.dataset[e]}function Y(r){return r.replace(/["\\]/g,"\\$&")}function U(r="plan-block"){typeof customElements<"u"&&!customElements.get(r)&&customElements.define(r,r==="plan-block"?w:class extends w{})}U();var Pe={PlanStore:E,HttpTransport:k,LivewireTransport:S,RejectedError:u,TransportError:h,PlanBlockElement:w,renderer:F,parts:_,h:a,defaultLabels:L,defineElement:U,ulid:v};window.PlanBlock=Pe;})();
