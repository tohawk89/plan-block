"use strict";(()=>{function X(n,e,t){let r=e.args??{};switch(e.type){case"create":case"link":{if(n.has(e.block))return;let o=r.parent??null,a=e.type==="link"?"link":String(r.type),i=t?.types[a],l={};for(let d of i?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);n.set(e.block,{id:e.block,type:a,parent:o,order:de(n,o,r.after??null,null),source:e.type==="link"?r.source??null:null,attachable:r.attachable??null,payload:{...l,...r.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:i&&(i.rule==="all"||i.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let o=n.get(e.block);if(!o)return;n.set(o.id,{...o,payload:{...o.payload,...r.payload??{}}});return}case"move":{let o=n.get(e.block);if(!o)return;let a="parent"in r?r.parent??null:o.parent;n.set(o.id,{...o,parent:a,order:de(n,a,r.after??null,o.id)});return}case"check":case"uncheck":{let o=A(n,e.block);if(!o)return;O(n,o,e.type==="check",t),e.type==="check"&&Re(n,o,t);return}case"check_all":case"uncheck_all":{let o=A(n,e.block);if(!o)return;let a=e.type==="check_all";for(let i of E(n,o.id)){if(i.excluded)continue;let l=A(n,i.id);if(!l)continue;if(a&&t?.types[l.type]?.rule==="one"){let p=E(n,l.id).filter(u=>u.type!=="link"&&t.types[u.type]?.checkable),c=p.find(u=>!u.excluded);c&&!p.some(u=>u.checked)&&O(n,c,!0,t);continue}let d=a?[l]:[...le(n,l.id).reverse(),l];for(let p of d)p.type!=="link"&&t?.types[p.type]?.checkable&&O(n,p,a,t)}return}case"exclude":case"include":{let o=n.get(e.block);o&&n.set(o.id,{...o,excluded:e.type==="exclude"});return}case"delete":{let o=n.get(e.block);if(!o)return;let a=new Set([o.id,...le(n,o.id).map(i=>i.id)]);for(let i of n.values())i.source&&a.has(i.source)&&a.add(i.id);for(let i of a)n.delete(i);return}case"restore":return}}function A(n,e){let t=n.get(e);return t?.source?n.get(t.source)??t:t}function E(n,e){let t=[];for(let r of n.values())r.parent===e&&t.push(r);return t.sort((r,o)=>r.order-o.order||(r.id<o.id?-1:r.id>o.id?1:0))}function le(n,e){let t=[],r=[e],o=new Set;for(;r.length;){let a=r.pop();if(!o.has(a)){o.add(a);for(let i of E(n,a))t.push(i),r.push(i.id)}}return t}function O(n,e,t,r){let a=(r?.types[e.type]?.rule??"none")==="any"&&E(n,e.id).some(i=>!i.excluded&&i.done);n.set(e.id,{...e,checked:t,checked_at:t?new Date().toISOString():null,done:t||a})}function Re(n,e,t){let r=e.parent?n.get(e.parent):void 0;if(!(!r||t?.types[r.type]?.rule!=="one"))for(let o of E(n,r.id))o.id!==e.id&&o.checked&&o.type!=="link"&&O(n,o,!1,t)}function de(n,e,t,r){let o=E(n,e).filter(d=>d.id!==r);if(t===null){let d=o[0];return d?d.order/2:1024}let a=o.findIndex(d=>d.id===t),i=o[a];if(!i)return(o.at(-1)?.order??0)+1024;let l=o[a+1];return l?(i.order+l.order)/2:i.order+1024}var pe="0123456789abcdefghjkmnpqrstvwxyz";function k(n=Date.now()){let e="",t=n;for(let a=0;a<10;a++)e=pe.charAt(t%32)+e,t=Math.floor(t/32);let r=new Uint8Array(16);crypto.getRandomValues(r);let o="";for(let a of r)o+=pe.charAt(a%32);return e+o}var q=class{constructor(e,t,r){this.backend=e;this.planId=t;this.options=r}editorId=k();releaseLock=null;stopped=!1;get prefix(){return`plan-block:queue:${this.planId}:`}get ownKey(){return this.prefix+this.editorId}get legacyKey(){return`plan-block:queue:${this.planId}`}start(){this.options.locks?.request(ce(this.planId,this.editorId),()=>new Promise(e=>this.releaseLock=e)).catch(()=>{})}stop(){this.stopped=!0,this.releaseLock?.(),this.releaseLock=null}save(e){if(!this.stopped)try{if(e.length){let t={v:2,heartbeat:Date.now(),commands:e};this.backend.setItem(this.ownKey,JSON.stringify(t))}else this.backend.removeItem(this.ownKey)}catch{}}async adoptOrphans(){let e=async()=>{let r=await this.liveEditors(),o=[];for(let a of this.keys()){if(a===this.ownKey)continue;let i=a===this.legacyKey;if(!i&&!a.startsWith(this.prefix))continue;let l=Pe(this.backend.getItem(a)),d=i?null:a.slice(this.prefix.length);if(!(l&&d!==null&&(r?r.has(ce(this.planId,d)):Date.now()-l.heartbeat<this.options.staleMs))){l&&o.push(...l.commands);try{this.backend.removeItem(a)}catch{}}}return o};if(this.stopped)return[];let t=this.options.locks;if(!t)return e();try{return await t.request(`plan-block:adopt:${this.planId}`,e)}catch{return[]}}async liveEditors(){let e=this.options.locks;if(!e)return null;let t=await e.query();return new Set([...t.held??[],...t.pending??[]].map(r=>r.name??""))}keys(){let e=[];try{for(let t=0;t<this.backend.length;t++){let r=this.backend.key(t);r!==null&&e.push(r)}}catch{}return e}};function ce(n,e){return`plan-block:editor:${n}:${e}`}function Pe(n){if(!n)return null;try{let e=JSON.parse(n);if(Array.isArray(e))return{v:2,heartbeat:0,commands:e};if(e&&Array.isArray(e.commands))return e}catch{}return null}function ue(){try{let n=typeof navigator<"u"?navigator.locks:void 0;return n&&typeof n.request=="function"&&typeof n.query=="function"?n:null}catch{return null}}var m=class extends Error{constructor(t){super(t.message);this.error=t;this.name="RejectedError"}},f=class extends Error{constructor(t,r){super(t);this.status=r;this.name="TransportError"}},_=class{constructor(e){this.options=e;this.endpoint=e.endpoint.replace(/\/+$/,""),this.fetchFn=e.fetch??((t,r)=>fetch(t,r))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(e,t){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:e,commands:t})}deleteImpact(e){return this.request("GET",`/plans/${this.options.plan}/blocks/${e}/delete-impact`)}async request(e,t,r){let o={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},a=this.options.csrfToken!==void 0?this.options.csrfToken:Ie();a&&(o["X-CSRF-TOKEN"]=a);let i=Ae();i&&(o["X-Socket-ID"]=i),r!==void 0&&(o["Content-Type"]="application/json");let l;try{l=await this.fetchFn(this.endpoint+t,{method:e,headers:o,credentials:"same-origin",body:r===void 0?void 0:JSON.stringify(r)})}catch(u){throw new f(u instanceof Error?u.message:"Network error")}if(l.ok)return await l.json();let d=await l.json().catch(()=>null);if(l.status===422)throw new m(d?.error??{reason:"invalid_request",message:d?.message??"The request was invalid."});let c={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[l.status];throw c?new m(c):new f(d?.message??`Server error (${l.status})`,l.status)}};function Ae(){try{return globalThis.Echo?.socketId?.()??null}catch{return null}}function Ie(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var S=class extends EventTarget{constructor(t){super();this.options=t;this.storage=t.storage!==void 0?t.storage:Be(),this.retry=t.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;queue=null;queueTimer=null;retry;onOnline=()=>this.retryNow();async load(){let[t,r]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...t,manifest:r})}hydrate(t){this.plan=t.plan,this.manifest=t.manifest,this.confirmed=new Map(t.blocks.map(r=>[r.id,r])),this.recompute(),this.emit("change"),this.startQueue(),this.pending.length&&this.scheduleFlush()}applyRemote(t){if(!this.plan||this.destroyed||t.plan!==this.plan.id||t.version<=this.plan.version)return"ignored";if(t.previous_version!==this.plan.version||!t.blocks)return this.reload().catch(()=>{}),"reloading";for(let r of t.blocks)this.confirmed.set(r.id,r);for(let r of t.deleted??[])this.confirmed.delete(r);return this.plan={...this.plan,version:t.version},this.recompute(),this.emit("change"),this.emit("remote",{change:t}),"applied"}async reload(){let[t,r]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=t.plan,this.manifest=r,this.confirmed=new Map(t.blocks.map(o=>[o.id,o])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),this.queueTimer&&clearInterval(this.queueTimer),this.queue?.stop(),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}snapshotCache=null;subscribe(t){return this.addEventListener("change",t),this.addEventListener("sync",t),()=>{this.removeEventListener("change",t),this.removeEventListener("sync",t)}}getSnapshot(){return this.snapshotCache??={plan:this.plan,blocks:this.all(),syncState:this.syncState,pendingCount:this.pendingCount}}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(t){return this.view.get(t)}all(){return[...this.view.values()]}children(t){return E(this.view,t)}resolve(t){return A(this.view,t)}type(t){return this.manifest?.types[t]}create(t,r={}){let o=r.id??k();return this.dispatch("create",o,{type:t,parent:r.parent??null,after:r.after??null,payload:r.payload??{},...r.attachable?{attachable:r.attachable}:{}}),o}link(t,r,o=null){let a=k();return this.dispatch("link",a,{source:t,parent:r,after:o}),a}update(t,r){this.dispatch("update",t,{payload:r})}move(t,r){this.dispatch("move",t,"parent"in r?{parent:r.parent??null,after:r.after}:{after:r.after})}check(t){this.dispatch("check",t)}uncheck(t){this.dispatch("uncheck",t)}setChecked(t,r){this.dispatch(r?"check":"uncheck",t)}checkAll(t){this.dispatch("check_all",t)}uncheckAll(t){this.dispatch("uncheck_all",t)}exclude(t){this.dispatch("exclude",t)}include(t){this.dispatch("include",t)}delete(t){this.dispatch("delete",t)}restore(t){this.dispatch("restore",t)}deleteImpact(t){return this.options.transport.deleteImpact(t)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let t;try{t=await this.options.transport.send(this.version,this.inflight)}catch(r){r instanceof m?this.handleRejection(r.error):this.handleNetworkError(r);return}this.applyResult(t),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(t,r,o){let a={id:k(),type:t,block:r,...o?{args:o}:{}};this.pending.push(a),this.persistQueue(),X(this.view,a,this.manifest),this.emit("change"),this.emit("command",{command:a}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(t){if(t.full)this.confirmed=new Map(t.blocks.map(r=>[r.id,r]));else{for(let r of t.blocks)this.confirmed.set(r.id,r);for(let r of t.deleted)this.confirmed.delete(r)}this.plan&&(this.plan={...this.plan,version:t.version})}handleRejection(t){let r=this.inflight;if(this.inflight=[],t.reason==="unauthenticated"||t.reason==="session_expired"){this.pending=[...r,...this.pending],this.persistQueue(),this.setSync("offline",t.message),this.emit("error",{error:t,command:null});return}let o=r.findIndex(l=>l.id===t.command),a=o>=0?r[o]:void 0,i=a?r.filter(l=>l!==a):[];this.pending=[...i,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:t,command:a??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(t){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",t instanceof f?t.message:String(t));let r=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),r)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let t of[...this.inflight,...this.pending])X(this.view,t,this.manifest)}persistQueue(){this.queue?.save([...this.inflight,...this.pending])}startQueue(){if(!this.storage||!this.plan||this.queue||this.destroyed)return;let t=this.options.persistence??{},r=t.intervalMs??5e3;this.queue=new q(this.storage,this.plan.id,{staleMs:t.staleMs??r*3,locks:t.locks!==void 0?t.locks:ue()}),this.queue.start(),this.adoptOrphans(),this.queueTimer=setInterval(()=>{this.persistQueue(),this.adoptOrphans()},r)}async adoptOrphans(){let t=await this.queue?.adoptOrphans()??[];if(this.destroyed||!t.length)return;let r=new Set([...this.inflight,...this.pending].map(a=>a.id)),o=t.filter(a=>!r.has(a.id));o.length&&(this.pending.push(...o),this.persistQueue(),this.recompute(),this.emit("change"),this.scheduleFlush())}setSync(t,r){this.syncState=t,this.emit("sync",{state:t,pending:this.pendingCount,message:r})}emit(t,r={}){(t==="change"||t==="sync")&&(this.snapshotCache=null),this.dispatchEvent(new CustomEvent(t,{detail:r}))}};function Be(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var T=class{constructor(e,t=3e4){this.wire=e;this.timeoutMs=t}planData=null;async loadPlan(){let{plan:e,blocks:t}=await this.loadPlanData();return{plan:e,blocks:t}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(e,t){let r=await this.call("runCommands",t,e);if(!r.ok)throw new m(r.error);return r}deleteImpact(e){return this.call("deleteImpact",e)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(e,...t){let r=typeof this.wire=="function"?await this.wire():this.wire,o;try{return await Promise.race([r.$call(e,...t),new Promise((a,i)=>{o=setTimeout(()=>i(new f("Livewire request timed out")),this.timeoutMs)})])}catch(a){throw He(a)}finally{clearTimeout(o)}}};function He(n){if(n instanceof m||n instanceof f)return n;let e=typeof n=="object"&&n!==null&&"status"in n?n.status:null,r=e!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[e]:void 0;return r?new m(r):new f(e?`Server error (${e})`:n instanceof Error?n.message:"Network error",e??void 0)}function be(n){return{subscribe(e,t,r,o){let a=u=>r(u),i=n.private(e);i.listen(`.${t}`,a);let l=n.connector?.pusher?.connection,d=l?.state==="connected",p=!1,c=u=>{u.current==="connected"?(d&&p&&o(),d=!0,p=!1):d&&(p=!0)};return l?.bind("state_change",c),()=>{i.stopListening(`.${t}`,a),l?.unbind("state_change",c)}}}}function he(n,e){let t=n.manifest?.realtime;return!t?.enabled||!n.plan?()=>{}:e.subscribe(t.channel_prefix+n.plan.id,t.event,r=>n.applyRemote(r),()=>void n.reload().catch(()=>{}))}function s(n,e={},...t){let r=document.createElement(n);for(let[o,a]of Object.entries(e))a===!1||a===null||a===void 0||(o.startsWith(".")?r[o.slice(1)]=a:r.setAttribute(o,a===!0?"":String(a)));for(let o of t)o==null||o===!1||r.append(o instanceof Node?o:String(o));return r}function I(n,e,t,r){let o=n.type(t);if(!o)return!1;if(e===null)return o.root;let a=n.get(e),i=a?n.type(a.type):void 0;if(!a||!i||r&&(e===r||Fe(n,e,r)))return!1;let l=i.children,d=l.allow.includes(t)||l.any_content&&!o.structural,p=o.parents===null||o.parents.includes(a.type);if(!d||!p)return!1;let c=l.max[t];return c===void 0?!0:n.children(e).filter(h=>h.type===t&&h.id!==r).length<c}function Fe(n,e,t){let r=n.get(e),o=new Set;for(;r?.parent&&!o.has(r.id);){if(r.parent===t)return!0;o.add(r.id),r=n.get(r.parent)}return!1}var Oe=4,$=56,me=14,N=class{constructor(e){this.host=e}state=null;get dragging(){return this.state?.started??!1}onPointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;let t=this.host.store,r=e.target?.closest("[data-pb-drag-handle]");if(!r||!t||this.host.readonly||this.state)return;let o=r.closest("[data-pb-key]"),a=o?.dataset.pbId;if(!(!o||!a||!t.get(a))){e.preventDefault();try{r.setPointerCapture?.(e.pointerId)}catch{}this.state={id:a,el:o,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=e=>{let t=this.state;if(!(!t||e.pointerId!==t.pointerId)){if(t.x=e.clientX,t.y=e.clientY,!t.started){if(Math.hypot(t.x-t.startX,t.y-t.startY)<Oe)return;this.begin(t)}e.preventDefault(),this.positionGhost(t),this.updateDrop(t)}};onPointerUp=e=>{this.state&&e.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=e=>{e.key==="Escape"&&this.state&&(e.preventDefault(),e.stopPropagation(),this.finish(!1))};begin(e){e.started=!0;let t=e.el.getBoundingClientRect();e.offsetX=e.startX-t.left,e.offsetY=e.startY-t.top;let r=e.el.cloneNode(!0);for(let a of[r,...r.querySelectorAll("*")])for(let i of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])a.removeAttribute(i);r.classList.add("pb-drag-ghost"),r.setAttribute("aria-hidden","true"),r.style.width=`${t.width}px`,e.ghost=r,e.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(r);let o=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(o))};e.frame=requestAnimationFrame(o)}positionGhost(e){e.ghost&&(e.ghost.style.transform=`translate(${e.x-e.offsetX}px, ${e.y-e.offsetY}px)`)}autoScroll(e){let t=window.innerHeight,r=0;e.y<$?r=-me*(1-e.y/$):e.y>t-$&&(r=me*(1-(t-e.y)/$)),r!==0&&(window.scrollBy(0,r),this.updateDrop(e))}updateDrop(e){let t=this.findDrop(e);e.drop&&(e.drop.el!==t?.el||e.drop.position!==t?.position)&&delete e.drop.el.dataset.pbDrop,t&&(t.el.dataset.pbDrop=t.position),e.drop=t}findDrop(e){let t=this.host.store,r=t?.get(e.id);if(!t||!r)return null;let o=this.host.root,a=(o instanceof ShadowRoot?o:document).elementFromPoint(e.x,e.y);if(!a||(o instanceof ShadowRoot,!o.contains(a)))return null;let i=a.closest("[data-pb-key]");for(;i;){if(i===e.el||e.el.contains(i))return null;let l=i.dataset.pbId,d=t.get(l);if(!d)return null;if(I(t,d.parent,r.type,r.id)){let c=i.getBoundingClientRect(),u=e.y<c.top+c.height/2?"before":"after";return{el:i,position:u,parent:d.parent,after:this.afterFor(d.parent,l,u,r.id)}}let p=t.resolve(l)??d;if(I(t,p.id,r.type,r.id)){let c=t.children(p.id).filter(u=>u.id!==r.id).at(-1);return{el:i,position:"inside",parent:p.id,after:c?.id??null}}i=i.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(e,t,r,o){if(r==="after")return t;let a=this.host.store.children(e).filter(l=>l.id!==o),i=a.findIndex(l=>l.id===t);return i>0?a[i-1].id:null}finish(e){let t=this.state;if(!t||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(t.frame),t.ghost?.remove(),delete t.el.dataset.pbDragging,t.drop&&delete t.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!e||!t.started||!t.drop))return;let r=this.host.store?.get(t.id);if(!r)return;let{parent:o,after:a}=t.drop,i=this.host.store.children(r.parent),l=i[i.findIndex(d=>d.id===r.id)-1]?.id??null;(o!==r.parent||a!==l)&&this.host.move(r.id,o,a)}};var R={addDay:"+ Day",addPool:"+ Ideas",add:n=>`+ ${n}`,addMenu:"+ Add",mode:"Mode",viewMode:"Normal",editMode:"Edit",moreActions:"More actions",color:"Colour",autoColor:"Auto",backup:n=>`Backup ${n}`,main:"Main",makeMain:"Make main choice",wentTo:n=>`Went to ${n}`,noPlaceYet:"No place yet",backupCount:n=>n===1?"1 backup":`${n} backups`,showOptions:"Options",hideOptions:"Hide options",quickAddFirst:"Where? Type a place and press Enter",quickAddMore:"Add a backup and press Enter",quickAddEmpty:"Type a place name first",addPlace:"Add a place to this plan",newItem:n=>`New ${n.toLowerCase()}`,day:n=>`Day ${n}`,pool:"Ideas",checkAll:"Check all items",markDone:n=>`Mark "${n}" done`,progress:(n,e)=>`${n}/${e}`,poolProgress:(n,e)=>`${n} of ${e} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip",include:"Undo skip",addToDay:"Add to day\u2026",linked:"linked",linkedFrom:n=>`Also in ${n}`,doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day, or an ideas list for places you might visit.",emptyView:"Nothing planned yet. Switch to Edit to start.",emptyReadonly:"Nothing planned yet.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:n=>`This also appears in ${n}. Delete it everywhere?`};var fe=["coral","teal","purple","amber","blue","pink","green"],qe="gray",ge={breakfast:"08:00",lunch:"12:30",dinner:"19:30",activity:"10:00",stay:"15:00",travel:"09:00"};function G(n,e){return n.type(e.type)?.fields.find(t=>t.name==="color"&&t.type==="select")}function z(n,e){let t=G(n,e);if(!t)return null;let r=e.payload.color;if(typeof r=="string"&&(t.options??[]).some(o=>String(o.value)===r))return r;if(e.type==="timeline"){let o=e.day?.number??n.children(null).filter(a=>a.type==="timeline").indexOf(e)+1;return fe[(Math.max(1,o)-1)%fe.length]}return e.type==="pool"?qe:null}var ve=new Map;function J(n,e){ve.set(n,e)}function ke(n){return ve.get(n)??We[n]??Xe}function $e(n){return n?.fields.find(e=>e.type==="text")??n?.fields.find(e=>e.type==="textarea")}function V(n){let e=$e(n.type),t=e?n.target.payload[e.name]:void 0;return typeof t=="string"&&t!==""?t:n.type?.label??n.target.type}function L(n,e){let t=e??V(n);return n.canEdit?s("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:n.labels.edit},t):s("span",{class:"pb-title"},t)}function Ne(n,e,t,r={}){return s("button",{type:"button",class:`pb-button pb-button--ghost${n==="delete"?" pb-button--danger":""}`,"data-pb-action":n,"aria-label":e,title:e,...r},s("span",{"aria-hidden":"true"},t))}function y(n,e,t=!1){return s("button",{type:"button",class:`pb-menu__item${t?" pb-menu__item--danger":""}`,"data-pb-action":n},e)}function Q(n,e,t,r=""){return s("details",{class:`pb-menu${r?` ${r}`:""}`,"data-pb-menu":""},s("summary",{class:"pb-button pb-menu__summary","aria-label":e??void 0,title:e??void 0},n),s("div",{class:"pb-menu__list"},...t))}function Z(n,e){return Q(s("span",{"aria-hidden":"true"},"\u22EF"),n.labels.moreActions,e,"pb-menu--actions")}function B(n,e={}){if(!n.canEdit)return null;let{labels:t,block:r,store:o}=n,a=o.children(null).filter(d=>d.type==="timeline"),i=r.parent?o.get(r.parent):void 0,l=(n.type?.fields.length??0)>0;return s("div",{class:"pb-actions"},e.linkable&&i?.type==="pool"&&a.length>0?s("select",{class:"pb-select","data-pb-action":"link","aria-label":t.addToDay},s("option",{value:""},t.addToDay),...a.map(d=>s("option",{value:d.id},j(o,d,t)))):null,Z(n,[...e.extra??[],l?y("edit",t.edit):null,y("move-up",t.moveUp),y("move-down",t.moveDown),n.type?.root?null:y(r.excluded?"include":"exclude",r.excluded?t.include:t.exclude),y("delete",t.delete,!0)]))}function ee(n){if(!n.canEdit)return null;let{labels:e}=n;return s("div",{class:"pb-actions"},Z(n,[y("edit",e.edit),we(n),y("move-up",e.moveUp),y("move-down",e.moveDown),y("delete",e.delete,!0)]))}function we(n){let e=G(n.store,n.target);if(!e)return null;let t=z(n.store,n.target);return s("div",{class:"pb-swatches",role:"group","aria-label":n.labels.color},...(e.options??[]).map(r=>s("button",{type:"button",class:"pb-swatch","data-pb-action":"color","data-pb-color":String(r.value),"aria-label":r.label,title:r.label,"aria-pressed":String(t===String(r.value))})))}function te(n,e){let t=e>0?Math.round(n/e*100):0;return s("span",{class:"pb-meter","aria-hidden":"true"},s("span",{class:"pb-meter__fill",style:`width: ${t}%`}))}function Ee(n,e){if(!n.canEdit)return null;let t=e.filter(a=>W(n,a));if(!t.length)return null;let r=a=>n.store.type(a)?.label??a,o=a=>({type:"button","data-pb-action":"add","data-pb-type":a,"data-pb-parent":n.target.id});return t.length===1?s("div",{class:"pb-footer"},s("button",{...o(t[0]),class:"pb-button"},n.labels.add(r(t[0])))):s("div",{class:"pb-footer"},Q(n.labels.addMenu,null,t.map(a=>s("button",{...o(a),class:"pb-menu__item"},r(a))),"pb-menu--add"))}function W(n,e){return I(n.store,n.target.id,e)}function C(n){return!n.canEdit||n.editing?null:s("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":n.labels.dragHandle,title:n.labels.dragHandle},s("span",{"aria-hidden":"true"},"\u283F"))}function ne(n){return n.type?.checkable?s("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":n.target.checked,"aria-label":n.labels.markDone(V(n)),disabled:n.readonly}):null}function P(n){if(!n.isLink)return null;let e=_e(n.store,n.target,n.labels),t=e?n.labels.linkedFrom(e):n.labels.linked;return s("span",{class:"pb-badge pb-badge--link",title:t},`\u2197 ${t}`)}function _e(n,e,t){let r=e,o=new Set;for(;r?.parent&&!o.has(r.id);)o.add(r.id),r=n.get(r.parent);return r?r.type==="timeline"?j(n,r,t):r.type==="pool"?typeof r.payload.label=="string"&&r.payload.label!==""?r.payload.label:t.pool:null:null}function D(n){let{labels:e,target:t}=n;return s("form",{class:"pb-form","data-pb-form":""},...(n.type?.fields??[]).map(r=>Me(r,t.payload[r.name],e)),s("div",{class:"pb-actions"},s("button",{type:"submit",class:"pb-button pb-button--primary"},e.save),s("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},e.cancel)))}function Me(n,e,t){if(n.type==="select"&&n.name==="color")return ze(n,e,t);let r={name:n.name,class:"pb-input",required:n.required,"data-pb-field":n.type},o=e==null?"":String(e),a;switch(n.type){case"textarea":a=s("textarea",{...r,rows:3,maxlength:n.max},o);break;case"select":a=s("select",r,n.required?null:s("option",{value:""},"\u2014"),...(n.options??[]).map(i=>s("option",{value:String(i.value),selected:String(i.value)===o},i.label)));break;case"toggle":a=s("input",{name:n.name,type:"checkbox","data-pb-field":"toggle",".checked":e===!0||e===1||e==="1"});break;case"number":a=s("input",{...r,type:"number",step:"any",min:n.min,max:n.max,value:o});break;default:a=s("input",{...r,type:n.type==="text"?"text":n.type,maxlength:n.type==="text"||n.type==="url"?n.max:void 0,value:o})}return s("label",{class:"pb-field"},n.label,a)}function ze(n,e,t){let r=typeof e=="string"?e:"",o=(a,i,l)=>s("input",{type:"radio",name:n.name,value:a,class:`pb-swatch${l?` ${l}`:""}`,"data-pb-color":a||void 0,"aria-label":i,title:i,".checked":r===a});return s("fieldset",{class:"pb-field pb-swatch-field"},s("legend",{},n.label),s("div",{class:"pb-swatches"},n.required?null:o("",t?.autoColor??"Auto","pb-swatch--auto"),...(n.options??[]).map(a=>o(String(a.value),a.label,""))))}function j(n,e,t){let r=typeof e.payload.label=="string"&&e.payload.label!==""?` \xB7 ${e.payload.label}`:"",o=e.day?.number??n.children(null).filter(a=>a.type==="timeline").indexOf(e)+1;return t.day(o)+r}function xe(n){if(!n)return null;let e=new Date(`${n}T00:00:00`);return Number.isNaN(e.getTime())?n:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(e)}var H={title:L,titleOf:V,iconButton:Ne,menu:Q,menuItem:y,blockMenu:Z,itemActions:B,groupActions:ee,colorSwatches:we,meter:te,addButtons:Ee,groupAddButtons:re,optionRank:Se,rankBadge:Te,homeOf:_e,dragHandle:C,checkbox:ne,linkBadge:P,editForm:D,fieldInput:Me,dayTitle:j,formatDate:xe},Qe=n=>{let{target:e,labels:t,store:r}=n,o=e.progress??{state:"none",done:0,total:0},a=xe(e.day?.date??null);return s("section",{class:"pb-group pb-day"},s("header",{class:"pb-group__header"},C(n),s("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":o.state==="all",".indeterminate":o.state==="some","aria-label":t.checkAll,disabled:n.readonly||o.total===0}),s("div",{class:"pb-group__title"},n.editing?null:L(n,j(r,e,t)),a?s("span",{class:"pb-muted"},a):null,P(n)),te(o.done,o.total),s("span",{class:"pb-progress","data-state":o.state},t.progress(o.done,o.total)),ee(n)),n.editing?s("div",{class:"pb-children"},D(n)):null,n.children,re(n))},je=n=>{let{target:e,labels:t}=n,r=e.progress??{state:"none",done:0,total:0},o=typeof e.payload.label=="string"&&e.payload.label!==""?e.payload.label:t.pool;return s("section",{class:"pb-group pb-pool"},s("header",{class:"pb-group__header"},C(n),s("div",{class:"pb-group__title"},n.editing?null:L(n,o),P(n)),te(r.done,r.total),s("span",{class:"pb-progress"},t.poolProgress(r.done,r.total)),ee(n)),n.editing?s("div",{class:"pb-children"},D(n)):null,n.children,re(n))},ye=n=>{let{target:e,labels:t}=n,r=typeof e.payload.time=="string"?e.payload.time:null,o=typeof e.payload.maps_url=="string"?e.payload.maps_url:null,a=typeof e.payload.notes=="string"?e.payload.notes:null,i=e.type==="backup"&&e.parent?n.store.children(e.parent).filter(d=>d.type==="backup").findIndex(d=>d.id===e.id)+1:0,l=Se(n.store,e);return s("div",{class:"pb-item"},s("div",{class:"pb-item__row"},C(n),ne(n),s("div",{class:"pb-item__main"},n.editing?D(n):s("div",{},i>0?s("span",{class:"pb-badge pb-badge--backup"},t.backup(i)):null,l!==null?Te(l,t):null,i>0||l!==null?" ":null,L(n)," ",P(n),e.done&&!e.checked?s("span",{class:"pb-badge pb-badge--done"},t.doneViaBackup):null,r||o?s("div",{class:"pb-meta"},r?s("span",{},r):null,o?s("a",{href:o,target:"_blank",rel:"noopener noreferrer"},t.openMap):null):null,a?s("div",{class:"pb-notes"},a):null)),n.editing?null:B(n,{linkable:l===null,extra:l?[y("make-main",t.makeMain)]:[]})),n.children,n.editing||n.isLink||l!==null?null:Ee(n,["backup","note"]))};function Se(n,e){let t=e.parent?n.get(e.parent):void 0;if(!t||n.type(t.type)?.rule!=="one"||e.type!=="place")return null;let r=n.children(t.id).filter(o=>o.type==="place").findIndex(o=>o.id===e.id);return r<0?null:r}function Te(n,e){return n===0?s("span",{class:"pb-badge pb-badge--main"},`\u2605 ${e.main}`):s("span",{class:"pb-badge pb-badge--backup"},e.backup(n))}function Ye(n,e){let t=typeof e.payload.category=="string"&&e.payload.category!==""?e.payload.category:"other",o=n.store.type(e.type)?.fields.find(a=>a.name==="category")?.options?.find(a=>String(a.value)===t)?.label??n.store.type(e.type)?.label??t;return{value:t,label:o}}var Ke=n=>{let{target:e,labels:t,store:r}=n,o=Ye(n,e),a=typeof e.payload.title=="string"&&e.payload.title!==""?e.payload.title:o.label,i=typeof e.payload.time=="string"?e.payload.time:null,l=typeof e.payload.notes=="string"?e.payload.notes:null,d=r.children(e.id).filter(b=>b.type==="place"),p=d.findIndex(b=>b.checked),c=p>=0?d[p]:void 0,u=d.find(b=>!b.excluded),h=b=>typeof b.payload.name=="string"&&b.payload.name!==""?b.payload.name:r.type(b.type)?.label??"",x=n.type?.children.max.place,w=n.canEdit||n.expanded;n.children.hidden=!w;let v=c?s("div",{class:"pb-slot__summary pb-slot__summary--done"},`\u2713 ${t.wentTo(h(c))}`,p>0?" ":null,p>0?s("span",{class:"pb-badge pb-badge--backup"},t.backup(p)):null):s("div",{class:"pb-slot__summary"},u?h(u):s("span",{class:"pb-muted"},t.noPlaceYet)),K=!n.canEdit&&(d.length>1||c)?s("button",{type:"button",class:"pb-chip","data-pb-action":"toggle-expand","aria-expanded":String(n.expanded)},n.expanded?t.hideOptions:d.length>1?t.backupCount(d.length-1):t.showOptions,s("span",{"aria-hidden":"true"},n.expanded?" \u25B4":" \u25BE")):null,U=n.canEdit&&!n.isLink&&!n.editing&&(x===void 0||d.length<x)?s("input",{type:"text",class:"pb-input pb-quick-add","data-pb-action":"quick-add",placeholder:d.length?t.quickAddMore:t.quickAddFirst,"aria-label":t.addPlace,maxlength:r.type("place")?.fields.find(b=>b.name==="name")?.max,enterkeyhint:"done"}):null;return s("div",{class:"pb-item pb-slot","data-pb-category":o.value},s("div",{class:"pb-item__row"},C(n),s("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-slot",".checked":!!c,"aria-label":t.markDone(a),disabled:n.readonly||!u}),s("span",{class:"pb-slot__icon","aria-hidden":"true"}),s("div",{class:"pb-item__main"},n.editing?D(n):s("div",{},s("div",{class:"pb-slot__heading"},L(n,a),i?s("span",{class:"pb-muted"},i):null,P(n)),w&&!c?null:v,K,l?s("div",{class:"pb-notes"},l):null)),n.editing?null:B(n,{linkable:!0})),n.children,U)};function re(n){if(!n.canEdit)return null;let e=[],t=n.target.id;if(W(n,"slot")){let o=n.store.type("slot")?.fields.find(a=>a.name==="category");for(let a of o?.options??[]){let i=String(a.value),l=ge[i];e.push(s("button",{type:"button",class:"pb-menu__item pb-menu__item--plan","data-pb-action":"add","data-pb-type":"slot","data-pb-parent":t,"data-pb-payload":JSON.stringify(l?{category:i,time:l}:{category:i}),"data-pb-focus":"quick-add","data-pb-category":i},s("span",{class:"pb-slot__icon","aria-hidden":"true"}),a.label))}}let r=["place","note",...Ge(n)].filter(o=>W(n,o));e.length&&r.length&&e.push(s("div",{class:"pb-menu__divider",role:"separator"}));for(let o of r)e.push(s("button",{type:"button",class:"pb-menu__item","data-pb-action":"add","data-pb-type":o,"data-pb-parent":t},n.store.type(o)?.label??o));return e.length?s("div",{class:"pb-footer"},Q(n.labels.addMenu,null,e,"pb-menu--add")):null}var Ue=n=>s("div",{class:"pb-item pb-note-item"},s("div",{class:"pb-item__row"},C(n),s("div",{class:"pb-item__main"},n.editing?D(n):s("div",{class:"pb-note"},L(n))),n.editing?null:B(n))),Xe=n=>s("div",{class:"pb-item"},s("div",{class:"pb-item__row"},C(n),ne(n),s("div",{class:"pb-item__main"},n.editing?D(n):s("div",{},L(n)," ",P(n))),n.editing?null:B(n,{linkable:!0})),n.children);function Ge(n){let e=["timeline","pool","link","place","backup","note","slot"];return Object.keys(n.store.manifest?.types??{}).filter(t=>!e.includes(t))}var We={timeline:Qe,pool:je,place:ye,backup:ye,note:Ue,slot:Ke};var oe=`/*
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

    /* Day and ideas-list colours: base, soft (header tint), strong (text on soft). */
    --pb-coral: #D85A30;
    --pb-coral-soft: #FAECE7;
    --pb-coral-strong: #712B13;
    --pb-amber: #BA7517;
    --pb-amber-soft: #FAEEDA;
    --pb-amber-strong: #633806;
    --pb-green: #639922;
    --pb-green-soft: #EAF3DE;
    --pb-green-strong: #27500A;
    --pb-teal: #1D9E75;
    --pb-teal-soft: #E1F5EE;
    --pb-teal-strong: #085041;
    --pb-blue: #378ADD;
    --pb-blue-soft: #E6F1FB;
    --pb-blue-strong: #0C447C;
    --pb-purple: #7F77DD;
    --pb-purple-soft: #EEEDFE;
    --pb-purple-strong: #3C3489;
    --pb-pink: #D4537E;
    --pb-pink-soft: #FBEAF0;
    --pb-pink-strong: #72243E;
    --pb-gray: #888780;
    --pb-gray-soft: #F1EFE8;
    --pb-gray-strong: #444441;

    display: block;
    font-family: var(--pb-font);
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--pb-text);
  }

  /* Dark theme: theme="dark", or theme="auto" to follow the device. */
  plan-block[theme='dark'],
  :host([theme='dark']) {
    --pb-text: #e6edf3;
    --pb-muted: #9198a1;
    --pb-bg: #0d1117;
    --pb-surface: #161b22;
    --pb-border: #30363d;
    --pb-accent: #4493f8;
    --pb-done: #3fb950;
    --pb-danger: #f85149;
    color-scheme: dark;
    --pb-coral: #F0997B;
    --pb-coral-soft: #4A1B0C;
    --pb-coral-strong: #FAECE7;
    --pb-amber: #EF9F27;
    --pb-amber-soft: #412402;
    --pb-amber-strong: #FAEEDA;
    --pb-green: #97C459;
    --pb-green-soft: #173404;
    --pb-green-strong: #EAF3DE;
    --pb-teal: #5DCAA5;
    --pb-teal-soft: #04342C;
    --pb-teal-strong: #E1F5EE;
    --pb-blue: #85B7EB;
    --pb-blue-soft: #042C53;
    --pb-blue-strong: #E6F1FB;
    --pb-purple: #AFA9EC;
    --pb-purple-soft: #26215C;
    --pb-purple-strong: #EEEDFE;
    --pb-pink: #ED93B1;
    --pb-pink-soft: #4B1528;
    --pb-pink-strong: #FBEAF0;
    --pb-gray: #B4B2A9;
    --pb-gray-soft: #2C2C2A;
    --pb-gray-strong: #F1EFE8;
  }

  @media (prefers-color-scheme: dark) {
    plan-block[theme='auto'],
    :host([theme='auto']) {
      --pb-text: #e6edf3;
      --pb-muted: #9198a1;
      --pb-bg: #0d1117;
      --pb-surface: #161b22;
      --pb-border: #30363d;
      --pb-accent: #4493f8;
      --pb-done: #3fb950;
      --pb-danger: #f85149;
      color-scheme: dark;
      --pb-coral: #F0997B;
      --pb-coral-soft: #4A1B0C;
      --pb-coral-strong: #FAECE7;
      --pb-amber: #EF9F27;
      --pb-amber-soft: #412402;
      --pb-amber-strong: #FAEEDA;
      --pb-green: #97C459;
      --pb-green-soft: #173404;
      --pb-green-strong: #EAF3DE;
      --pb-teal: #5DCAA5;
      --pb-teal-soft: #04342C;
      --pb-teal-strong: #E1F5EE;
      --pb-blue: #85B7EB;
      --pb-blue-soft: #042C53;
      --pb-blue-strong: #E6F1FB;
      --pb-purple: #AFA9EC;
      --pb-purple-soft: #26215C;
      --pb-purple-strong: #EEEDFE;
      --pb-pink: #ED93B1;
      --pb-pink-soft: #4B1528;
      --pb-pink-strong: #FBEAF0;
      --pb-gray: #B4B2A9;
      --pb-gray-soft: #2C2C2A;
      --pb-gray-strong: #F1EFE8;
    }
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

  /* No overflow: hidden here, so menus can open past the card's edge. */
  .pb-group {
    border: 1px solid var(--pb-border);
    border-radius: var(--pb-radius);
    background: var(--pb-bg);
  }

  .pb-group__header {
    display: flex;
    align-items: center;
    gap: var(--pb-gap);
    padding: 0.6rem 0.75rem;
    background: var(--pb-surface);
    border-bottom: 1px solid var(--pb-border);
    border-radius: calc(var(--pb-radius) - 1px) calc(var(--pb-radius) - 1px) 0 0;
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
    .pb-item:focus-within > .pb-footer,
    .pb-item > .pb-footer:has(details[open]) {
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

  /* ---- Colours ----------------------------------------------------------- */

  [data-pb-color='coral'] {
    --pb-tone: var(--pb-coral);
    --pb-tone-soft: var(--pb-coral-soft);
    --pb-tone-strong: var(--pb-coral-strong);
  }

  [data-pb-color='amber'] {
    --pb-tone: var(--pb-amber);
    --pb-tone-soft: var(--pb-amber-soft);
    --pb-tone-strong: var(--pb-amber-strong);
  }

  [data-pb-color='green'] {
    --pb-tone: var(--pb-green);
    --pb-tone-soft: var(--pb-green-soft);
    --pb-tone-strong: var(--pb-green-strong);
  }

  [data-pb-color='teal'] {
    --pb-tone: var(--pb-teal);
    --pb-tone-soft: var(--pb-teal-soft);
    --pb-tone-strong: var(--pb-teal-strong);
  }

  [data-pb-color='blue'] {
    --pb-tone: var(--pb-blue);
    --pb-tone-soft: var(--pb-blue-soft);
    --pb-tone-strong: var(--pb-blue-strong);
  }

  [data-pb-color='purple'] {
    --pb-tone: var(--pb-purple);
    --pb-tone-soft: var(--pb-purple-soft);
    --pb-tone-strong: var(--pb-purple-strong);
  }

  [data-pb-color='pink'] {
    --pb-tone: var(--pb-pink);
    --pb-tone-soft: var(--pb-pink-soft);
    --pb-tone-strong: var(--pb-pink-strong);
  }

  [data-pb-color='gray'] {
    --pb-tone: var(--pb-gray);
    --pb-tone-soft: var(--pb-gray-soft);
    --pb-tone-strong: var(--pb-gray-strong);
  }

  .pb-group[data-pb-color] {
    border-color: color-mix(in srgb, var(--pb-tone) 40%, var(--pb-border));
  }

  .pb-group[data-pb-color] > .pb-group__header {
    background: var(--pb-tone-soft);
    color: var(--pb-tone-strong);
    border-bottom-color: color-mix(in srgb, var(--pb-tone) 40%, transparent);
  }

  .pb-group[data-pb-color] > .pb-group__header .pb-muted,
  .pb-group[data-pb-color] > .pb-group__header .pb-progress,
  .pb-group[data-pb-color] > .pb-group__header .pb-menu--actions > .pb-menu__summary,
  .pb-group[data-pb-color] > .pb-group__header .pb-drag-handle {
    color: var(--pb-tone-strong);
  }

  .pb-group[data-pb-color] > .pb-group__header .pb-check {
    accent-color: var(--pb-tone-strong);
  }

  .pb-group[data-pb-color] > .pb-group__header .pb-badge {
    background: transparent;
    color: inherit;
    border-color: currentColor;
  }

  /* Nested backups and notes pick up their day's colour. */
  .pb-group[data-pb-color] .pb-item > .pb-children {
    border-left-color: color-mix(in srgb, var(--pb-tone) 35%, transparent);
  }

  .pb-badge--backup {
    background: var(--pb-tone-soft, var(--pb-surface));
    color: var(--pb-tone-strong, var(--pb-muted));
    border-color: transparent;
  }

  .pb-meter {
    flex: none;
    width: 4rem;
    height: 0.375rem;
    border-radius: 999px;
    background: var(--pb-bg);
    overflow: hidden;
  }

  .pb-meter__fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--pb-tone, var(--pb-done));
  }

  @media (prefers-reduced-motion: no-preference) {
    .pb-meter__fill {
      transition: width 200ms ease-out;
    }
  }

  [data-pb-complete] > .pb-group__header .pb-meter__fill {
    background: var(--pb-done);
  }

  [data-pb-complete] > .pb-group__header .pb-progress::before {
    content: '\u2713 ';
  }

  .pb-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.4rem 0.6rem;
  }

  .pb-swatch {
    appearance: none;
    flex: none;
    width: 1.375rem;
    height: 1.375rem;
    margin: 0;
    padding: 0;
    border-radius: 50%;
    border: 2px solid var(--pb-bg);
    background: var(--pb-tone, var(--pb-surface));
    box-shadow: 0 0 0 1px var(--pb-border);
    cursor: pointer;
  }

  .pb-swatch:hover {
    box-shadow: 0 0 0 1px var(--pb-text);
  }

  .pb-swatch[aria-pressed='true'],
  .pb-swatch:checked {
    box-shadow: 0 0 0 2px var(--pb-text);
  }

  .pb-swatch:focus-visible {
    outline: 2px solid var(--pb-accent);
    outline-offset: 2px;
  }

  /* "Auto" (no stored colour): a split swatch. */
  .pb-swatch--auto {
    background: linear-gradient(135deg, var(--pb-coral) 50%, var(--pb-teal) 50%);
  }

  .pb-swatch-field {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }

  .pb-swatch-field legend {
    padding: 0;
    margin-bottom: 0.2rem;
  }

  .pb-swatch-field .pb-swatches {
    padding: 0.2rem 0.1rem;
  }

  /* ---- Plans (Breakfast, Lunch\u2026) and their options ---------------------- */

  [data-pb-category='breakfast'] {
    --pb-cat: var(--pb-amber);
    --pb-cat-soft: var(--pb-amber-soft);
    --pb-cat-strong: var(--pb-amber-strong);
    --pb-cat-icon: '\u2615';
  }

  [data-pb-category='lunch'] {
    --pb-cat: var(--pb-coral);
    --pb-cat-soft: var(--pb-coral-soft);
    --pb-cat-strong: var(--pb-coral-strong);
    --pb-cat-icon: '\u{1F35C}';
  }

  [data-pb-category='dinner'] {
    --pb-cat: var(--pb-purple);
    --pb-cat-soft: var(--pb-purple-soft);
    --pb-cat-strong: var(--pb-purple-strong);
    --pb-cat-icon: '\u{1F37D}\uFE0F';
  }

  [data-pb-category='activity'] {
    --pb-cat: var(--pb-teal);
    --pb-cat-soft: var(--pb-teal-soft);
    --pb-cat-strong: var(--pb-teal-strong);
    --pb-cat-icon: '\u{1F3A1}';
  }

  [data-pb-category='stay'] {
    --pb-cat: var(--pb-blue);
    --pb-cat-soft: var(--pb-blue-soft);
    --pb-cat-strong: var(--pb-blue-strong);
    --pb-cat-icon: '\u{1F3E8}';
  }

  [data-pb-category='travel'] {
    --pb-cat: var(--pb-gray);
    --pb-cat-soft: var(--pb-gray-soft);
    --pb-cat-strong: var(--pb-gray-strong);
    --pb-cat-icon: '\u{1F697}';
  }

  [data-pb-category='other'] {
    --pb-cat: var(--pb-pink);
    --pb-cat-soft: var(--pb-pink-soft);
    --pb-cat-strong: var(--pb-pink-strong);
    --pb-cat-icon: '\u{1F4CC}';
  }

  .pb-slot__icon {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: calc(var(--pb-radius) - 2px);
    background: var(--pb-cat-soft, var(--pb-surface));
    font-size: 1.05rem;
    line-height: 1;
  }

  .pb-slot__icon::before {
    content: var(--pb-cat-icon, '\u2022');
  }

  .pb-slot > .pb-item__row {
    align-items: center;
  }

  .pb-slot__heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.5rem;
  }

  .pb-slot__heading .pb-title {
    color: var(--pb-cat-strong, var(--pb-text));
  }

  .pb-slot__summary {
    font-size: 0.9375rem;
    overflow-wrap: anywhere;
  }

  .pb-slot__summary--done {
    color: var(--pb-done);
  }

  .pb-chip {
    appearance: none;
    margin-top: 0.25rem;
    padding: 0.15rem 0.6rem;
    border: 1px solid var(--pb-border);
    border-radius: 999px;
    background: transparent;
    color: var(--pb-muted);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .pb-chip:hover {
    color: var(--pb-text);
    border-color: var(--pb-cat, var(--pb-accent));
  }

  .pb-chip:focus-visible {
    outline: 2px solid var(--pb-accent);
    outline-offset: 1px;
  }

  .pb-children[hidden] {
    display: none;
  }

  /* Options line up under the plan's title, on a line in its colour. */
  .pb-slot > .pb-children {
    margin: 0.25rem 0 0 3.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid color-mix(in srgb, var(--pb-cat, var(--pb-border)) 45%, transparent);
  }

  .pb-group[data-pb-color] .pb-slot > .pb-children {
    border-left-color: color-mix(in srgb, var(--pb-cat, var(--pb-border)) 45%, transparent);
  }

  .pb-slot > .pb-children > .pb-item {
    padding: 0.3rem 0;
  }

  .pb-quick-add {
    display: block;
    width: calc(100% - 3.25rem);
    margin: 0.35rem 0 0 3.25rem;
    font-size: 0.875rem;
  }

  .pb-badge--main {
    background: var(--pb-cat-soft, var(--pb-surface));
    color: var(--pb-cat-strong, var(--pb-text));
    border-color: transparent;
  }

  .pb-menu__item--plan {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pb-menu__item--plan .pb-slot__icon {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.85rem;
  }

  .pb-menu__divider {
    height: 1px;
    margin: 0.25rem 0.25rem;
    background: var(--pb-border);
  }

  .pb-menu--add > .pb-menu__list {
    min-width: 12rem;
  }

  @media (max-width: 480px) {
    .pb-slot > .pb-children,
    .pb-quick-add {
      margin-left: 1.5rem;
    }

    .pb-quick-add {
      width: calc(100% - 1.5rem);
    }
  }

  /* ---- Mode switch ------------------------------------------------------ */

  .pb-toolbar .pb-mode {
    margin-left: auto;
  }

  .pb-mode {
    display: inline-flex;
  }

  .pb-mode__option {
    border-radius: 0;
  }

  .pb-mode__option:first-child {
    border-radius: calc(var(--pb-radius) - 2px) 0 0 calc(var(--pb-radius) - 2px);
  }

  .pb-mode__option:last-child {
    border-radius: 0 calc(var(--pb-radius) - 2px) calc(var(--pb-radius) - 2px) 0;
    margin-left: -1px;
  }

  .pb-mode__option[aria-pressed='true'] {
    position: relative;
    background: var(--pb-accent);
    border-color: var(--pb-accent);
    color: #fff;
  }

  /* ---- Menus ("\u22EF" and "+ Add") ----------------------------------------- */

  .pb-menu {
    position: relative;
    display: inline-block;
  }

  .pb-menu__summary {
    list-style: none;
    display: inline-flex;
    align-items: center;
    user-select: none;
  }

  .pb-menu__summary::-webkit-details-marker {
    display: none;
  }

  .pb-menu--actions > .pb-menu__summary {
    border-color: transparent;
    background: transparent;
    color: var(--pb-muted);
    min-width: 2rem;
    justify-content: center;
    font-size: 1.1rem;
  }

  .pb-menu--actions > .pb-menu__summary:hover,
  .pb-menu--actions[open] > .pb-menu__summary {
    color: var(--pb-text);
    background: var(--pb-surface);
  }

  .pb-menu__summary:focus-visible {
    outline: 2px solid var(--pb-accent);
    outline-offset: 1px;
  }

  .pb-menu__list {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    z-index: 20;
    display: grid;
    min-width: 10rem;
    padding: 0.25rem;
    background: var(--pb-bg);
    border: 1px solid var(--pb-border);
    border-radius: var(--pb-radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
  }

  .pb-menu--add > .pb-menu__list {
    right: auto;
    left: 0;
  }

  .pb-menu__item {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-radius: calc(var(--pb-radius) - 3px);
    cursor: pointer;
  }

  .pb-menu__item:hover,
  .pb-menu__item:focus-visible {
    background: var(--pb-surface);
    outline: none;
  }

  .pb-menu__item--danger {
    color: var(--pb-danger);
  }

  /* Normal mode reads as a finished plan: titles are plain text. */
  .pb-root[data-pb-mode='view'] .pb-title {
    cursor: default;
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
    .pb-item__row > .pb-actions .pb-select {
      max-width: 7rem;
    }
  }
}
`;var Le=!1,M=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly","mode"];_store=null;ownsStore=!1;_labels=R;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new N(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;_mode=null;focusModeToggle=!1;expanded=new Set;focusQuickAdd=null;get store(){return this._store}set store(e){this.detachStore(),this._store=e,this.ownsStore=!1,e&&(this.attachStore(e),this.state=e.plan?"ready":"idle",this.scheduleRender())}realtime=void 0;stopRealtime=null;get labels(){return this._labels}set labels(e){this._labels={...R,...e},this.cache.clear(),this.persistent.clear(),this.scheduleRender()}get isReadOnly(){return this.hasAttribute("readonly")}get mode(){return this.isReadOnly?"view":this._mode??this.initialMode()}set mode(e){if(e!=="view"&&e!=="edit")return;let t=e!==this.mode;this._mode=e,this.rememberMode(e),this.getAttribute("mode")!==e&&this.setAttribute("mode",e),t&&(e==="view"&&(this.editingKey=null),this.cache.clear(),this.scheduleRender(),this.emit("mode",{mode:e}))}get canEdit(){return!this.isReadOnly&&this.mode==="edit"}initialMode(){let e=this.getAttribute("mode");if(e==="view"||e==="edit")return e;let t=this._store;if(!t?.plan)return"view";let r=Ze(t.plan.id);return this._mode=r??(t.children(null).length===0?"edit":"view"),this._mode}rememberMode(e){let t=this._store?.plan?.id;if(t)try{localStorage.setItem(`plan-block:mode:${t}`,e)}catch{}}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),document.addEventListener("click",this.onDocumentClick),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():(this.scheduleRender(),this._store?.plan&&this.connectRealtime())}disconnectedCallback(){this.disconnectRealtime(),window.removeEventListener("plan-block-refresh",this.onRefresh),document.removeEventListener("click",this.onDocumentClick),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(e,t,r){t===r||!this.isConnected||((e==="plan"||e==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(e==="mode"&&(r==="view"||r==="edit")&&r!==this._mode&&(this._mode=r,r==="view"&&(this.editingKey=null)),this.cache.clear(),this.scheduleRender()))}async boot(){let e=this.getAttribute("plan");e&&await this.useStore(new S({transport:this.createTransport(e)}),{initial:this.readInitialData()??void 0,owned:!0})}async useStore(e,t={}){if(this._store&&this._store!==e&&this.ownsStore&&this._store.destroy(),this.detachStore(),this._store=e,this.ownsStore=t.owned??!1,this.attachStore(e),t.initial){e.hydrate(t.initial),this.state="ready",this.render(),this.connectRealtime(),this.emit("ready",{plan:e.plan});return}if(e.plan){this.state="ready",this.render(),this.connectRealtime();return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.connectRealtime(),this.emit("ready",{plan:e.plan})}catch(r){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:r instanceof Error?r.message:String(r)}})}this.render()}createTransport(e){if(this.getAttribute("transport")==="livewire"){let t=this.parentElement;for(;t&&!t.hasAttribute("wire:id");)t=t.parentElement;let r=t?.getAttribute("wire:id")??"";return new T(()=>tt(r))}return new _({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:e})}onRefresh=e=>{let t=e.detail,r=Array.isArray(t)?t[0]?.plan:t?.plan;this._store?.plan&&(!r||r===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let e=Ce(this,"script[data-pb-initial]")[0];if(!e?.textContent)return null;try{return JSON.parse(e.textContent)}catch{return null}finally{e.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=e=>{let{command:t}=e.detail;this.emit(t.type.replace(/_/g,"-"),{id:t.block,command:t})};onError=e=>{let{error:t}=e.detail;this.showToast({message:t.message,kind:"error"}),this.emit("error",e.detail)};onSync=e=>{this.emit("sync",e.detail),this.scheduleRender()};attachStore(e){e.addEventListener("change",this.onChange),e.addEventListener("command",this.onCommand),e.addEventListener("error",this.onError),e.addEventListener("sync",this.onSync)}connectRealtime(){this.disconnectRealtime();let e=this._store;if(!e?.plan||this.realtime===null||this.getAttribute("realtime")==="off"||!this.isConnected)return;let t=globalThis.Echo,r=this.realtime!==void 0?this.realtime:t?be(t):null;r&&(this.stopRealtime=he(e,r))}disconnectRealtime(){this.stopRealtime?.(),this.stopRealtime=null}detachStore(){this.disconnectRealtime();let e=this._store;e&&(e.removeEventListener("change",this.onChange),e.removeEventListener("command",this.onCommand),e.removeEventListener("error",this.onError),e.removeEventListener("sync",this.onSync),this.cache.clear(),this._mode=null)}adoptStyles(){let e=this.root instanceof ShadowRoot?this.root:document;if(!(e===document&&Le)){try{let t=new CSSStyleSheet;t.replaceSync(oe),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t]}catch{let t=s("style",{"data-plan-block":""},oe);e===document?document.head.append(t):e.prepend(t)}e===document&&(Le=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let h of Ce(this,"[data-pb-fallback]"))h.remove();this.container=s("div",{class:"pb-root"}),this.root.append(this.container)}let e=this._store,t=this._labels;if(!e||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(s("div",{class:"pb-empty"},t.loading));return}if(this.state==="failed"||!e.plan){this.container.replaceChildren(s("div",{class:"pb-empty",role:"alert"},t.loadFailed));return}let r=this.captureFocus(),o=new Set,a=e.children(null).map(h=>this.renderBlock(h,"",o,0));for(let h of this.cache.keys())o.has(h)||this.cache.delete(h);let i=this.ensure("list",()=>s("div",{class:"pb-list"})),l=this.mode,d=this.isReadOnly?t.emptyReadonly:l==="edit"?t.empty:t.emptyView;ae(i,a.length?a:[s("div",{class:"pb-empty"},d)]);let p=this.isReadOnly?null:this.ensure(`toolbar-${l}`,()=>this.toolbar(l));this.container.dataset.pbMode=l;let c=s("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":e.syncState},e.syncState==="saving"?t.saving:e.syncState==="offline"?t.offline:""),u=this.toast?s("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},s("span",{},this.toast.message),s("div",{class:"pb-actions"},this.toast.action?s("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,s("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},t.dismiss))):null;ae(this.container,[p,i,c,u].filter(h=>h!==null)),this.focusModeToggle&&p&&(this.focusModeToggle=!1,p.querySelector('[data-pb-action="mode"][aria-pressed="true"]')?.focus()),this.focusQuickAdd&&(this.root.querySelector(`[data-pb-key="${Y(this.focusQuickAdd)}"] [data-pb-action="quick-add"]`)?.focus(),this.focusQuickAdd=null),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${Y(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(r)}captureFocus(){let e=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!e||!this.container?.contains(e))return null;let t=e.closest("[data-pb-key]")?.dataset.pbKey;if(!t)return null;let r=e.dataset?.pbAction,o=e.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":r?`[data-pb-action="${Y(r)}"]`:null;return o?{key:t,selector:o,el:e}:null}restoreFocus(e){if(!e||(this.root instanceof ShadowRoot?this.root:document).activeElement===e.el)return;if(e.el.isConnected){e.el.focus();return}let r=this.root.querySelector(`[data-pb-key="${Y(e.key)}"]`);[...r?.querySelectorAll(e.selector)??[]].find(a=>a.closest("[data-pb-key]")===r)?.focus()}toolbar(e){let t=this._labels,r=(o,a)=>s("button",{type:"button",class:"pb-button pb-mode__option","data-pb-action":"mode","data-pb-value":o,"aria-pressed":String(e===o)},a);return s("div",{class:"pb-toolbar"},e==="edit"?s("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},t.addDay):null,e==="edit"?s("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},t.addPool):null,s("div",{class:"pb-mode",role:"group","aria-label":t.mode},r("view",t.viewMode),r("edit",t.editMode)))}persistent=new Map;ensure(e,t){let r=this.persistent.get(e);return r||(r=t(),this.persistent.set(e,r)),r}renderBlock(e,t,r,o){let a=this._store,i=t+e.id,l=e.type==="link",d=(l?a.resolve(e.id):e)??e,p=a.type(d.type),c=this.editingKey===i,u=this.expanded.has(i),h=e.parent?a.type(a.get(e.parent)?.type??"")?.rule:void 0,x=p?.rule;r.add(i);let w=JSON.stringify([e,l?d:null,c,u,this.isReadOnly,this.mode,h==="one"?a.children(e.parent).map(b=>b.id).join():null,x==="one"?a.children(d.id).map(b=>[b.id,b.checked,b.excluded,b.payload.name]):null,e.parent?a.children(e.parent).length:0,a.children(d.id).map(b=>b.type).join(),a.children(null).map(b=>b.id+(b.payload.label??"")).join()]),v=this.cache.get(i);if(!v||v.signature!==w){let b=v?.children??s("div",{class:"pb-children","data-pb-children":""}),De={block:e,target:d,type:p,isLink:l,children:b,editing:c,readonly:this.isReadOnly,mode:this.mode,canEdit:this.canEdit,expanded:u,store:a,labels:this._labels,h:s,parts:H},g=ke(d.type)(De);g.classList.add("pb-block"),g.dataset.pbId=e.id,g.dataset.pbKey=i,g.dataset.pbType=d.type,F(g,"pbLink",l),F(g,"pbChecked",d.checked),F(g,"pbDone",d.done),F(g,"pbExcluded",e.excluded),F(g,"pbComplete",d.progress?.state==="all"&&d.progress.total>0);let se=z(a,d);se?g.dataset.pbColor=se:delete g.dataset.pbColor,v={signature:w,el:g,children:b},this.cache.set(i,v)}let K=l?`${i}>`:t,U=o>20?[]:a.children(d.id).map(b=>this.renderBlock(b,K,r,o+1));return ae(v.children,U),v.el}dragHost(){let e=this;return{get root(){return e.root},get container(){return e.container},get store(){return e._store},get readonly(){return!e.canEdit},move:(t,r,o)=>e._store?.move(t,{parent:r,after:o})}}listen(){this.listening=!0,this.root.addEventListener("click",e=>this.onClick(e)),this.root.addEventListener("change",e=>this.onInputChange(e)),this.root.addEventListener("submit",e=>this.onSubmit(e)),this.root.addEventListener("pointerdown",e=>this.drag.onPointerDown(e)),this.root.addEventListener("keydown",e=>{let t=e.key;if(t==="Escape"){let i=e.target?.closest("details[data-pb-menu][open]");if(i){i.open=!1,i.querySelector("summary")?.focus();return}}let r=e.target?.closest('input[data-pb-action="quick-add"]');if(r&&(t==="Enter"||t==="Escape")){e.preventDefault(),t==="Escape"?r.blur():this.quickAdd(r);return}if(t==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let a=e.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(t==="ArrowUp"||t==="ArrowDown")&&a?.dataset.pbId&&this.canEdit&&(e.preventDefault(),this.shift(a.dataset.pbId,t==="ArrowUp"?-1:1))})}actionTarget(e){let t=e.target?.closest("[data-pb-action]");if(!t||!this.root.contains(t))return null;let r=t.closest("[data-pb-key]");return{action:t.dataset.pbAction,el:t,id:r?.dataset.pbId??null,key:r?.dataset.pbKey??null}}onDocumentClick=e=>{let t=e.composedPath();for(let r of this.root.querySelectorAll("details[data-pb-menu][open]"))t.includes(r)||(r.open=!1)};onClick(e){let t=this.actionTarget(e),r=this._store;if(!t||!r)return;let{action:o,el:a,id:i,key:l}=t,d=a.closest("details[data-pb-menu]");if(d&&o!=="link"&&(d.open=!1),!(o==="toggle-check"||o==="toggle-slot"||o==="check-all"||o==="link"||o==="quick-add")){switch(o){case"mode":this.focusModeToggle=!0,this.mode=a.dataset.pbValue;return;case"add":return this.add(a.dataset.pbType,a.dataset.pbParent||null,l,Ve(a.dataset.pbPayload),a.dataset.pbFocus==="quick-add");case"toggle-expand":return l?(this.expanded.has(l)?this.expanded.delete(l):this.expanded.add(l),this.scheduleRender()):void 0;case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return r.restore(a.dataset.pbTarget??i),this.showToast(null)}if(i)switch(o){case"check":return r.check(i);case"uncheck":return r.uncheck(i);case"exclude":return r.exclude(i);case"include":return r.include(i);case"color":{let p=r.resolve(i);p&&p.payload.color!==a.dataset.pbColor&&r.update(p.id,{color:a.dataset.pbColor??null});return}case"make-main":r.move(i,{after:null});return;case"move-up":case"move-down":return this.shift(i,o==="move-up"?-1:1);case"delete":this.confirmDelete(i);return}}}onInputChange(e){let t=this.actionTarget(e),r=this._store;if(!t?.id||!r)return;let o=t.el;if(t.action==="toggle-check")r.setChecked(t.id,o.checked);else if(t.action==="toggle-slot"){let a=r.children(r.resolve(t.id)?.id??t.id).filter(i=>i.type!=="link"&&r.type(i.type)?.checkable);if(o.checked){let i=a.find(l=>!l.excluded);i&&!a.some(l=>l.checked)&&r.check(i.id)}else for(let i of a)i.checked&&r.uncheck(i.id)}else if(t.action==="check-all")o.checked?r.checkAll(t.id):r.uncheckAll(t.id);else if(t.action==="link"){let a=t.el.value;a&&(r.link(t.id,a,r.children(a).at(-1)?.id??null),t.el.value="")}}onSubmit(e){let t=e.target?.closest("[data-pb-form]");if(!t||!this._store)return;e.preventDefault();let r=t.closest("[data-pb-key]"),o=r?.dataset.pbId?this._store.resolve(r.dataset.pbId):void 0,a=o?this._store.type(o.type):void 0;if(!o||!a)return;let i={};for(let l of a.fields){let d=et(t,l),p=o.payload[l.name]??null;d!==p&&(i[l.name]=d)}Object.keys(i).length&&this._store.update(o.id,i),this.editingKey=null,this.scheduleRender()}add(e,t,r,o={},a=!1){let i=this._store,l=i.type(e),d=l?.fields.find(w=>w.type==="text"||w.type==="textarea"),p={...d?.required?{[d.name]:this._labels.newItem(l?.label??e)}:{},...o},c=i.children(t).at(-1)?.id??null,u=i.create(e,{parent:t,after:c,payload:p}),h=r?this.cache.get(r):void 0,x=r&&t&&h?.el.dataset.pbLink!==void 0?`${r}>`:r&&t?r.slice(0,-t.length):"";a?this.focusQuickAdd=x+u:d&&(this.editingKey=x+u,this.focusEditor=!0)}quickAdd(e){let t=this._store,r=e.closest("[data-pb-key]"),o=r?.dataset.pbId?t?.resolve(r.dataset.pbId):void 0;if(!t||!o)return;let a=e.value.trim();if(!a){e.setCustomValidity(this._labels.quickAddEmpty),e.reportValidity(),e.addEventListener("input",()=>e.setCustomValidity(""),{once:!0});return}e.value="",t.create("place",{parent:o.id,after:t.children(o.id).at(-1)?.id??null,payload:{name:a}}),this.focusQuickAdd=r.dataset.pbKey}shift(e,t){let r=this._store,o=r.get(e);if(!o)return;let a=r.children(o.parent),i=a.findIndex(l=>l.id===e);t===-1&&i>0?r.move(e,{after:i>=2?a[i-2].id:null}):t===1&&i<a.length-1&&r.move(e,{after:a[i+1].id})}async confirmDelete(e){let t=this._store,r=[];try{let o=await t.deleteImpact(e);r=[...new Set(o.links.map(a=>a.day?this._labels.day(a.day.number):this._labels.pool))]}catch{}r.length&&!window.confirm(this._labels.confirmDeleteLinked(r.join(", ")))||(t.delete(e),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:e}}))}showToast(e){this.toast=e,this.toastTimer&&clearTimeout(this.toastTimer),e&&(this.toastTimer=setTimeout(()=>this.showToast(null),e.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(e,t){this.dispatchEvent(new CustomEvent(`plan-block:${e}`,{detail:t,bubbles:!0,composed:!0}))}};function Ve(n){if(!n)return{};try{let e=JSON.parse(n);return e&&typeof e=="object"&&!Array.isArray(e)?e:{}}catch{return{}}}function Ze(n){try{let e=localStorage.getItem(`plan-block:mode:${n}`);return e==="view"||e==="edit"?e:null}catch{return null}}function et(n,e){let t=n.elements.namedItem(e.name);if(!t)return null;if(e.type==="toggle")return t.checked;let r=t.value.trim();return r===""?null:e.type==="number"?Number(r):r}function ae(n,e){let t=n.children;t.length===e.length&&e.every((r,o)=>t[o]===r)||n.replaceChildren(...e)}function tt(n,e=1e4){let t=()=>window.Livewire?.find(n);return new Promise((r,o)=>{let a=t();if(a)return r(a);let i=Date.now(),l=()=>{let c=t();c?(p(),r(c)):Date.now()-i>e&&(p(),o(new Error(`Livewire component ${n||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),p=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function Ce(n,e){return Array.from(n.children).filter(t=>t.matches(e))}function F(n,e,t){t?n.dataset[e]="":delete n.dataset[e]}function Y(n){return n.replace(/["\\]/g,"\\$&")}function ie(n="plan-block"){typeof customElements<"u"&&!customElements.get(n)&&customElements.define(n,n==="plan-block"?M:class extends M{})}ie();var nt={PlanStore:S,HttpTransport:_,LivewireTransport:T,RejectedError:m,TransportError:f,PlanBlockElement:M,renderer:J,parts:H,h:s,defaultLabels:R,defineElement:ie,ulid:k};window.PlanBlock=nt;})();
