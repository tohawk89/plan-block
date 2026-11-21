"use strict";(()=>{function F(r,e,t){let n=e.args??{};switch(e.type){case"create":case"link":{if(r.has(e.block))return;let i=n.parent??null,o=e.type==="link"?"link":String(n.type),s=t?.types[o],l={};for(let d of s?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);r.set(e.block,{id:e.block,type:o,parent:i,order:Z(r,i,n.after??null,null),source:e.type==="link"?n.source??null:null,attachable:n.attachable??null,payload:{...l,...n.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:s&&(s.rule==="all"||s.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let i=r.get(e.block);if(!i)return;r.set(i.id,{...i,payload:{...i.payload,...n.payload??{}}});return}case"move":{let i=r.get(e.block);if(!i)return;let o="parent"in n?n.parent??null:i.parent;r.set(i.id,{...i,parent:o,order:Z(r,o,n.after??null,i.id)});return}case"check":case"uncheck":{let i=C(r,e.block);i&&V(r,i,e.type==="check",t);return}case"check_all":case"uncheck_all":{let i=C(r,e.block);if(!i)return;let o=e.type==="check_all";for(let s of M(r,i.id)){if(s.excluded)continue;let l=C(r,s.id);if(!l)continue;let d=o?[l]:[...J(r,l.id).reverse(),l];for(let c of d)c.type!=="link"&&t?.types[c.type]?.checkable&&V(r,c,o,t)}return}case"exclude":case"include":{let i=r.get(e.block);i&&r.set(i.id,{...i,excluded:e.type==="exclude"});return}case"delete":{let i=r.get(e.block);if(!i)return;let o=new Set([i.id,...J(r,i.id).map(s=>s.id)]);for(let s of r.values())s.source&&o.has(s.source)&&o.add(s.id);for(let s of o)r.delete(s);return}case"restore":return}}function C(r,e){let t=r.get(e);return t?.source?r.get(t.source)??t:t}function M(r,e){let t=[];for(let n of r.values())n.parent===e&&t.push(n);return t.sort((n,i)=>n.order-i.order||(n.id<i.id?-1:n.id>i.id?1:0))}function J(r,e){let t=[],n=[e],i=new Set;for(;n.length;){let o=n.pop();if(!i.has(o)){i.add(o);for(let s of M(r,o))t.push(s),n.push(s.id)}}return t}function V(r,e,t,n){let o=(n?.types[e.type]?.rule??"none")==="any"&&M(r,e.id).some(s=>!s.excluded&&s.done);r.set(e.id,{...e,checked:t,checked_at:t?new Date().toISOString():null,done:t||o})}function Z(r,e,t,n){let i=M(r,e).filter(d=>d.id!==n);if(t===null){let d=i[0];return d?d.order/2:1024}let o=i.findIndex(d=>d.id===t),s=i[o];if(!s)return(i.at(-1)?.order??0)+1024;let l=i[o+1];return l?(s.order+l.order)/2:s.order+1024}var ee="0123456789abcdefghjkmnpqrstvwxyz";function y(r=Date.now()){let e="",t=r;for(let o=0;o<10;o++)e=ee.charAt(t%32)+e,t=Math.floor(t/32);let n=new Uint8Array(16);crypto.getRandomValues(n);let i="";for(let o of n)i+=ee.charAt(o%32);return e+i}var I=class{constructor(e,t,n){this.backend=e;this.planId=t;this.options=n}editorId=y();releaseLock=null;stopped=!1;get prefix(){return`plan-block:queue:${this.planId}:`}get ownKey(){return this.prefix+this.editorId}get legacyKey(){return`plan-block:queue:${this.planId}`}start(){this.options.locks?.request(te(this.planId,this.editorId),()=>new Promise(e=>this.releaseLock=e)).catch(()=>{})}stop(){this.stopped=!0,this.releaseLock?.(),this.releaseLock=null}save(e){if(!this.stopped)try{if(e.length){let t={v:2,heartbeat:Date.now(),commands:e};this.backend.setItem(this.ownKey,JSON.stringify(t))}else this.backend.removeItem(this.ownKey)}catch{}}async adoptOrphans(){let e=async()=>{let n=await this.liveEditors(),i=[];for(let o of this.keys()){if(o===this.ownKey)continue;let s=o===this.legacyKey;if(!s&&!o.startsWith(this.prefix))continue;let l=ve(this.backend.getItem(o)),d=s?null:o.slice(this.prefix.length);if(!(l&&d!==null&&(n?n.has(te(this.planId,d)):Date.now()-l.heartbeat<this.options.staleMs))){l&&i.push(...l.commands);try{this.backend.removeItem(o)}catch{}}}return i};if(this.stopped)return[];let t=this.options.locks;if(!t)return e();try{return await t.request(`plan-block:adopt:${this.planId}`,e)}catch{return[]}}async liveEditors(){let e=this.options.locks;if(!e)return null;let t=await e.query();return new Set([...t.held??[],...t.pending??[]].map(n=>n.name??""))}keys(){let e=[];try{for(let t=0;t<this.backend.length;t++){let n=this.backend.key(t);n!==null&&e.push(n)}}catch{}return e}};function te(r,e){return`plan-block:editor:${r}:${e}`}function ve(r){if(!r)return null;try{let e=JSON.parse(r);if(Array.isArray(e))return{v:2,heartbeat:0,commands:e};if(e&&Array.isArray(e.commands))return e}catch{}return null}function ne(){try{let r=typeof navigator<"u"?navigator.locks:void 0;return r&&typeof r.request=="function"&&typeof r.query=="function"?r:null}catch{return null}}var m=class extends Error{constructor(t){super(t.message);this.error=t;this.name="RejectedError"}},f=class extends Error{constructor(t,n){super(t);this.status=n;this.name="TransportError"}},k=class{constructor(e){this.options=e;this.endpoint=e.endpoint.replace(/\/+$/,""),this.fetchFn=e.fetch??((t,n)=>fetch(t,n))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(e,t){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:e,commands:t})}deleteImpact(e){return this.request("GET",`/plans/${this.options.plan}/blocks/${e}/delete-impact`)}async request(e,t,n){let i={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},o=this.options.csrfToken!==void 0?this.options.csrfToken:ke();o&&(i["X-CSRF-TOKEN"]=o);let s=ye();s&&(i["X-Socket-ID"]=s),n!==void 0&&(i["Content-Type"]="application/json");let l;try{l=await this.fetchFn(this.endpoint+t,{method:e,headers:i,credentials:"same-origin",body:n===void 0?void 0:JSON.stringify(n)})}catch(h){throw new f(h instanceof Error?h.message:"Network error")}if(l.ok)return await l.json();let d=await l.json().catch(()=>null);if(l.status===422)throw new m(d?.error??{reason:"invalid_request",message:d?.message??"The request was invalid."});let p={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[l.status];throw p?new m(p):new f(d?.message??`Server error (${l.status})`,l.status)}};function ye(){try{return globalThis.Echo?.socketId?.()??null}catch{return null}}function ke(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var E=class extends EventTarget{constructor(t){super();this.options=t;this.storage=t.storage!==void 0?t.storage:we(),this.retry=t.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;queue=null;queueTimer=null;retry;onOnline=()=>this.retryNow();async load(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...t,manifest:n})}hydrate(t){this.plan=t.plan,this.manifest=t.manifest,this.confirmed=new Map(t.blocks.map(n=>[n.id,n])),this.recompute(),this.emit("change"),this.startQueue(),this.pending.length&&this.scheduleFlush()}applyRemote(t){if(!this.plan||this.destroyed||t.plan!==this.plan.id||t.version<=this.plan.version)return"ignored";if(t.previous_version!==this.plan.version||!t.blocks)return this.reload().catch(()=>{}),"reloading";for(let n of t.blocks)this.confirmed.set(n.id,n);for(let n of t.deleted??[])this.confirmed.delete(n);return this.plan={...this.plan,version:t.version},this.recompute(),this.emit("change"),this.emit("remote",{change:t}),"applied"}async reload(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=t.plan,this.manifest=n,this.confirmed=new Map(t.blocks.map(i=>[i.id,i])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),this.queueTimer&&clearInterval(this.queueTimer),this.queue?.stop(),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}snapshotCache=null;subscribe(t){return this.addEventListener("change",t),this.addEventListener("sync",t),()=>{this.removeEventListener("change",t),this.removeEventListener("sync",t)}}getSnapshot(){return this.snapshotCache??={plan:this.plan,blocks:this.all(),syncState:this.syncState,pendingCount:this.pendingCount}}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(t){return this.view.get(t)}all(){return[...this.view.values()]}children(t){return M(this.view,t)}resolve(t){return C(this.view,t)}type(t){return this.manifest?.types[t]}create(t,n={}){let i=n.id??y();return this.dispatch("create",i,{type:t,parent:n.parent??null,after:n.after??null,payload:n.payload??{},...n.attachable?{attachable:n.attachable}:{}}),i}link(t,n,i=null){let o=y();return this.dispatch("link",o,{source:t,parent:n,after:i}),o}update(t,n){this.dispatch("update",t,{payload:n})}move(t,n){this.dispatch("move",t,"parent"in n?{parent:n.parent??null,after:n.after}:{after:n.after})}check(t){this.dispatch("check",t)}uncheck(t){this.dispatch("uncheck",t)}setChecked(t,n){this.dispatch(n?"check":"uncheck",t)}checkAll(t){this.dispatch("check_all",t)}uncheckAll(t){this.dispatch("uncheck_all",t)}exclude(t){this.dispatch("exclude",t)}include(t){this.dispatch("include",t)}delete(t){this.dispatch("delete",t)}restore(t){this.dispatch("restore",t)}deleteImpact(t){return this.options.transport.deleteImpact(t)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let t;try{t=await this.options.transport.send(this.version,this.inflight)}catch(n){n instanceof m?this.handleRejection(n.error):this.handleNetworkError(n);return}this.applyResult(t),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(t,n,i){let o={id:y(),type:t,block:n,...i?{args:i}:{}};this.pending.push(o),this.persistQueue(),F(this.view,o,this.manifest),this.emit("change"),this.emit("command",{command:o}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(t){if(t.full)this.confirmed=new Map(t.blocks.map(n=>[n.id,n]));else{for(let n of t.blocks)this.confirmed.set(n.id,n);for(let n of t.deleted)this.confirmed.delete(n)}this.plan&&(this.plan={...this.plan,version:t.version})}handleRejection(t){let n=this.inflight;if(this.inflight=[],t.reason==="unauthenticated"||t.reason==="session_expired"){this.pending=[...n,...this.pending],this.persistQueue(),this.setSync("offline",t.message),this.emit("error",{error:t,command:null});return}let i=n.findIndex(l=>l.id===t.command),o=i>=0?n[i]:void 0,s=o?n.filter(l=>l!==o):[];this.pending=[...s,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:t,command:o??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(t){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",t instanceof f?t.message:String(t));let n=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),n)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let t of[...this.inflight,...this.pending])F(this.view,t,this.manifest)}persistQueue(){this.queue?.save([...this.inflight,...this.pending])}startQueue(){if(!this.storage||!this.plan||this.queue||this.destroyed)return;let t=this.options.persistence??{},n=t.intervalMs??5e3;this.queue=new I(this.storage,this.plan.id,{staleMs:t.staleMs??n*3,locks:t.locks!==void 0?t.locks:ne()}),this.queue.start(),this.adoptOrphans(),this.queueTimer=setInterval(()=>{this.persistQueue(),this.adoptOrphans()},n)}async adoptOrphans(){let t=await this.queue?.adoptOrphans()??[];if(this.destroyed||!t.length)return;let n=new Set([...this.inflight,...this.pending].map(o=>o.id)),i=t.filter(o=>!n.has(o.id));i.length&&(this.pending.push(...i),this.persistQueue(),this.recompute(),this.emit("change"),this.scheduleFlush())}setSync(t,n){this.syncState=t,this.emit("sync",{state:t,pending:this.pendingCount,message:n})}emit(t,n={}){(t==="change"||t==="sync")&&(this.snapshotCache=null),this.dispatchEvent(new CustomEvent(t,{detail:n}))}};function we(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var S=class{constructor(e,t=3e4){this.wire=e;this.timeoutMs=t}planData=null;async loadPlan(){let{plan:e,blocks:t}=await this.loadPlanData();return{plan:e,blocks:t}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(e,t){let n=await this.call("runCommands",t,e);if(!n.ok)throw new m(n.error);return n}deleteImpact(e){return this.call("deleteImpact",e)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(e,...t){let n=typeof this.wire=="function"?await this.wire():this.wire,i;try{return await Promise.race([n.$call(e,...t),new Promise((o,s)=>{i=setTimeout(()=>s(new f("Livewire request timed out")),this.timeoutMs)})])}catch(o){throw Ee(o)}finally{clearTimeout(i)}}};function Ee(r){if(r instanceof m||r instanceof f)return r;let e=typeof r=="object"&&r!==null&&"status"in r?r.status:null,n=e!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[e]:void 0;return n?new m(n):new f(e?`Server error (${e})`:r instanceof Error?r.message:"Network error",e??void 0)}function re(r){return{subscribe(e,t,n,i){let o=h=>n(h),s=r.private(e);s.listen(`.${t}`,o);let l=r.connector?.pusher?.connection,d=l?.state==="connected",c=!1,p=h=>{h.current==="connected"?(d&&c&&i(),d=!0,c=!1):d&&(c=!0)};return l?.bind("state_change",p),()=>{s.stopListening(`.${t}`,o),l?.unbind("state_change",p)}}}}function ie(r,e){let t=r.manifest?.realtime;return!t?.enabled||!r.plan?()=>{}:e.subscribe(t.channel_prefix+r.plan.id,t.event,n=>r.applyRemote(n),()=>void r.reload().catch(()=>{}))}function a(r,e={},...t){let n=document.createElement(r);for(let[i,o]of Object.entries(e))o===!1||o===null||o===void 0||(i.startsWith(".")?n[i.slice(1)]=o:n.setAttribute(i,o===!0?"":String(o)));for(let i of t)i==null||i===!1||n.append(i instanceof Node?i:String(i));return n}function R(r,e,t,n){let i=r.type(t);if(!i)return!1;if(e===null)return i.root;let o=r.get(e),s=o?r.type(o.type):void 0;if(!o||!s||n&&(e===n||Se(r,e,n)))return!1;let l=s.children,d=l.allow.includes(t)||l.any_content&&!i.structural,c=i.parents===null||i.parents.includes(o.type);if(!d||!c)return!1;let p=l.max[t];return p===void 0?!0:r.children(e).filter(u=>u.type===t&&u.id!==n).length<p}function Se(r,e,t){let n=r.get(e),i=new Set;for(;n?.parent&&!i.has(n.id);){if(n.parent===t)return!0;i.add(n.id),n=r.get(n.parent)}return!1}var Me=4,B=56,oe=14,H=class{constructor(e){this.host=e}state=null;get dragging(){return this.state?.started??!1}onPointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;let t=this.host.store,n=e.target?.closest("[data-pb-drag-handle]");if(!n||!t||this.host.readonly||this.state)return;let i=n.closest("[data-pb-key]"),o=i?.dataset.pbId;if(!(!i||!o||!t.get(o))){e.preventDefault();try{n.setPointerCapture?.(e.pointerId)}catch{}this.state={id:o,el:i,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=e=>{let t=this.state;if(!(!t||e.pointerId!==t.pointerId)){if(t.x=e.clientX,t.y=e.clientY,!t.started){if(Math.hypot(t.x-t.startX,t.y-t.startY)<Me)return;this.begin(t)}e.preventDefault(),this.positionGhost(t),this.updateDrop(t)}};onPointerUp=e=>{this.state&&e.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=e=>{e.key==="Escape"&&this.state&&(e.preventDefault(),e.stopPropagation(),this.finish(!1))};begin(e){e.started=!0;let t=e.el.getBoundingClientRect();e.offsetX=e.startX-t.left,e.offsetY=e.startY-t.top;let n=e.el.cloneNode(!0);for(let o of[n,...n.querySelectorAll("*")])for(let s of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])o.removeAttribute(s);n.classList.add("pb-drag-ghost"),n.setAttribute("aria-hidden","true"),n.style.width=`${t.width}px`,e.ghost=n,e.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(n);let i=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(i))};e.frame=requestAnimationFrame(i)}positionGhost(e){e.ghost&&(e.ghost.style.transform=`translate(${e.x-e.offsetX}px, ${e.y-e.offsetY}px)`)}autoScroll(e){let t=window.innerHeight,n=0;e.y<B?n=-oe*(1-e.y/B):e.y>t-B&&(n=oe*(1-(t-e.y)/B)),n!==0&&(window.scrollBy(0,n),this.updateDrop(e))}updateDrop(e){let t=this.findDrop(e);e.drop&&(e.drop.el!==t?.el||e.drop.position!==t?.position)&&delete e.drop.el.dataset.pbDrop,t&&(t.el.dataset.pbDrop=t.position),e.drop=t}findDrop(e){let t=this.host.store,n=t?.get(e.id);if(!t||!n)return null;let i=this.host.root,o=(i instanceof ShadowRoot?i:document).elementFromPoint(e.x,e.y);if(!o||(i instanceof ShadowRoot,!i.contains(o)))return null;let s=o.closest("[data-pb-key]");for(;s;){if(s===e.el||e.el.contains(s))return null;let l=s.dataset.pbId,d=t.get(l);if(!d)return null;if(R(t,d.parent,n.type,n.id)){let p=s.getBoundingClientRect(),h=e.y<p.top+p.height/2?"before":"after";return{el:s,position:h,parent:d.parent,after:this.afterFor(d.parent,l,h,n.id)}}let c=t.resolve(l)??d;if(R(t,c.id,n.type,n.id)){let p=t.children(c.id).filter(h=>h.id!==n.id).at(-1);return{el:s,position:"inside",parent:c.id,after:p?.id??null}}s=s.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(e,t,n,i){if(n==="after")return t;let o=this.host.store.children(e).filter(l=>l.id!==i),s=o.findIndex(l=>l.id===t);return s>0?o[s-1].id:null}finish(e){let t=this.state;if(!t||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(t.frame),t.ghost?.remove(),delete t.el.dataset.pbDragging,t.drop&&delete t.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!e||!t.started||!t.drop))return;let n=this.host.store?.get(t.id);if(!n)return;let{parent:i,after:o}=t.drop,s=this.host.store.children(n.parent),l=s[s.findIndex(d=>d.id===n.id)-1]?.id??null;(i!==n.parent||o!==l)&&this.host.move(n.id,i,o)}};var T={addDay:"+ Day",addPool:"+ Ideas",add:r=>`+ ${r}`,addMenu:"+ Add",mode:"Mode",viewMode:"Normal",editMode:"Edit",moreActions:"More actions",newItem:r=>`New ${r.toLowerCase()}`,day:r=>`Day ${r}`,pool:"Ideas",checkAll:"Check all items",markDone:r=>`Mark "${r}" done`,progress:(r,e)=>`${r}/${e}`,poolProgress:(r,e)=>`${r} of ${e} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip",include:"Undo skip",addToDay:"Add to day\u2026",linked:"linked",linkedFrom:r=>`Also in ${r}`,doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day, or an ideas list for places you might visit.",emptyView:"Nothing planned yet. Switch to Edit to start.",emptyReadonly:"Nothing planned yet.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:r=>`This also appears in ${r}. Delete it everywhere?`};var ae=new Map;function N(r,e){ae.set(r,e)}function le(r){return ae.get(r)??De[r]??Pe}function Te(r){return r?.fields.find(e=>e.type==="text")??r?.fields.find(e=>e.type==="textarea")}function j(r){let e=Te(r.type),t=e?r.target.payload[e.name]:void 0;return typeof t=="string"&&t!==""?t:r.type?.label??r.target.type}function L(r,e){let t=e??j(r);return r.canEdit?a("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:r.labels.edit},t):a("span",{class:"pb-title"},t)}function Le(r,e,t,n={}){return a("button",{type:"button",class:`pb-button pb-button--ghost${r==="delete"?" pb-button--danger":""}`,"data-pb-action":r,"aria-label":e,title:e,...n},a("span",{"aria-hidden":"true"},t))}function b(r,e,t=!1){return a("button",{type:"button",class:`pb-menu__item${t?" pb-menu__item--danger":""}`,"data-pb-action":r},e)}function z(r,e,t,n=""){return a("details",{class:`pb-menu${n?` ${n}`:""}`,"data-pb-menu":""},a("summary",{class:"pb-button pb-menu__summary","aria-label":e??void 0,title:e??void 0},r),a("div",{class:"pb-menu__list"},...t))}function K(r,e){return z(a("span",{"aria-hidden":"true"},"\u22EF"),r.labels.moreActions,e,"pb-menu--actions")}function A(r,e={}){if(!r.canEdit)return null;let{labels:t,block:n,store:i}=r,o=i.children(null).filter(d=>d.type==="timeline"),s=n.parent?i.get(n.parent):void 0,l=(r.type?.fields.length??0)>0;return a("div",{class:"pb-actions"},e.linkable&&s?.type==="pool"&&o.length>0?a("select",{class:"pb-select","data-pb-action":"link","aria-label":t.addToDay},a("option",{value:""},t.addToDay),...o.map(d=>a("option",{value:d.id},q(i,d,t)))):null,K(r,[l?b("edit",t.edit):null,b("move-up",t.moveUp),b("move-down",t.moveDown),r.type?.root?null:b(n.excluded?"include":"exclude",n.excluded?t.include:t.exclude),b("delete",t.delete,!0)]))}function Q(r){if(!r.canEdit)return null;let{labels:e}=r;return a("div",{class:"pb-actions"},K(r,[b("edit",e.edit),b("move-up",e.moveUp),b("move-down",e.moveDown),b("delete",e.delete,!0)]))}function O(r,e){if(!r.canEdit)return null;let t=e.filter(o=>xe(r,o));if(!t.length)return null;let n=o=>r.store.type(o)?.label??o,i=o=>({type:"button","data-pb-action":"add","data-pb-type":o,"data-pb-parent":r.target.id});return t.length===1?a("div",{class:"pb-footer"},a("button",{...i(t[0]),class:"pb-button"},r.labels.add(n(t[0])))):a("div",{class:"pb-footer"},z(r.labels.addMenu,null,t.map(o=>a("button",{...i(o),class:"pb-menu__item"},n(o))),"pb-menu--add"))}function xe(r,e){return R(r.store,r.target.id,e)}function x(r){return!r.canEdit||r.editing?null:a("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":r.labels.dragHandle,title:r.labels.dragHandle},a("span",{"aria-hidden":"true"},"\u283F"))}function Y(r){return r.type?.checkable?a("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":r.target.checked,"aria-label":r.labels.markDone(j(r)),disabled:r.readonly}):null}function P(r){if(!r.isLink)return null;let e=de(r.store,r.target,r.labels),t=e?r.labels.linkedFrom(e):r.labels.linked;return a("span",{class:"pb-badge pb-badge--link",title:t},`\u2197 ${t}`)}function de(r,e,t){let n=e,i=new Set;for(;n?.parent&&!i.has(n.id);)i.add(n.id),n=r.get(n.parent);return n?n.type==="timeline"?q(r,n,t):n.type==="pool"?typeof n.payload.label=="string"&&n.payload.label!==""?n.payload.label:t.pool:null:null}function _(r){let{labels:e,target:t}=r;return a("form",{class:"pb-form","data-pb-form":""},...(r.type?.fields??[]).map(n=>ce(n,t.payload[n.name])),a("div",{class:"pb-actions"},a("button",{type:"submit",class:"pb-button pb-button--primary"},e.save),a("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},e.cancel)))}function ce(r,e){let t={name:r.name,class:"pb-input",required:r.required,"data-pb-field":r.type},n=e==null?"":String(e),i;switch(r.type){case"textarea":i=a("textarea",{...t,rows:3,maxlength:r.max},n);break;case"select":i=a("select",t,r.required?null:a("option",{value:""},"\u2014"),...(r.options??[]).map(o=>a("option",{value:String(o.value),selected:String(o.value)===n},o.label)));break;case"toggle":i=a("input",{name:r.name,type:"checkbox","data-pb-field":"toggle",".checked":e===!0||e===1||e==="1"});break;case"number":i=a("input",{...t,type:"number",step:"any",min:r.min,max:r.max,value:n});break;default:i=a("input",{...t,type:r.type==="text"?"text":r.type,maxlength:r.type==="text"||r.type==="url"?r.max:void 0,value:n})}return a("label",{class:"pb-field"},r.label,i)}function q(r,e,t){let n=typeof e.payload.label=="string"&&e.payload.label!==""?` \xB7 ${e.payload.label}`:"",i=e.day?.number??r.children(null).filter(o=>o.type==="timeline").indexOf(e)+1;return t.day(i)+n}function pe(r){if(!r)return null;let e=new Date(`${r}T00:00:00`);return Number.isNaN(e.getTime())?r:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(e)}var D={title:L,titleOf:j,iconButton:Le,menu:z,menuItem:b,blockMenu:K,itemActions:A,groupActions:Q,addButtons:O,homeOf:de,dragHandle:x,checkbox:Y,linkBadge:P,editForm:_,fieldInput:ce,dayTitle:q,formatDate:pe},_e=r=>{let{target:e,labels:t,store:n}=r,i=e.progress??{state:"none",done:0,total:0},o=pe(e.day?.date??null);return a("section",{class:"pb-group pb-day"},a("header",{class:"pb-group__header"},x(r),a("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":i.state==="all",".indeterminate":i.state==="some","aria-label":t.checkAll,disabled:r.readonly||i.total===0}),a("div",{class:"pb-group__title"},r.editing?null:L(r,q(n,e,t)),o?a("span",{class:"pb-muted"},o):null,P(r)),a("span",{class:"pb-progress","data-state":i.state},t.progress(i.done,i.total)),Q(r)),r.editing?a("div",{class:"pb-children"},_(r)):null,r.children,O(r,["place","note",...ue(r)]))},Ce=r=>{let{target:e,labels:t}=r,n=e.progress??{state:"none",done:0,total:0},i=typeof e.payload.label=="string"&&e.payload.label!==""?e.payload.label:t.pool;return a("section",{class:"pb-group pb-pool"},a("header",{class:"pb-group__header"},x(r),a("div",{class:"pb-group__title"},r.editing?null:L(r,i),P(r)),a("span",{class:"pb-progress"},t.poolProgress(n.done,n.total)),Q(r)),r.editing?a("div",{class:"pb-children"},_(r)):null,r.children,O(r,["place","note",...ue(r)]))},se=r=>{let{target:e,labels:t}=r,n=typeof e.payload.time=="string"?e.payload.time:null,i=typeof e.payload.maps_url=="string"?e.payload.maps_url:null,o=typeof e.payload.notes=="string"?e.payload.notes:null;return a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},x(r),Y(r),a("div",{class:"pb-item__main"},r.editing?_(r):a("div",{},L(r)," ",P(r),e.done&&!e.checked?a("span",{class:"pb-badge pb-badge--done"},t.doneViaBackup):null,n||i?a("div",{class:"pb-meta"},n?a("span",{},n):null,i?a("a",{href:i,target:"_blank",rel:"noopener noreferrer"},t.openMap):null):null,o?a("div",{class:"pb-notes"},o):null)),r.editing?null:A(r,{linkable:!0})),r.children,r.editing||r.isLink?null:O(r,["backup","note"]))},Re=r=>a("div",{class:"pb-item pb-note-item"},a("div",{class:"pb-item__row"},x(r),a("div",{class:"pb-item__main"},r.editing?_(r):a("div",{class:"pb-note"},L(r))),r.editing?null:A(r))),Pe=r=>a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},x(r),Y(r),a("div",{class:"pb-item__main"},r.editing?_(r):a("div",{},L(r)," ",P(r))),r.editing?null:A(r,{linkable:!0})),r.children);function ue(r){let e=["timeline","pool","link","place","backup","note"];return Object.keys(r.store.manifest?.types??{}).filter(t=>!e.includes(t))}var De={timeline:_e,pool:Ce,place:se,backup:se,note:Re};var X=`/*\r
 * Plan Block default styles. Everything sits in its own cascade layer and\r
 * uses .pb- classes, so host styles win where they overlap and Tailwind or\r
 * Bootstrap resets do not need to be fought. Theme with --pb-* variables.\r
 */\r
@layer plan-block {\r
  plan-block,\r
  :host {\r
    --pb-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;\r
    --pb-text: #1f2328;\r
    --pb-muted: #656d76;\r
    --pb-bg: #ffffff;\r
    --pb-surface: #f6f8fa;\r
    --pb-border: #d0d7de;\r
    --pb-accent: #0969da;\r
    --pb-done: #1a7f37;\r
    --pb-danger: #cf222e;\r
    --pb-radius: 8px;\r
    --pb-gap: 0.5rem;\r
\r
    display: block;\r
    font-family: var(--pb-font);\r
    font-size: 0.9375rem;\r
    line-height: 1.45;\r
    color: var(--pb-text);\r
  }\r
\r
  .pb-root,\r
  .pb-root * {\r
    box-sizing: border-box;\r
  }\r
\r
  .pb-toolbar,\r
  .pb-footer,\r
  .pb-actions {\r
    display: flex;\r
    flex-wrap: wrap;\r
    align-items: center;\r
    gap: calc(var(--pb-gap) / 2);\r
  }\r
\r
  .pb-toolbar {\r
    margin-bottom: var(--pb-gap);\r
  }\r
\r
  .pb-list {\r
    display: grid;\r
    gap: calc(var(--pb-gap) * 1.5);\r
  }\r
\r
  .pb-button {\r
    appearance: none;\r
    border: 1px solid var(--pb-border);\r
    background: var(--pb-bg);\r
    color: inherit;\r
    font: inherit;\r
    font-size: 0.8125rem;\r
    line-height: 1;\r
    padding: 0.4rem 0.6rem;\r
    border-radius: calc(var(--pb-radius) - 2px);\r
    cursor: pointer;\r
    min-height: 2rem;\r
  }\r
\r
  .pb-button:hover {\r
    border-color: var(--pb-accent);\r
  }\r
\r
  .pb-button:focus-visible,\r
  .pb-check:focus-visible,\r
  .pb-title:focus-visible,\r
  .pb-select:focus-visible {\r
    outline: 2px solid var(--pb-accent);\r
    outline-offset: 1px;\r
  }\r
\r
  .pb-button--primary {\r
    background: var(--pb-accent);\r
    border-color: var(--pb-accent);\r
    color: #fff;\r
  }\r
\r
  .pb-button--ghost {\r
    border-color: transparent;\r
    background: transparent;\r
    color: var(--pb-muted);\r
    min-width: 2rem;\r
  }\r
\r
  .pb-button--ghost:hover {\r
    color: var(--pb-text);\r
    background: var(--pb-surface);\r
  }\r
\r
  .pb-button--danger:hover {\r
    color: var(--pb-danger);\r
  }\r
\r
  /* No overflow: hidden here, so menus can open past the card's edge. */\r
  .pb-group {\r
    border: 1px solid var(--pb-border);\r
    border-radius: var(--pb-radius);\r
    background: var(--pb-bg);\r
  }\r
\r
  .pb-group__header {\r
    display: flex;\r
    align-items: center;\r
    gap: var(--pb-gap);\r
    padding: 0.6rem 0.75rem;\r
    background: var(--pb-surface);\r
    border-bottom: 1px solid var(--pb-border);\r
    border-radius: calc(var(--pb-radius) - 1px) calc(var(--pb-radius) - 1px) 0 0;\r
  }\r
\r
  .pb-group__title {\r
    flex: 1;\r
    min-width: 0;\r
    display: flex;\r
    flex-wrap: wrap;\r
    align-items: baseline;\r
    gap: 0.25rem 0.5rem;\r
  }\r
\r
  .pb-group > .pb-children {\r
    padding: 0.25rem 0.75rem;\r
  }\r
\r
  .pb-group > .pb-footer {\r
    padding: 0.5rem 0.75rem 0.75rem;\r
  }\r
\r
  .pb-children:empty {\r
    display: none;\r
  }\r
\r
  .pb-progress {\r
    font-size: 0.8125rem;\r
    color: var(--pb-muted);\r
    font-variant-numeric: tabular-nums;\r
    white-space: nowrap;\r
  }\r
\r
  .pb-progress[data-state='all'] {\r
    color: var(--pb-done);\r
    font-weight: 600;\r
  }\r
\r
  .pb-muted {\r
    color: var(--pb-muted);\r
    font-size: 0.8125rem;\r
  }\r
\r
  .pb-item {\r
    padding: 0.5rem 0;\r
    border-bottom: 1px solid var(--pb-surface);\r
  }\r
\r
  .pb-item:last-child {\r
    border-bottom: 0;\r
  }\r
\r
  .pb-item__row {\r
    display: flex;\r
    align-items: flex-start;\r
    gap: var(--pb-gap);\r
  }\r
\r
  .pb-item__main {\r
    flex: 1;\r
    min-width: 0;\r
  }\r
\r
  .pb-item > .pb-children {\r
    margin: 0.25rem 0 0 1.75rem;\r
    padding-left: 0.75rem;\r
    border-left: 2px solid var(--pb-surface);\r
  }\r
\r
  .pb-item > .pb-footer {\r
    margin: 0.25rem 0 0 1.75rem;\r
  }\r
\r
  /* With a mouse, an item's add buttons appear on hover or keyboard focus.\r
     Touch devices cannot hover, so they always see them. */\r
  @media (hover: hover) {\r
    .pb-item > .pb-footer {\r
      height: 0;\r
      margin-top: 0;\r
      overflow: hidden;\r
      opacity: 0;\r
    }\r
\r
    .pb-item:hover > .pb-footer,\r
    .pb-item:focus-within > .pb-footer,\r
    .pb-item > .pb-footer:has(details[open]) {\r
      height: auto;\r
      margin-top: 0.25rem;\r
      overflow: visible;\r
      opacity: 1;\r
    }\r
  }\r
\r
  .pb-check {\r
    width: 1.125rem;\r
    height: 1.125rem;\r
    margin: 0.15rem 0 0;\r
    accent-color: var(--pb-done);\r
    cursor: pointer;\r
    flex: none;\r
  }\r
\r
  .pb-title {\r
    all: unset;\r
    cursor: text;\r
    font-weight: 500;\r
    overflow-wrap: anywhere;\r
  }\r
\r
  [data-pb-done] > .pb-item__row .pb-title {\r
    color: var(--pb-muted);\r
  }\r
\r
  [data-pb-checked] > .pb-item__row .pb-title {\r
    text-decoration: line-through;\r
  }\r
\r
  [data-pb-excluded] > .pb-item__row .pb-item__main {\r
    opacity: 0.5;\r
    text-decoration: line-through;\r
  }\r
\r
  .pb-meta {\r
    display: flex;\r
    flex-wrap: wrap;\r
    gap: 0 0.75rem;\r
    font-size: 0.8125rem;\r
    color: var(--pb-muted);\r
  }\r
\r
  .pb-meta a {\r
    color: var(--pb-accent);\r
  }\r
\r
  .pb-badge {\r
    display: inline-block;\r
    font-size: 0.6875rem;\r
    line-height: 1;\r
    padding: 0.2rem 0.4rem;\r
    border-radius: 999px;\r
    background: var(--pb-surface);\r
    color: var(--pb-muted);\r
    border: 1px solid var(--pb-border);\r
    vertical-align: middle;\r
  }\r
\r
  .pb-badge--done {\r
    color: var(--pb-done);\r
    border-color: currentColor;\r
  }\r
\r
  .pb-note {\r
    padding: 0.35rem 0;\r
    font-size: 0.875rem;\r
    color: var(--pb-muted);\r
    white-space: pre-wrap;\r
  }\r
\r
  .pb-notes {\r
    margin-top: 0.25rem;\r
    font-size: 0.875rem;\r
    color: var(--pb-muted);\r
    white-space: pre-wrap;\r
  }\r
\r
  .pb-select {\r
    font: inherit;\r
    font-size: 0.8125rem;\r
    border: 1px solid var(--pb-border);\r
    border-radius: calc(var(--pb-radius) - 2px);\r
    background: var(--pb-bg);\r
    color: inherit;\r
    padding: 0.3rem;\r
    min-height: 2rem;\r
    max-width: 10rem;\r
  }\r
\r
  .pb-form {\r
    display: grid;\r
    gap: 0.5rem;\r
    padding: 0.5rem 0;\r
  }\r
\r
  .pb-field {\r
    display: grid;\r
    gap: 0.2rem;\r
    font-size: 0.8125rem;\r
    color: var(--pb-muted);\r
  }\r
\r
  .pb-input {\r
    font: inherit;\r
    color: var(--pb-text);\r
    border: 1px solid var(--pb-border);\r
    border-radius: calc(var(--pb-radius) - 2px);\r
    padding: 0.4rem 0.5rem;\r
    background: var(--pb-bg);\r
    width: 100%;\r
  }\r
\r
  .pb-input:focus {\r
    outline: 2px solid var(--pb-accent);\r
    outline-offset: -1px;\r
  }\r
\r
  .pb-empty {\r
    padding: 1.5rem;\r
    text-align: center;\r
    color: var(--pb-muted);\r
    border: 1px dashed var(--pb-border);\r
    border-radius: var(--pb-radius);\r
  }\r
\r
  .pb-status {\r
    min-height: 1.25rem;\r
    margin-top: var(--pb-gap);\r
    font-size: 0.8125rem;\r
    color: var(--pb-muted);\r
  }\r
\r
  .pb-status[data-state='offline'] {\r
    color: var(--pb-danger);\r
  }\r
\r
  .pb-toast {\r
    position: sticky;\r
    bottom: 1rem;\r
    display: flex;\r
    align-items: center;\r
    justify-content: space-between;\r
    gap: var(--pb-gap);\r
    margin-top: var(--pb-gap);\r
    padding: 0.6rem 0.75rem;\r
    border-radius: var(--pb-radius);\r
    background: var(--pb-text);\r
    color: var(--pb-bg);\r
    font-size: 0.875rem;\r
  }\r
\r
  .pb-toast[data-kind='error'] {\r
    background: var(--pb-danger);\r
  }\r
\r
  .pb-toast .pb-button {\r
    background: transparent;\r
    color: inherit;\r
    border-color: currentColor;\r
  }\r
\r
  /* ---- Drag and drop ---------------------------------------------------- */\r
\r
  .pb-drag-handle {\r
    appearance: none;\r
    flex: none;\r
    display: inline-grid;\r
    place-items: center;\r
    width: 1.5rem;\r
    min-height: 1.75rem;\r
    margin: -0.15rem -0.25rem 0 -0.4rem;\r
    padding: 0;\r
    border: 0;\r
    border-radius: 4px;\r
    background: transparent;\r
    color: var(--pb-muted);\r
    font: inherit;\r
    font-size: 1rem;\r
    line-height: 1;\r
    cursor: grab;\r
    opacity: 0.55;\r
    /* Let pointer events (not scrolling) handle touches on the handle. */\r
    touch-action: none;\r
    user-select: none;\r
  }\r
\r
  .pb-drag-handle:hover,\r
  .pb-drag-handle:focus-visible {\r
    opacity: 1;\r
    background: var(--pb-surface);\r
  }\r
\r
  .pb-drag-handle:focus-visible {\r
    outline: 2px solid var(--pb-accent);\r
    outline-offset: 1px;\r
  }\r
\r
  .pb-root--dragging,\r
  .pb-root--dragging * {\r
    cursor: grabbing !important;\r
    user-select: none;\r
  }\r
\r
  [data-pb-dragging] {\r
    opacity: 0.35;\r
  }\r
\r
  .pb-drag-ghost {\r
    position: fixed;\r
    left: 0;\r
    top: 0;\r
    z-index: 2147483647;\r
    pointer-events: none;\r
    margin: 0;\r
    background: var(--pb-bg);\r
    border: 1px solid var(--pb-border);\r
    border-radius: var(--pb-radius);\r
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.18);\r
    opacity: 0.95;\r
    padding: 0.25rem 0.75rem;\r
    font-family: var(--pb-font);\r
    color: var(--pb-text);\r
  }\r
\r
  [data-pb-drop='before'] {\r
    box-shadow: inset 0 3px 0 var(--pb-accent);\r
  }\r
\r
  [data-pb-drop='after'] {\r
    box-shadow: inset 0 -3px 0 var(--pb-accent);\r
  }\r
\r
  [data-pb-drop='inside'] {\r
    outline: 2px dashed var(--pb-accent);\r
    outline-offset: -2px;\r
  }\r
\r
  @media (prefers-reduced-motion: no-preference) {\r
    .pb-drag-ghost {\r
      transition: box-shadow 120ms;\r
    }\r
  }\r
\r
  /* ---- Mode switch ------------------------------------------------------ */\r
\r
  .pb-toolbar .pb-mode {\r
    margin-left: auto;\r
  }\r
\r
  .pb-mode {\r
    display: inline-flex;\r
  }\r
\r
  .pb-mode__option {\r
    border-radius: 0;\r
  }\r
\r
  .pb-mode__option:first-child {\r
    border-radius: calc(var(--pb-radius) - 2px) 0 0 calc(var(--pb-radius) - 2px);\r
  }\r
\r
  .pb-mode__option:last-child {\r
    border-radius: 0 calc(var(--pb-radius) - 2px) calc(var(--pb-radius) - 2px) 0;\r
    margin-left: -1px;\r
  }\r
\r
  .pb-mode__option[aria-pressed='true'] {\r
    position: relative;\r
    background: var(--pb-accent);\r
    border-color: var(--pb-accent);\r
    color: #fff;\r
  }\r
\r
  /* ---- Menus ("\u22EF" and "+ Add") ----------------------------------------- */\r
\r
  .pb-menu {\r
    position: relative;\r
    display: inline-block;\r
  }\r
\r
  .pb-menu__summary {\r
    list-style: none;\r
    display: inline-flex;\r
    align-items: center;\r
    user-select: none;\r
  }\r
\r
  .pb-menu__summary::-webkit-details-marker {\r
    display: none;\r
  }\r
\r
  .pb-menu--actions > .pb-menu__summary {\r
    border-color: transparent;\r
    background: transparent;\r
    color: var(--pb-muted);\r
    min-width: 2rem;\r
    justify-content: center;\r
    font-size: 1.1rem;\r
  }\r
\r
  .pb-menu--actions > .pb-menu__summary:hover,\r
  .pb-menu--actions[open] > .pb-menu__summary {\r
    color: var(--pb-text);\r
    background: var(--pb-surface);\r
  }\r
\r
  .pb-menu__summary:focus-visible {\r
    outline: 2px solid var(--pb-accent);\r
    outline-offset: 1px;\r
  }\r
\r
  .pb-menu__list {\r
    position: absolute;\r
    top: calc(100% + 0.25rem);\r
    right: 0;\r
    z-index: 20;\r
    display: grid;\r
    min-width: 10rem;\r
    padding: 0.25rem;\r
    background: var(--pb-bg);\r
    border: 1px solid var(--pb-border);\r
    border-radius: var(--pb-radius);\r
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);\r
  }\r
\r
  .pb-menu--add > .pb-menu__list {\r
    right: auto;\r
    left: 0;\r
  }\r
\r
  .pb-menu__item {\r
    appearance: none;\r
    border: 0;\r
    background: transparent;\r
    color: inherit;\r
    font: inherit;\r
    font-size: 0.875rem;\r
    text-align: left;\r
    padding: 0.45rem 0.6rem;\r
    border-radius: calc(var(--pb-radius) - 3px);\r
    cursor: pointer;\r
  }\r
\r
  .pb-menu__item:hover,\r
  .pb-menu__item:focus-visible {\r
    background: var(--pb-surface);\r
    outline: none;\r
  }\r
\r
  .pb-menu__item--danger {\r
    color: var(--pb-danger);\r
  }\r
\r
  /* Normal mode reads as a finished plan: titles are plain text. */\r
  .pb-root[data-pb-mode='view'] .pb-title {\r
    cursor: default;\r
  }\r
\r
  .pb-sr-only {\r
    position: absolute;\r
    width: 1px;\r
    height: 1px;\r
    overflow: hidden;\r
    clip: rect(0 0 0 0);\r
    white-space: nowrap;\r
  }\r
\r
  @media (max-width: 480px) {\r
    .pb-item__row > .pb-actions .pb-select {\r
      max-width: 7rem;\r
    }\r
  }\r
}\r
`;var he=!1,w=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly","mode"];_store=null;ownsStore=!1;_labels=T;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new H(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;_mode=null;focusModeToggle=!1;get store(){return this._store}set store(e){this.detachStore(),this._store=e,this.ownsStore=!1,e&&(this.attachStore(e),this.state=e.plan?"ready":"idle",this.scheduleRender())}realtime=void 0;stopRealtime=null;get labels(){return this._labels}set labels(e){this._labels={...T,...e},this.cache.clear(),this.persistent.clear(),this.scheduleRender()}get isReadOnly(){return this.hasAttribute("readonly")}get mode(){return this.isReadOnly?"view":this._mode??this.initialMode()}set mode(e){if(e!=="view"&&e!=="edit")return;let t=e!==this.mode;this._mode=e,this.rememberMode(e),this.getAttribute("mode")!==e&&this.setAttribute("mode",e),t&&(e==="view"&&(this.editingKey=null),this.cache.clear(),this.scheduleRender(),this.emit("mode",{mode:e}))}get canEdit(){return!this.isReadOnly&&this.mode==="edit"}initialMode(){let e=this.getAttribute("mode");if(e==="view"||e==="edit")return e;let t=this._store;if(!t?.plan)return"view";let n=Be(t.plan.id);return this._mode=n??(t.children(null).length===0?"edit":"view"),this._mode}rememberMode(e){let t=this._store?.plan?.id;if(t)try{localStorage.setItem(`plan-block:mode:${t}`,e)}catch{}}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),document.addEventListener("click",this.onDocumentClick),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():(this.scheduleRender(),this._store?.plan&&this.connectRealtime())}disconnectedCallback(){this.disconnectRealtime(),window.removeEventListener("plan-block-refresh",this.onRefresh),document.removeEventListener("click",this.onDocumentClick),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(e,t,n){t===n||!this.isConnected||((e==="plan"||e==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(e==="mode"&&(n==="view"||n==="edit")&&n!==this._mode&&(this._mode=n,n==="view"&&(this.editingKey=null)),this.cache.clear(),this.scheduleRender()))}async boot(){let e=this.getAttribute("plan");e&&await this.useStore(new E({transport:this.createTransport(e)}),{initial:this.readInitialData()??void 0,owned:!0})}async useStore(e,t={}){if(this._store&&this._store!==e&&this.ownsStore&&this._store.destroy(),this.detachStore(),this._store=e,this.ownsStore=t.owned??!1,this.attachStore(e),t.initial){e.hydrate(t.initial),this.state="ready",this.render(),this.connectRealtime(),this.emit("ready",{plan:e.plan});return}if(e.plan){this.state="ready",this.render(),this.connectRealtime();return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.connectRealtime(),this.emit("ready",{plan:e.plan})}catch(n){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:n instanceof Error?n.message:String(n)}})}this.render()}createTransport(e){if(this.getAttribute("transport")==="livewire"){let t=this.parentElement;for(;t&&!t.hasAttribute("wire:id");)t=t.parentElement;let n=t?.getAttribute("wire:id")??"";return new S(()=>Ae(n))}return new k({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:e})}onRefresh=e=>{let t=e.detail,n=Array.isArray(t)?t[0]?.plan:t?.plan;this._store?.plan&&(!n||n===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let e=me(this,"script[data-pb-initial]")[0];if(!e?.textContent)return null;try{return JSON.parse(e.textContent)}catch{return null}finally{e.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=e=>{let{command:t}=e.detail;this.emit(t.type.replace(/_/g,"-"),{id:t.block,command:t})};onError=e=>{let{error:t}=e.detail;this.showToast({message:t.message,kind:"error"}),this.emit("error",e.detail)};onSync=e=>{this.emit("sync",e.detail),this.scheduleRender()};attachStore(e){e.addEventListener("change",this.onChange),e.addEventListener("command",this.onCommand),e.addEventListener("error",this.onError),e.addEventListener("sync",this.onSync)}connectRealtime(){this.disconnectRealtime();let e=this._store;if(!e?.plan||this.realtime===null||this.getAttribute("realtime")==="off"||!this.isConnected)return;let t=globalThis.Echo,n=this.realtime!==void 0?this.realtime:t?re(t):null;n&&(this.stopRealtime=ie(e,n))}disconnectRealtime(){this.stopRealtime?.(),this.stopRealtime=null}detachStore(){this.disconnectRealtime();let e=this._store;e&&(e.removeEventListener("change",this.onChange),e.removeEventListener("command",this.onCommand),e.removeEventListener("error",this.onError),e.removeEventListener("sync",this.onSync),this.cache.clear(),this._mode=null)}adoptStyles(){let e=this.root instanceof ShadowRoot?this.root:document;if(!(e===document&&he)){try{let t=new CSSStyleSheet;t.replaceSync(X),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t]}catch{let t=a("style",{"data-plan-block":""},X);e===document?document.head.append(t):e.prepend(t)}e===document&&(he=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let u of me(this,"[data-pb-fallback]"))u.remove();this.container=a("div",{class:"pb-root"}),this.root.append(this.container)}let e=this._store,t=this._labels;if(!e||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(a("div",{class:"pb-empty"},t.loading));return}if(this.state==="failed"||!e.plan){this.container.replaceChildren(a("div",{class:"pb-empty",role:"alert"},t.loadFailed));return}let n=this.captureFocus(),i=new Set,o=e.children(null).map(u=>this.renderBlock(u,"",i,0));for(let u of this.cache.keys())i.has(u)||this.cache.delete(u);let s=this.ensure("list",()=>a("div",{class:"pb-list"})),l=this.mode,d=this.isReadOnly?t.emptyReadonly:l==="edit"?t.empty:t.emptyView;U(s,o.length?o:[a("div",{class:"pb-empty"},d)]);let c=this.isReadOnly?null:this.ensure(`toolbar-${l}`,()=>this.toolbar(l));this.container.dataset.pbMode=l;let p=a("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":e.syncState},e.syncState==="saving"?t.saving:e.syncState==="offline"?t.offline:""),h=this.toast?a("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},a("span",{},this.toast.message),a("div",{class:"pb-actions"},this.toast.action?a("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,a("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},t.dismiss))):null;U(this.container,[c,s,p,h].filter(u=>u!==null)),this.focusModeToggle&&c&&(this.focusModeToggle=!1,c.querySelector('[data-pb-action="mode"][aria-pressed="true"]')?.focus()),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${G(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(n)}captureFocus(){let e=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!e||!this.container?.contains(e))return null;let t=e.closest("[data-pb-key]")?.dataset.pbKey;if(!t)return null;let n=e.dataset?.pbAction,i=e.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":n?`[data-pb-action="${G(n)}"]`:null;return i?{key:t,selector:i,el:e}:null}restoreFocus(e){if(!e||(this.root instanceof ShadowRoot?this.root:document).activeElement===e.el)return;if(e.el.isConnected){e.el.focus();return}let n=this.root.querySelector(`[data-pb-key="${G(e.key)}"]`);[...n?.querySelectorAll(e.selector)??[]].find(o=>o.closest("[data-pb-key]")===n)?.focus()}toolbar(e){let t=this._labels,n=(i,o)=>a("button",{type:"button",class:"pb-button pb-mode__option","data-pb-action":"mode","data-pb-value":i,"aria-pressed":String(e===i)},o);return a("div",{class:"pb-toolbar"},e==="edit"?a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},t.addDay):null,e==="edit"?a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},t.addPool):null,a("div",{class:"pb-mode",role:"group","aria-label":t.mode},n("view",t.viewMode),n("edit",t.editMode)))}persistent=new Map;ensure(e,t){let n=this.persistent.get(e);return n||(n=t(),this.persistent.set(e,n)),n}renderBlock(e,t,n,i){let o=this._store,s=t+e.id,l=e.type==="link",d=(l?o.resolve(e.id):e)??e,c=o.type(d.type),p=this.editingKey===s;n.add(s);let h=JSON.stringify([e,l?d:null,p,this.isReadOnly,this.mode,e.parent?o.children(e.parent).length:0,o.children(d.id).map(g=>g.type).join(),o.children(null).map(g=>g.id+(g.payload.label??"")).join()]),u=this.cache.get(s);if(!u||u.signature!==h){let g=u?.children??a("div",{class:"pb-children","data-pb-children":""}),ge={block:e,target:d,type:c,isLink:l,children:g,editing:p,readonly:this.isReadOnly,mode:this.mode,canEdit:this.canEdit,store:o,labels:this._labels,h:a,parts:D},v=le(d.type)(ge);v.classList.add("pb-block"),v.dataset.pbId=e.id,v.dataset.pbKey=s,v.dataset.pbType=d.type,$(v,"pbLink",l),$(v,"pbChecked",d.checked),$(v,"pbDone",d.done),$(v,"pbExcluded",e.excluded),u={signature:h,el:v,children:g},this.cache.set(s,u)}let fe=l?`${s}>`:t,be=i>20?[]:o.children(d.id).map(g=>this.renderBlock(g,fe,n,i+1));return U(u.children,be),u.el}dragHost(){let e=this;return{get root(){return e.root},get container(){return e.container},get store(){return e._store},get readonly(){return!e.canEdit},move:(t,n,i)=>e._store?.move(t,{parent:n,after:i})}}listen(){this.listening=!0,this.root.addEventListener("click",e=>this.onClick(e)),this.root.addEventListener("change",e=>this.onInputChange(e)),this.root.addEventListener("submit",e=>this.onSubmit(e)),this.root.addEventListener("pointerdown",e=>this.drag.onPointerDown(e)),this.root.addEventListener("keydown",e=>{let t=e.key;if(t==="Escape"){let o=e.target?.closest("details[data-pb-menu][open]");if(o){o.open=!1,o.querySelector("summary")?.focus();return}}if(t==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let i=e.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(t==="ArrowUp"||t==="ArrowDown")&&i?.dataset.pbId&&this.canEdit&&(e.preventDefault(),this.shift(i.dataset.pbId,t==="ArrowUp"?-1:1))})}actionTarget(e){let t=e.target?.closest("[data-pb-action]");if(!t||!this.root.contains(t))return null;let n=t.closest("[data-pb-key]");return{action:t.dataset.pbAction,el:t,id:n?.dataset.pbId??null,key:n?.dataset.pbKey??null}}onDocumentClick=e=>{let t=e.composedPath();for(let n of this.root.querySelectorAll("details[data-pb-menu][open]"))t.includes(n)||(n.open=!1)};onClick(e){let t=this.actionTarget(e),n=this._store;if(!t||!n)return;let{action:i,el:o,id:s,key:l}=t,d=o.closest("details[data-pb-menu]");if(d&&i!=="link"&&(d.open=!1),!(i==="toggle-check"||i==="check-all"||i==="link")){switch(i){case"mode":this.focusModeToggle=!0,this.mode=o.dataset.pbValue;return;case"add":return this.add(o.dataset.pbType,o.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return n.restore(o.dataset.pbTarget??s),this.showToast(null)}if(s)switch(i){case"check":return n.check(s);case"uncheck":return n.uncheck(s);case"exclude":return n.exclude(s);case"include":return n.include(s);case"move-up":case"move-down":return this.shift(s,i==="move-up"?-1:1);case"delete":this.confirmDelete(s);return}}}onInputChange(e){let t=this.actionTarget(e),n=this._store;if(!t?.id||!n)return;let i=t.el;if(t.action==="toggle-check")n.setChecked(t.id,i.checked);else if(t.action==="check-all")i.checked?n.checkAll(t.id):n.uncheckAll(t.id);else if(t.action==="link"){let o=t.el.value;o&&(n.link(t.id,o,n.children(o).at(-1)?.id??null),t.el.value="")}}onSubmit(e){let t=e.target?.closest("[data-pb-form]");if(!t||!this._store)return;e.preventDefault();let n=t.closest("[data-pb-key]"),i=n?.dataset.pbId?this._store.resolve(n.dataset.pbId):void 0,o=i?this._store.type(i.type):void 0;if(!i||!o)return;let s={};for(let l of o.fields){let d=He(t,l),c=i.payload[l.name]??null;d!==c&&(s[l.name]=d)}Object.keys(s).length&&this._store.update(i.id,s),this.editingKey=null,this.scheduleRender()}add(e,t,n){let i=this._store,o=i.type(e),s=o?.fields.find(p=>p.type==="text"||p.type==="textarea"),l=s?.required?{[s.name]:this._labels.newItem(o?.label??e)}:{},d=i.children(t).at(-1)?.id??null,c=i.create(e,{parent:t,after:d,payload:l});if(s){let p=n?this.cache.get(n):void 0,h=n&&t&&p?.el.dataset.pbLink!==void 0?`${n}>`:n&&t?n.slice(0,-t.length):"";this.editingKey=h+c,this.focusEditor=!0}}shift(e,t){let n=this._store,i=n.get(e);if(!i)return;let o=n.children(i.parent),s=o.findIndex(l=>l.id===e);t===-1&&s>0?n.move(e,{after:s>=2?o[s-2].id:null}):t===1&&s<o.length-1&&n.move(e,{after:o[s+1].id})}async confirmDelete(e){let t=this._store,n=[];try{let i=await t.deleteImpact(e);n=[...new Set(i.links.map(o=>o.day?this._labels.day(o.day.number):this._labels.pool))]}catch{}n.length&&!window.confirm(this._labels.confirmDeleteLinked(n.join(", ")))||(t.delete(e),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:e}}))}showToast(e){this.toast=e,this.toastTimer&&clearTimeout(this.toastTimer),e&&(this.toastTimer=setTimeout(()=>this.showToast(null),e.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(e,t){this.dispatchEvent(new CustomEvent(`plan-block:${e}`,{detail:t,bubbles:!0,composed:!0}))}};function Be(r){try{let e=localStorage.getItem(`plan-block:mode:${r}`);return e==="view"||e==="edit"?e:null}catch{return null}}function He(r,e){let t=r.elements.namedItem(e.name);if(!t)return null;if(e.type==="toggle")return t.checked;let n=t.value.trim();return n===""?null:e.type==="number"?Number(n):n}function U(r,e){let t=r.children;t.length===e.length&&e.every((n,i)=>t[i]===n)||r.replaceChildren(...e)}function Ae(r,e=1e4){let t=()=>window.Livewire?.find(r);return new Promise((n,i)=>{let o=t();if(o)return n(o);let s=Date.now(),l=()=>{let p=t();p?(c(),n(p)):Date.now()-s>e&&(c(),i(new Error(`Livewire component ${r||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),c=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function me(r,e){return Array.from(r.children).filter(t=>t.matches(e))}function $(r,e,t){t?r.dataset[e]="":delete r.dataset[e]}function G(r){return r.replace(/["\\]/g,"\\$&")}function W(r="plan-block"){typeof customElements<"u"&&!customElements.get(r)&&customElements.define(r,r==="plan-block"?w:class extends w{})}W();var Oe={PlanStore:E,HttpTransport:k,LivewireTransport:S,RejectedError:m,TransportError:f,PlanBlockElement:w,renderer:N,parts:D,h:a,defaultLabels:T,defineElement:W,ulid:y};window.PlanBlock=Oe;})();
