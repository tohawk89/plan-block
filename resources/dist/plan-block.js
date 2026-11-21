"use strict";(()=>{function N(r,e,t){let n=e.args??{};switch(e.type){case"create":case"link":{if(r.has(e.block))return;let o=n.parent??null,i=e.type==="link"?"link":String(n.type),a=t?.types[i],l={};for(let d of a?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);r.set(e.block,{id:e.block,type:i,parent:o,order:re(r,o,n.after??null,null),source:e.type==="link"?n.source??null:null,attachable:n.attachable??null,payload:{...l,...n.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:a&&(a.rule==="all"||a.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let o=r.get(e.block);if(!o)return;r.set(o.id,{...o,payload:{...o.payload,...n.payload??{}}});return}case"move":{let o=r.get(e.block);if(!o)return;let i="parent"in n?n.parent??null:o.parent;r.set(o.id,{...o,parent:i,order:re(r,i,n.after??null,o.id)});return}case"check":case"uncheck":{let o=C(r,e.block);o&&ne(r,o,e.type==="check",t);return}case"check_all":case"uncheck_all":{let o=C(r,e.block);if(!o)return;let i=e.type==="check_all";for(let a of M(r,o.id)){if(a.excluded)continue;let l=C(r,a.id);if(!l)continue;let d=i?[l]:[...te(r,l.id).reverse(),l];for(let p of d)p.type!=="link"&&t?.types[p.type]?.checkable&&ne(r,p,i,t)}return}case"exclude":case"include":{let o=r.get(e.block);o&&r.set(o.id,{...o,excluded:e.type==="exclude"});return}case"delete":{let o=r.get(e.block);if(!o)return;let i=new Set([o.id,...te(r,o.id).map(a=>a.id)]);for(let a of r.values())a.source&&i.has(a.source)&&i.add(a.id);for(let a of i)r.delete(a);return}case"restore":return}}function C(r,e){let t=r.get(e);return t?.source?r.get(t.source)??t:t}function M(r,e){let t=[];for(let n of r.values())n.parent===e&&t.push(n);return t.sort((n,o)=>n.order-o.order||(n.id<o.id?-1:n.id>o.id?1:0))}function te(r,e){let t=[],n=[e],o=new Set;for(;n.length;){let i=n.pop();if(!o.has(i)){o.add(i);for(let a of M(r,i))t.push(a),n.push(a.id)}}return t}function ne(r,e,t,n){let i=(n?.types[e.type]?.rule??"none")==="any"&&M(r,e.id).some(a=>!a.excluded&&a.done);r.set(e.id,{...e,checked:t,checked_at:t?new Date().toISOString():null,done:t||i})}function re(r,e,t,n){let o=M(r,e).filter(d=>d.id!==n);if(t===null){let d=o[0];return d?d.order/2:1024}let i=o.findIndex(d=>d.id===t),a=o[i];if(!a)return(o.at(-1)?.order??0)+1024;let l=o[i+1];return l?(a.order+l.order)/2:a.order+1024}var oe="0123456789abcdefghjkmnpqrstvwxyz";function y(r=Date.now()){let e="",t=r;for(let i=0;i<10;i++)e=oe.charAt(t%32)+e,t=Math.floor(t/32);let n=new Uint8Array(16);crypto.getRandomValues(n);let o="";for(let i of n)o+=oe.charAt(i%32);return e+o}var B=class{constructor(e,t,n){this.backend=e;this.planId=t;this.options=n}editorId=y();releaseLock=null;stopped=!1;get prefix(){return`plan-block:queue:${this.planId}:`}get ownKey(){return this.prefix+this.editorId}get legacyKey(){return`plan-block:queue:${this.planId}`}start(){this.options.locks?.request(ie(this.planId,this.editorId),()=>new Promise(e=>this.releaseLock=e)).catch(()=>{})}stop(){this.stopped=!0,this.releaseLock?.(),this.releaseLock=null}save(e){if(!this.stopped)try{if(e.length){let t={v:2,heartbeat:Date.now(),commands:e};this.backend.setItem(this.ownKey,JSON.stringify(t))}else this.backend.removeItem(this.ownKey)}catch{}}async adoptOrphans(){let e=async()=>{let n=await this.liveEditors(),o=[];for(let i of this.keys()){if(i===this.ownKey)continue;let a=i===this.legacyKey;if(!a&&!i.startsWith(this.prefix))continue;let l=Me(this.backend.getItem(i)),d=a?null:i.slice(this.prefix.length);if(!(l&&d!==null&&(n?n.has(ie(this.planId,d)):Date.now()-l.heartbeat<this.options.staleMs))){l&&o.push(...l.commands);try{this.backend.removeItem(i)}catch{}}}return o};if(this.stopped)return[];let t=this.options.locks;if(!t)return e();try{return await t.request(`plan-block:adopt:${this.planId}`,e)}catch{return[]}}async liveEditors(){let e=this.options.locks;if(!e)return null;let t=await e.query();return new Set([...t.held??[],...t.pending??[]].map(n=>n.name??""))}keys(){let e=[];try{for(let t=0;t<this.backend.length;t++){let n=this.backend.key(t);n!==null&&e.push(n)}}catch{}return e}};function ie(r,e){return`plan-block:editor:${r}:${e}`}function Me(r){if(!r)return null;try{let e=JSON.parse(r);if(Array.isArray(e))return{v:2,heartbeat:0,commands:e};if(e&&Array.isArray(e.commands))return e}catch{}return null}function ae(){try{let r=typeof navigator<"u"?navigator.locks:void 0;return r&&typeof r.request=="function"&&typeof r.query=="function"?r:null}catch{return null}}var b=class extends Error{constructor(t){super(t.message);this.error=t;this.name="RejectedError"}},m=class extends Error{constructor(t,n){super(t);this.status=n;this.name="TransportError"}},k=class{constructor(e){this.options=e;this.endpoint=e.endpoint.replace(/\/+$/,""),this.fetchFn=e.fetch??((t,n)=>fetch(t,n))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(e,t){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:e,commands:t})}deleteImpact(e){return this.request("GET",`/plans/${this.options.plan}/blocks/${e}/delete-impact`)}async request(e,t,n){let o={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},i=this.options.csrfToken!==void 0?this.options.csrfToken:_e();i&&(o["X-CSRF-TOKEN"]=i);let a=xe();a&&(o["X-Socket-ID"]=a),n!==void 0&&(o["Content-Type"]="application/json");let l;try{l=await this.fetchFn(this.endpoint+t,{method:e,headers:o,credentials:"same-origin",body:n===void 0?void 0:JSON.stringify(n)})}catch(h){throw new m(h instanceof Error?h.message:"Network error")}if(l.ok)return await l.json();let d=await l.json().catch(()=>null);if(l.status===422)throw new b(d?.error??{reason:"invalid_request",message:d?.message??"The request was invalid."});let c={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[l.status];throw c?new b(c):new m(d?.message??`Server error (${l.status})`,l.status)}};function xe(){try{return globalThis.Echo?.socketId?.()??null}catch{return null}}function _e(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var E=class extends EventTarget{constructor(t){super();this.options=t;this.storage=t.storage!==void 0?t.storage:Le(),this.retry=t.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;queue=null;queueTimer=null;retry;onOnline=()=>this.retryNow();async load(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...t,manifest:n})}hydrate(t){this.plan=t.plan,this.manifest=t.manifest,this.confirmed=new Map(t.blocks.map(n=>[n.id,n])),this.recompute(),this.emit("change"),this.startQueue(),this.pending.length&&this.scheduleFlush()}applyRemote(t){if(!this.plan||this.destroyed||t.plan!==this.plan.id||t.version<=this.plan.version)return"ignored";if(t.previous_version!==this.plan.version||!t.blocks)return this.reload().catch(()=>{}),"reloading";for(let n of t.blocks)this.confirmed.set(n.id,n);for(let n of t.deleted??[])this.confirmed.delete(n);return this.plan={...this.plan,version:t.version},this.recompute(),this.emit("change"),this.emit("remote",{change:t}),"applied"}async reload(){let[t,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=t.plan,this.manifest=n,this.confirmed=new Map(t.blocks.map(o=>[o.id,o])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),this.queueTimer&&clearInterval(this.queueTimer),this.queue?.stop(),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}snapshotCache=null;subscribe(t){return this.addEventListener("change",t),this.addEventListener("sync",t),()=>{this.removeEventListener("change",t),this.removeEventListener("sync",t)}}getSnapshot(){return this.snapshotCache??={plan:this.plan,blocks:this.all(),syncState:this.syncState,pendingCount:this.pendingCount}}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(t){return this.view.get(t)}all(){return[...this.view.values()]}children(t){return M(this.view,t)}resolve(t){return C(this.view,t)}type(t){return this.manifest?.types[t]}create(t,n={}){let o=n.id??y();return this.dispatch("create",o,{type:t,parent:n.parent??null,after:n.after??null,payload:n.payload??{},...n.attachable?{attachable:n.attachable}:{}}),o}link(t,n,o=null){let i=y();return this.dispatch("link",i,{source:t,parent:n,after:o}),i}update(t,n){this.dispatch("update",t,{payload:n})}move(t,n){this.dispatch("move",t,"parent"in n?{parent:n.parent??null,after:n.after}:{after:n.after})}check(t){this.dispatch("check",t)}uncheck(t){this.dispatch("uncheck",t)}setChecked(t,n){this.dispatch(n?"check":"uncheck",t)}checkAll(t){this.dispatch("check_all",t)}uncheckAll(t){this.dispatch("uncheck_all",t)}exclude(t){this.dispatch("exclude",t)}include(t){this.dispatch("include",t)}delete(t){this.dispatch("delete",t)}restore(t){this.dispatch("restore",t)}deleteImpact(t){return this.options.transport.deleteImpact(t)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let t;try{t=await this.options.transport.send(this.version,this.inflight)}catch(n){n instanceof b?this.handleRejection(n.error):this.handleNetworkError(n);return}this.applyResult(t),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(t,n,o){let i={id:y(),type:t,block:n,...o?{args:o}:{}};this.pending.push(i),this.persistQueue(),N(this.view,i,this.manifest),this.emit("change"),this.emit("command",{command:i}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(t){if(t.full)this.confirmed=new Map(t.blocks.map(n=>[n.id,n]));else{for(let n of t.blocks)this.confirmed.set(n.id,n);for(let n of t.deleted)this.confirmed.delete(n)}this.plan&&(this.plan={...this.plan,version:t.version})}handleRejection(t){let n=this.inflight;if(this.inflight=[],t.reason==="unauthenticated"||t.reason==="session_expired"){this.pending=[...n,...this.pending],this.persistQueue(),this.setSync("offline",t.message),this.emit("error",{error:t,command:null});return}let o=n.findIndex(l=>l.id===t.command),i=o>=0?n[o]:void 0,a=i?n.filter(l=>l!==i):[];this.pending=[...a,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:t,command:i??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(t){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",t instanceof m?t.message:String(t));let n=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),n)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let t of[...this.inflight,...this.pending])N(this.view,t,this.manifest)}persistQueue(){this.queue?.save([...this.inflight,...this.pending])}startQueue(){if(!this.storage||!this.plan||this.queue||this.destroyed)return;let t=this.options.persistence??{},n=t.intervalMs??5e3;this.queue=new B(this.storage,this.plan.id,{staleMs:t.staleMs??n*3,locks:t.locks!==void 0?t.locks:ae()}),this.queue.start(),this.adoptOrphans(),this.queueTimer=setInterval(()=>{this.persistQueue(),this.adoptOrphans()},n)}async adoptOrphans(){let t=await this.queue?.adoptOrphans()??[];if(this.destroyed||!t.length)return;let n=new Set([...this.inflight,...this.pending].map(i=>i.id)),o=t.filter(i=>!n.has(i.id));o.length&&(this.pending.push(...o),this.persistQueue(),this.recompute(),this.emit("change"),this.scheduleFlush())}setSync(t,n){this.syncState=t,this.emit("sync",{state:t,pending:this.pendingCount,message:n})}emit(t,n={}){(t==="change"||t==="sync")&&(this.snapshotCache=null),this.dispatchEvent(new CustomEvent(t,{detail:n}))}};function Le(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var S=class{constructor(e,t=3e4){this.wire=e;this.timeoutMs=t}planData=null;async loadPlan(){let{plan:e,blocks:t}=await this.loadPlanData();return{plan:e,blocks:t}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(e,t){let n=await this.call("runCommands",t,e);if(!n.ok)throw new b(n.error);return n}deleteImpact(e){return this.call("deleteImpact",e)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(e,...t){let n=typeof this.wire=="function"?await this.wire():this.wire,o;try{return await Promise.race([n.$call(e,...t),new Promise((i,a)=>{o=setTimeout(()=>a(new m("Livewire request timed out")),this.timeoutMs)})])}catch(i){throw Te(i)}finally{clearTimeout(o)}}};function Te(r){if(r instanceof b||r instanceof m)return r;let e=typeof r=="object"&&r!==null&&"status"in r?r.status:null,n=e!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[e]:void 0;return n?new b(n):new m(e?`Server error (${e})`:r instanceof Error?r.message:"Network error",e??void 0)}function se(r){return{subscribe(e,t,n,o){let i=h=>n(h),a=r.private(e);a.listen(`.${t}`,i);let l=r.connector?.pusher?.connection,d=l?.state==="connected",p=!1,c=h=>{h.current==="connected"?(d&&p&&o(),d=!0,p=!1):d&&(p=!0)};return l?.bind("state_change",c),()=>{a.stopListening(`.${t}`,i),l?.unbind("state_change",c)}}}}function le(r,e){let t=r.manifest?.realtime;return!t?.enabled||!r.plan?()=>{}:e.subscribe(t.channel_prefix+r.plan.id,t.event,n=>r.applyRemote(n),()=>void r.reload().catch(()=>{}))}function s(r,e={},...t){let n=document.createElement(r);for(let[o,i]of Object.entries(e))i===!1||i===null||i===void 0||(o.startsWith(".")?n[o.slice(1)]=i:n.setAttribute(o,i===!0?"":String(i)));for(let o of t)o==null||o===!1||n.append(o instanceof Node?o:String(o));return n}function D(r,e,t,n){let o=r.type(t);if(!o)return!1;if(e===null)return o.root;let i=r.get(e),a=i?r.type(i.type):void 0;if(!i||!a||n&&(e===n||Ce(r,e,n)))return!1;let l=a.children,d=l.allow.includes(t)||l.any_content&&!o.structural,p=o.parents===null||o.parents.includes(i.type);if(!d||!p)return!1;let c=l.max[t];return c===void 0?!0:r.children(e).filter(u=>u.type===t&&u.id!==n).length<c}function Ce(r,e,t){let n=r.get(e),o=new Set;for(;n?.parent&&!o.has(n.id);){if(n.parent===t)return!0;o.add(n.id),n=r.get(n.parent)}return!1}var De=4,A=56,de=14,H=class{constructor(e){this.host=e}state=null;get dragging(){return this.state?.started??!1}onPointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;let t=this.host.store,n=e.target?.closest("[data-pb-drag-handle]");if(!n||!t||this.host.readonly||this.state)return;let o=n.closest("[data-pb-key]"),i=o?.dataset.pbId;if(!(!o||!i||!t.get(i))){e.preventDefault();try{n.setPointerCapture?.(e.pointerId)}catch{}this.state={id:i,el:o,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=e=>{let t=this.state;if(!(!t||e.pointerId!==t.pointerId)){if(t.x=e.clientX,t.y=e.clientY,!t.started){if(Math.hypot(t.x-t.startX,t.y-t.startY)<De)return;this.begin(t)}e.preventDefault(),this.positionGhost(t),this.updateDrop(t)}};onPointerUp=e=>{this.state&&e.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=e=>{e.key==="Escape"&&this.state&&(e.preventDefault(),e.stopPropagation(),this.finish(!1))};begin(e){e.started=!0;let t=e.el.getBoundingClientRect();e.offsetX=e.startX-t.left,e.offsetY=e.startY-t.top;let n=e.el.cloneNode(!0);for(let i of[n,...n.querySelectorAll("*")])for(let a of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])i.removeAttribute(a);n.classList.add("pb-drag-ghost"),n.setAttribute("aria-hidden","true"),n.style.width=`${t.width}px`,e.ghost=n,e.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(n);let o=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(o))};e.frame=requestAnimationFrame(o)}positionGhost(e){e.ghost&&(e.ghost.style.transform=`translate(${e.x-e.offsetX}px, ${e.y-e.offsetY}px)`)}autoScroll(e){let t=window.innerHeight,n=0;e.y<A?n=-de*(1-e.y/A):e.y>t-A&&(n=de*(1-(t-e.y)/A)),n!==0&&(window.scrollBy(0,n),this.updateDrop(e))}updateDrop(e){let t=this.findDrop(e);e.drop&&(e.drop.el!==t?.el||e.drop.position!==t?.position)&&delete e.drop.el.dataset.pbDrop,t&&(t.el.dataset.pbDrop=t.position),e.drop=t}findDrop(e){let t=this.host.store,n=t?.get(e.id);if(!t||!n)return null;let o=this.host.root,i=(o instanceof ShadowRoot?o:document).elementFromPoint(e.x,e.y);if(!i||(o instanceof ShadowRoot,!o.contains(i)))return null;let a=i.closest("[data-pb-key]");for(;a;){if(a===e.el||e.el.contains(a))return null;let l=a.dataset.pbId,d=t.get(l);if(!d)return null;if(D(t,d.parent,n.type,n.id)){let c=a.getBoundingClientRect(),h=e.y<c.top+c.height/2?"before":"after";return{el:a,position:h,parent:d.parent,after:this.afterFor(d.parent,l,h,n.id)}}let p=t.resolve(l)??d;if(D(t,p.id,n.type,n.id)){let c=t.children(p.id).filter(h=>h.id!==n.id).at(-1);return{el:a,position:"inside",parent:p.id,after:c?.id??null}}a=a.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(e,t,n,o){if(n==="after")return t;let i=this.host.store.children(e).filter(l=>l.id!==o),a=i.findIndex(l=>l.id===t);return a>0?i[a-1].id:null}finish(e){let t=this.state;if(!t||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(t.frame),t.ghost?.remove(),delete t.el.dataset.pbDragging,t.drop&&delete t.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!e||!t.started||!t.drop))return;let n=this.host.store?.get(t.id);if(!n)return;let{parent:o,after:i}=t.drop,a=this.host.store.children(n.parent),l=a[a.findIndex(d=>d.id===n.id)-1]?.id??null;(o!==n.parent||i!==l)&&this.host.move(n.id,o,i)}};var x={addDay:"+ Day",addPool:"+ Ideas",add:r=>`+ ${r}`,addMenu:"+ Add",mode:"Mode",viewMode:"Normal",editMode:"Edit",moreActions:"More actions",color:"Colour",autoColor:"Auto",backup:r=>`Backup ${r}`,newItem:r=>`New ${r.toLowerCase()}`,day:r=>`Day ${r}`,pool:"Ideas",checkAll:"Check all items",markDone:r=>`Mark "${r}" done`,progress:(r,e)=>`${r}/${e}`,poolProgress:(r,e)=>`${r} of ${e} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip",include:"Undo skip",addToDay:"Add to day\u2026",linked:"linked",linkedFrom:r=>`Also in ${r}`,doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day, or an ideas list for places you might visit.",emptyView:"Nothing planned yet. Switch to Edit to start.",emptyReadonly:"Nothing planned yet.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:r=>`This also appears in ${r}. Delete it everywhere?`};var pe=["coral","teal","purple","amber","blue","pink","green"],Re="gray";function j(r,e){return r.type(e.type)?.fields.find(t=>t.name==="color"&&t.type==="select")}function F(r,e){let t=j(r,e);if(!t)return null;let n=e.payload.color;if(typeof n=="string"&&(t.options??[]).some(o=>String(o.value)===n))return n;if(e.type==="timeline"){let o=e.day?.number??r.children(null).filter(i=>i.type==="timeline").indexOf(e)+1;return pe[(Math.max(1,o)-1)%pe.length]}return e.type==="pool"?Re:null}var ue=new Map;function z(r,e){ue.set(r,e)}function he(r){return ue.get(r)??qe[r]??$e}function Pe(r){return r?.fields.find(e=>e.type==="text")??r?.fields.find(e=>e.type==="textarea")}function K(r){let e=Pe(r.type),t=e?r.target.payload[e.name]:void 0;return typeof t=="string"&&t!==""?t:r.type?.label??r.target.type}function _(r,e){let t=e??K(r);return r.canEdit?s("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:r.labels.edit},t):s("span",{class:"pb-title"},t)}function Ie(r,e,t,n={}){return s("button",{type:"button",class:`pb-button pb-button--ghost${r==="delete"?" pb-button--danger":""}`,"data-pb-action":r,"aria-label":e,title:e,...n},s("span",{"aria-hidden":"true"},t))}function g(r,e,t=!1){return s("button",{type:"button",class:`pb-menu__item${t?" pb-menu__item--danger":""}`,"data-pb-action":r},e)}function Q(r,e,t,n=""){return s("details",{class:`pb-menu${n?` ${n}`:""}`,"data-pb-menu":""},s("summary",{class:"pb-button pb-menu__summary","aria-label":e??void 0,title:e??void 0},r),s("div",{class:"pb-menu__list"},...t))}function Y(r,e){return Q(s("span",{"aria-hidden":"true"},"\u22EF"),r.labels.moreActions,e,"pb-menu--actions")}function O(r,e={}){if(!r.canEdit)return null;let{labels:t,block:n,store:o}=r,i=o.children(null).filter(d=>d.type==="timeline"),a=n.parent?o.get(n.parent):void 0,l=(r.type?.fields.length??0)>0;return s("div",{class:"pb-actions"},e.linkable&&a?.type==="pool"&&i.length>0?s("select",{class:"pb-select","data-pb-action":"link","aria-label":t.addToDay},s("option",{value:""},t.addToDay),...i.map(d=>s("option",{value:d.id},q(o,d,t)))):null,Y(r,[l?g("edit",t.edit):null,g("move-up",t.moveUp),g("move-down",t.moveDown),r.type?.root?null:g(n.excluded?"include":"exclude",n.excluded?t.include:t.exclude),g("delete",t.delete,!0)]))}function U(r){if(!r.canEdit)return null;let{labels:e}=r;return s("div",{class:"pb-actions"},Y(r,[g("edit",e.edit),be(r),g("move-up",e.moveUp),g("move-down",e.moveDown),g("delete",e.delete,!0)]))}function be(r){let e=j(r.store,r.target);if(!e)return null;let t=F(r.store,r.target);return s("div",{class:"pb-swatches",role:"group","aria-label":r.labels.color},...(e.options??[]).map(n=>s("button",{type:"button",class:"pb-swatch","data-pb-action":"color","data-pb-color":String(n.value),"aria-label":n.label,title:n.label,"aria-pressed":String(t===String(n.value))})))}function X(r,e){let t=e>0?Math.round(r/e*100):0;return s("span",{class:"pb-meter","aria-hidden":"true"},s("span",{class:"pb-meter__fill",style:`width: ${t}%`}))}function $(r,e){if(!r.canEdit)return null;let t=e.filter(i=>Be(r,i));if(!t.length)return null;let n=i=>r.store.type(i)?.label??i,o=i=>({type:"button","data-pb-action":"add","data-pb-type":i,"data-pb-parent":r.target.id});return t.length===1?s("div",{class:"pb-footer"},s("button",{...o(t[0]),class:"pb-button"},r.labels.add(n(t[0])))):s("div",{class:"pb-footer"},Q(r.labels.addMenu,null,t.map(i=>s("button",{...o(i),class:"pb-menu__item"},n(i))),"pb-menu--add"))}function Be(r,e){return D(r.store,r.target.id,e)}function L(r){return!r.canEdit||r.editing?null:s("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":r.labels.dragHandle,title:r.labels.dragHandle},s("span",{"aria-hidden":"true"},"\u283F"))}function G(r){return r.type?.checkable?s("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":r.target.checked,"aria-label":r.labels.markDone(K(r)),disabled:r.readonly}):null}function R(r){if(!r.isLink)return null;let e=me(r.store,r.target,r.labels),t=e?r.labels.linkedFrom(e):r.labels.linked;return s("span",{class:"pb-badge pb-badge--link",title:t},`\u2197 ${t}`)}function me(r,e,t){let n=e,o=new Set;for(;n?.parent&&!o.has(n.id);)o.add(n.id),n=r.get(n.parent);return n?n.type==="timeline"?q(r,n,t):n.type==="pool"?typeof n.payload.label=="string"&&n.payload.label!==""?n.payload.label:t.pool:null:null}function T(r){let{labels:e,target:t}=r;return s("form",{class:"pb-form","data-pb-form":""},...(r.type?.fields??[]).map(n=>fe(n,t.payload[n.name],e)),s("div",{class:"pb-actions"},s("button",{type:"submit",class:"pb-button pb-button--primary"},e.save),s("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},e.cancel)))}function fe(r,e,t){if(r.type==="select"&&r.name==="color")return Ae(r,e,t);let n={name:r.name,class:"pb-input",required:r.required,"data-pb-field":r.type},o=e==null?"":String(e),i;switch(r.type){case"textarea":i=s("textarea",{...n,rows:3,maxlength:r.max},o);break;case"select":i=s("select",n,r.required?null:s("option",{value:""},"\u2014"),...(r.options??[]).map(a=>s("option",{value:String(a.value),selected:String(a.value)===o},a.label)));break;case"toggle":i=s("input",{name:r.name,type:"checkbox","data-pb-field":"toggle",".checked":e===!0||e===1||e==="1"});break;case"number":i=s("input",{...n,type:"number",step:"any",min:r.min,max:r.max,value:o});break;default:i=s("input",{...n,type:r.type==="text"?"text":r.type,maxlength:r.type==="text"||r.type==="url"?r.max:void 0,value:o})}return s("label",{class:"pb-field"},r.label,i)}function Ae(r,e,t){let n=typeof e=="string"?e:"",o=(i,a,l)=>s("input",{type:"radio",name:r.name,value:i,class:`pb-swatch${l?` ${l}`:""}`,"data-pb-color":i||void 0,"aria-label":a,title:a,".checked":n===i});return s("fieldset",{class:"pb-field pb-swatch-field"},s("legend",{},r.label),s("div",{class:"pb-swatches"},r.required?null:o("",t?.autoColor??"Auto","pb-swatch--auto"),...(r.options??[]).map(i=>o(String(i.value),i.label,""))))}function q(r,e,t){let n=typeof e.payload.label=="string"&&e.payload.label!==""?` \xB7 ${e.payload.label}`:"",o=e.day?.number??r.children(null).filter(i=>i.type==="timeline").indexOf(e)+1;return t.day(o)+n}function ge(r){if(!r)return null;let e=new Date(`${r}T00:00:00`);return Number.isNaN(e.getTime())?r:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(e)}var P={title:_,titleOf:K,iconButton:Ie,menu:Q,menuItem:g,blockMenu:Y,itemActions:O,groupActions:U,colorSwatches:be,meter:X,addButtons:$,homeOf:me,dragHandle:L,checkbox:G,linkBadge:R,editForm:T,fieldInput:fe,dayTitle:q,formatDate:ge},He=r=>{let{target:e,labels:t,store:n}=r,o=e.progress??{state:"none",done:0,total:0},i=ge(e.day?.date??null);return s("section",{class:"pb-group pb-day"},s("header",{class:"pb-group__header"},L(r),s("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":o.state==="all",".indeterminate":o.state==="some","aria-label":t.checkAll,disabled:r.readonly||o.total===0}),s("div",{class:"pb-group__title"},r.editing?null:_(r,q(n,e,t)),i?s("span",{class:"pb-muted"},i):null,R(r)),X(o.done,o.total),s("span",{class:"pb-progress","data-state":o.state},t.progress(o.done,o.total)),U(r)),r.editing?s("div",{class:"pb-children"},T(r)):null,r.children,$(r,["place","note",...ve(r)]))},Fe=r=>{let{target:e,labels:t}=r,n=e.progress??{state:"none",done:0,total:0},o=typeof e.payload.label=="string"&&e.payload.label!==""?e.payload.label:t.pool;return s("section",{class:"pb-group pb-pool"},s("header",{class:"pb-group__header"},L(r),s("div",{class:"pb-group__title"},r.editing?null:_(r,o),R(r)),X(n.done,n.total),s("span",{class:"pb-progress"},t.poolProgress(n.done,n.total)),U(r)),r.editing?s("div",{class:"pb-children"},T(r)):null,r.children,$(r,["place","note",...ve(r)]))},ce=r=>{let{target:e,labels:t}=r,n=typeof e.payload.time=="string"?e.payload.time:null,o=typeof e.payload.maps_url=="string"?e.payload.maps_url:null,i=typeof e.payload.notes=="string"?e.payload.notes:null,a=e.type==="backup"&&e.parent?r.store.children(e.parent).filter(l=>l.type==="backup").findIndex(l=>l.id===e.id)+1:0;return s("div",{class:"pb-item"},s("div",{class:"pb-item__row"},L(r),G(r),s("div",{class:"pb-item__main"},r.editing?T(r):s("div",{},a>0?s("span",{class:"pb-badge pb-badge--backup"},t.backup(a)):null,a>0?" ":null,_(r)," ",R(r),e.done&&!e.checked?s("span",{class:"pb-badge pb-badge--done"},t.doneViaBackup):null,n||o?s("div",{class:"pb-meta"},n?s("span",{},n):null,o?s("a",{href:o,target:"_blank",rel:"noopener noreferrer"},t.openMap):null):null,i?s("div",{class:"pb-notes"},i):null)),r.editing?null:O(r,{linkable:!0})),r.children,r.editing||r.isLink?null:$(r,["backup","note"]))},Oe=r=>s("div",{class:"pb-item pb-note-item"},s("div",{class:"pb-item__row"},L(r),s("div",{class:"pb-item__main"},r.editing?T(r):s("div",{class:"pb-note"},_(r))),r.editing?null:O(r))),$e=r=>s("div",{class:"pb-item"},s("div",{class:"pb-item__row"},L(r),G(r),s("div",{class:"pb-item__main"},r.editing?T(r):s("div",{},_(r)," ",R(r))),r.editing?null:O(r,{linkable:!0})),r.children);function ve(r){let e=["timeline","pool","link","place","backup","note"];return Object.keys(r.store.manifest?.types??{}).filter(t=>!e.includes(t))}var qe={timeline:He,pool:Fe,place:ce,backup:ce,note:Oe};var W=`/*
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
`;var ye=!1,w=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly","mode"];_store=null;ownsStore=!1;_labels=x;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new H(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;_mode=null;focusModeToggle=!1;get store(){return this._store}set store(e){this.detachStore(),this._store=e,this.ownsStore=!1,e&&(this.attachStore(e),this.state=e.plan?"ready":"idle",this.scheduleRender())}realtime=void 0;stopRealtime=null;get labels(){return this._labels}set labels(e){this._labels={...x,...e},this.cache.clear(),this.persistent.clear(),this.scheduleRender()}get isReadOnly(){return this.hasAttribute("readonly")}get mode(){return this.isReadOnly?"view":this._mode??this.initialMode()}set mode(e){if(e!=="view"&&e!=="edit")return;let t=e!==this.mode;this._mode=e,this.rememberMode(e),this.getAttribute("mode")!==e&&this.setAttribute("mode",e),t&&(e==="view"&&(this.editingKey=null),this.cache.clear(),this.scheduleRender(),this.emit("mode",{mode:e}))}get canEdit(){return!this.isReadOnly&&this.mode==="edit"}initialMode(){let e=this.getAttribute("mode");if(e==="view"||e==="edit")return e;let t=this._store;if(!t?.plan)return"view";let n=je(t.plan.id);return this._mode=n??(t.children(null).length===0?"edit":"view"),this._mode}rememberMode(e){let t=this._store?.plan?.id;if(t)try{localStorage.setItem(`plan-block:mode:${t}`,e)}catch{}}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),document.addEventListener("click",this.onDocumentClick),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():(this.scheduleRender(),this._store?.plan&&this.connectRealtime())}disconnectedCallback(){this.disconnectRealtime(),window.removeEventListener("plan-block-refresh",this.onRefresh),document.removeEventListener("click",this.onDocumentClick),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(e,t,n){t===n||!this.isConnected||((e==="plan"||e==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(e==="mode"&&(n==="view"||n==="edit")&&n!==this._mode&&(this._mode=n,n==="view"&&(this.editingKey=null)),this.cache.clear(),this.scheduleRender()))}async boot(){let e=this.getAttribute("plan");e&&await this.useStore(new E({transport:this.createTransport(e)}),{initial:this.readInitialData()??void 0,owned:!0})}async useStore(e,t={}){if(this._store&&this._store!==e&&this.ownsStore&&this._store.destroy(),this.detachStore(),this._store=e,this.ownsStore=t.owned??!1,this.attachStore(e),t.initial){e.hydrate(t.initial),this.state="ready",this.render(),this.connectRealtime(),this.emit("ready",{plan:e.plan});return}if(e.plan){this.state="ready",this.render(),this.connectRealtime();return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.connectRealtime(),this.emit("ready",{plan:e.plan})}catch(n){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:n instanceof Error?n.message:String(n)}})}this.render()}createTransport(e){if(this.getAttribute("transport")==="livewire"){let t=this.parentElement;for(;t&&!t.hasAttribute("wire:id");)t=t.parentElement;let n=t?.getAttribute("wire:id")??"";return new S(()=>Ke(n))}return new k({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:e})}onRefresh=e=>{let t=e.detail,n=Array.isArray(t)?t[0]?.plan:t?.plan;this._store?.plan&&(!n||n===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let e=ke(this,"script[data-pb-initial]")[0];if(!e?.textContent)return null;try{return JSON.parse(e.textContent)}catch{return null}finally{e.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=e=>{let{command:t}=e.detail;this.emit(t.type.replace(/_/g,"-"),{id:t.block,command:t})};onError=e=>{let{error:t}=e.detail;this.showToast({message:t.message,kind:"error"}),this.emit("error",e.detail)};onSync=e=>{this.emit("sync",e.detail),this.scheduleRender()};attachStore(e){e.addEventListener("change",this.onChange),e.addEventListener("command",this.onCommand),e.addEventListener("error",this.onError),e.addEventListener("sync",this.onSync)}connectRealtime(){this.disconnectRealtime();let e=this._store;if(!e?.plan||this.realtime===null||this.getAttribute("realtime")==="off"||!this.isConnected)return;let t=globalThis.Echo,n=this.realtime!==void 0?this.realtime:t?se(t):null;n&&(this.stopRealtime=le(e,n))}disconnectRealtime(){this.stopRealtime?.(),this.stopRealtime=null}detachStore(){this.disconnectRealtime();let e=this._store;e&&(e.removeEventListener("change",this.onChange),e.removeEventListener("command",this.onCommand),e.removeEventListener("error",this.onError),e.removeEventListener("sync",this.onSync),this.cache.clear(),this._mode=null)}adoptStyles(){let e=this.root instanceof ShadowRoot?this.root:document;if(!(e===document&&ye)){try{let t=new CSSStyleSheet;t.replaceSync(W),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t]}catch{let t=s("style",{"data-plan-block":""},W);e===document?document.head.append(t):e.prepend(t)}e===document&&(ye=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let u of ke(this,"[data-pb-fallback]"))u.remove();this.container=s("div",{class:"pb-root"}),this.root.append(this.container)}let e=this._store,t=this._labels;if(!e||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(s("div",{class:"pb-empty"},t.loading));return}if(this.state==="failed"||!e.plan){this.container.replaceChildren(s("div",{class:"pb-empty",role:"alert"},t.loadFailed));return}let n=this.captureFocus(),o=new Set,i=e.children(null).map(u=>this.renderBlock(u,"",o,0));for(let u of this.cache.keys())o.has(u)||this.cache.delete(u);let a=this.ensure("list",()=>s("div",{class:"pb-list"})),l=this.mode,d=this.isReadOnly?t.emptyReadonly:l==="edit"?t.empty:t.emptyView;J(a,i.length?i:[s("div",{class:"pb-empty"},d)]);let p=this.isReadOnly?null:this.ensure(`toolbar-${l}`,()=>this.toolbar(l));this.container.dataset.pbMode=l;let c=s("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":e.syncState},e.syncState==="saving"?t.saving:e.syncState==="offline"?t.offline:""),h=this.toast?s("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},s("span",{},this.toast.message),s("div",{class:"pb-actions"},this.toast.action?s("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,s("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},t.dismiss))):null;J(this.container,[p,a,c,h].filter(u=>u!==null)),this.focusModeToggle&&p&&(this.focusModeToggle=!1,p.querySelector('[data-pb-action="mode"][aria-pressed="true"]')?.focus()),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${V(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(n)}captureFocus(){let e=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!e||!this.container?.contains(e))return null;let t=e.closest("[data-pb-key]")?.dataset.pbKey;if(!t)return null;let n=e.dataset?.pbAction,o=e.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":n?`[data-pb-action="${V(n)}"]`:null;return o?{key:t,selector:o,el:e}:null}restoreFocus(e){if(!e||(this.root instanceof ShadowRoot?this.root:document).activeElement===e.el)return;if(e.el.isConnected){e.el.focus();return}let n=this.root.querySelector(`[data-pb-key="${V(e.key)}"]`);[...n?.querySelectorAll(e.selector)??[]].find(i=>i.closest("[data-pb-key]")===n)?.focus()}toolbar(e){let t=this._labels,n=(o,i)=>s("button",{type:"button",class:"pb-button pb-mode__option","data-pb-action":"mode","data-pb-value":o,"aria-pressed":String(e===o)},i);return s("div",{class:"pb-toolbar"},e==="edit"?s("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},t.addDay):null,e==="edit"?s("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},t.addPool):null,s("div",{class:"pb-mode",role:"group","aria-label":t.mode},n("view",t.viewMode),n("edit",t.editMode)))}persistent=new Map;ensure(e,t){let n=this.persistent.get(e);return n||(n=t(),this.persistent.set(e,n)),n}renderBlock(e,t,n,o){let i=this._store,a=t+e.id,l=e.type==="link",d=(l?i.resolve(e.id):e)??e,p=i.type(d.type),c=this.editingKey===a;n.add(a);let h=JSON.stringify([e,l?d:null,c,this.isReadOnly,this.mode,e.parent?i.children(e.parent).length:0,i.children(d.id).map(v=>v.type).join(),i.children(null).map(v=>v.id+(v.payload.label??"")).join()]),u=this.cache.get(a);if(!u||u.signature!==h){let v=u?.children??s("div",{class:"pb-children","data-pb-children":""}),Se={block:e,target:d,type:p,isLink:l,children:v,editing:c,readonly:this.isReadOnly,mode:this.mode,canEdit:this.canEdit,store:i,labels:this._labels,h:s,parts:P},f=he(d.type)(Se);f.classList.add("pb-block"),f.dataset.pbId=e.id,f.dataset.pbKey=a,f.dataset.pbType=d.type,I(f,"pbLink",l),I(f,"pbChecked",d.checked),I(f,"pbDone",d.done),I(f,"pbExcluded",e.excluded),I(f,"pbComplete",d.progress?.state==="all"&&d.progress.total>0);let ee=F(i,d);ee?f.dataset.pbColor=ee:delete f.dataset.pbColor,u={signature:h,el:f,children:v},this.cache.set(a,u)}let we=l?`${a}>`:t,Ee=o>20?[]:i.children(d.id).map(v=>this.renderBlock(v,we,n,o+1));return J(u.children,Ee),u.el}dragHost(){let e=this;return{get root(){return e.root},get container(){return e.container},get store(){return e._store},get readonly(){return!e.canEdit},move:(t,n,o)=>e._store?.move(t,{parent:n,after:o})}}listen(){this.listening=!0,this.root.addEventListener("click",e=>this.onClick(e)),this.root.addEventListener("change",e=>this.onInputChange(e)),this.root.addEventListener("submit",e=>this.onSubmit(e)),this.root.addEventListener("pointerdown",e=>this.drag.onPointerDown(e)),this.root.addEventListener("keydown",e=>{let t=e.key;if(t==="Escape"){let i=e.target?.closest("details[data-pb-menu][open]");if(i){i.open=!1,i.querySelector("summary")?.focus();return}}if(t==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let o=e.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(t==="ArrowUp"||t==="ArrowDown")&&o?.dataset.pbId&&this.canEdit&&(e.preventDefault(),this.shift(o.dataset.pbId,t==="ArrowUp"?-1:1))})}actionTarget(e){let t=e.target?.closest("[data-pb-action]");if(!t||!this.root.contains(t))return null;let n=t.closest("[data-pb-key]");return{action:t.dataset.pbAction,el:t,id:n?.dataset.pbId??null,key:n?.dataset.pbKey??null}}onDocumentClick=e=>{let t=e.composedPath();for(let n of this.root.querySelectorAll("details[data-pb-menu][open]"))t.includes(n)||(n.open=!1)};onClick(e){let t=this.actionTarget(e),n=this._store;if(!t||!n)return;let{action:o,el:i,id:a,key:l}=t,d=i.closest("details[data-pb-menu]");if(d&&o!=="link"&&(d.open=!1),!(o==="toggle-check"||o==="check-all"||o==="link")){switch(o){case"mode":this.focusModeToggle=!0,this.mode=i.dataset.pbValue;return;case"add":return this.add(i.dataset.pbType,i.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return n.restore(i.dataset.pbTarget??a),this.showToast(null)}if(a)switch(o){case"check":return n.check(a);case"uncheck":return n.uncheck(a);case"exclude":return n.exclude(a);case"include":return n.include(a);case"color":{let p=n.resolve(a);p&&p.payload.color!==i.dataset.pbColor&&n.update(p.id,{color:i.dataset.pbColor??null});return}case"move-up":case"move-down":return this.shift(a,o==="move-up"?-1:1);case"delete":this.confirmDelete(a);return}}}onInputChange(e){let t=this.actionTarget(e),n=this._store;if(!t?.id||!n)return;let o=t.el;if(t.action==="toggle-check")n.setChecked(t.id,o.checked);else if(t.action==="check-all")o.checked?n.checkAll(t.id):n.uncheckAll(t.id);else if(t.action==="link"){let i=t.el.value;i&&(n.link(t.id,i,n.children(i).at(-1)?.id??null),t.el.value="")}}onSubmit(e){let t=e.target?.closest("[data-pb-form]");if(!t||!this._store)return;e.preventDefault();let n=t.closest("[data-pb-key]"),o=n?.dataset.pbId?this._store.resolve(n.dataset.pbId):void 0,i=o?this._store.type(o.type):void 0;if(!o||!i)return;let a={};for(let l of i.fields){let d=ze(t,l),p=o.payload[l.name]??null;d!==p&&(a[l.name]=d)}Object.keys(a).length&&this._store.update(o.id,a),this.editingKey=null,this.scheduleRender()}add(e,t,n){let o=this._store,i=o.type(e),a=i?.fields.find(c=>c.type==="text"||c.type==="textarea"),l=a?.required?{[a.name]:this._labels.newItem(i?.label??e)}:{},d=o.children(t).at(-1)?.id??null,p=o.create(e,{parent:t,after:d,payload:l});if(a){let c=n?this.cache.get(n):void 0,h=n&&t&&c?.el.dataset.pbLink!==void 0?`${n}>`:n&&t?n.slice(0,-t.length):"";this.editingKey=h+p,this.focusEditor=!0}}shift(e,t){let n=this._store,o=n.get(e);if(!o)return;let i=n.children(o.parent),a=i.findIndex(l=>l.id===e);t===-1&&a>0?n.move(e,{after:a>=2?i[a-2].id:null}):t===1&&a<i.length-1&&n.move(e,{after:i[a+1].id})}async confirmDelete(e){let t=this._store,n=[];try{let o=await t.deleteImpact(e);n=[...new Set(o.links.map(i=>i.day?this._labels.day(i.day.number):this._labels.pool))]}catch{}n.length&&!window.confirm(this._labels.confirmDeleteLinked(n.join(", ")))||(t.delete(e),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:e}}))}showToast(e){this.toast=e,this.toastTimer&&clearTimeout(this.toastTimer),e&&(this.toastTimer=setTimeout(()=>this.showToast(null),e.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(e,t){this.dispatchEvent(new CustomEvent(`plan-block:${e}`,{detail:t,bubbles:!0,composed:!0}))}};function je(r){try{let e=localStorage.getItem(`plan-block:mode:${r}`);return e==="view"||e==="edit"?e:null}catch{return null}}function ze(r,e){let t=r.elements.namedItem(e.name);if(!t)return null;if(e.type==="toggle")return t.checked;let n=t.value.trim();return n===""?null:e.type==="number"?Number(n):n}function J(r,e){let t=r.children;t.length===e.length&&e.every((n,o)=>t[o]===n)||r.replaceChildren(...e)}function Ke(r,e=1e4){let t=()=>window.Livewire?.find(r);return new Promise((n,o)=>{let i=t();if(i)return n(i);let a=Date.now(),l=()=>{let c=t();c?(p(),n(c)):Date.now()-a>e&&(p(),o(new Error(`Livewire component ${r||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),p=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function ke(r,e){return Array.from(r.children).filter(t=>t.matches(e))}function I(r,e,t){t?r.dataset[e]="":delete r.dataset[e]}function V(r){return r.replace(/["\\]/g,"\\$&")}function Z(r="plan-block"){typeof customElements<"u"&&!customElements.get(r)&&customElements.define(r,r==="plan-block"?w:class extends w{})}Z();var Qe={PlanStore:E,HttpTransport:k,LivewireTransport:S,RejectedError:b,TransportError:m,PlanBlockElement:w,renderer:z,parts:P,h:s,defaultLabels:x,defineElement:Z,ulid:y};window.PlanBlock=Qe;})();
