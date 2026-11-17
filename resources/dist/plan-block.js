"use strict";(()=>{function F(r,t,e){let n=t.args??{};switch(t.type){case"create":case"link":{if(r.has(t.block))return;let i=n.parent??null,o=t.type==="link"?"link":String(n.type),s=e?.types[o],l={};for(let d of s?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);r.set(t.block,{id:t.block,type:o,parent:i,order:W(r,i,n.after??null,null),source:t.type==="link"?n.source??null:null,attachable:n.attachable??null,payload:{...l,...n.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:s&&(s.rule==="all"||s.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let i=r.get(t.block);if(!i)return;r.set(i.id,{...i,payload:{...i.payload,...n.payload??{}}});return}case"move":{let i=r.get(t.block);if(!i)return;let o="parent"in n?n.parent??null:i.parent;r.set(i.id,{...i,parent:o,order:W(r,o,n.after??null,i.id)});return}case"check":case"uncheck":{let i=C(r,t.block);i&&G(r,i,t.type==="check",e);return}case"check_all":case"uncheck_all":{let i=C(r,t.block);if(!i)return;let o=t.type==="check_all";for(let s of S(r,i.id)){if(s.excluded)continue;let l=C(r,s.id);if(!l)continue;let d=o?[l]:[...U(r,l.id).reverse(),l];for(let c of d)c.type!=="link"&&e?.types[c.type]?.checkable&&G(r,c,o,e)}return}case"exclude":case"include":{let i=r.get(t.block);i&&r.set(i.id,{...i,excluded:t.type==="exclude"});return}case"delete":{let i=r.get(t.block);if(!i)return;let o=new Set([i.id,...U(r,i.id).map(s=>s.id)]);for(let s of r.values())s.source&&o.has(s.source)&&o.add(s.id);for(let s of o)r.delete(s);return}case"restore":return}}function C(r,t){let e=r.get(t);return e?.source?r.get(e.source)??e:e}function S(r,t){let e=[];for(let n of r.values())n.parent===t&&e.push(n);return e.sort((n,i)=>n.order-i.order||(n.id<i.id?-1:n.id>i.id?1:0))}function U(r,t){let e=[],n=[t],i=new Set;for(;n.length;){let o=n.pop();if(!i.has(o)){i.add(o);for(let s of S(r,o))e.push(s),n.push(s.id)}}return e}function G(r,t,e,n){let o=(n?.types[t.type]?.rule??"none")==="any"&&S(r,t.id).some(s=>!s.excluded&&s.done);r.set(t.id,{...t,checked:e,checked_at:e?new Date().toISOString():null,done:e||o})}function W(r,t,e,n){let i=S(r,t).filter(d=>d.id!==n);if(e===null){let d=i[0];return d?d.order/2:1024}let o=i.findIndex(d=>d.id===e),s=i[o];if(!s)return(i.at(-1)?.order??0)+1024;let l=i[o+1];return l?(s.order+l.order)/2:s.order+1024}var u=class extends Error{constructor(e){super(e.message);this.error=e;this.name="RejectedError"}},h=class extends Error{constructor(e,n){super(e);this.status=n;this.name="TransportError"}},k=class{constructor(t){this.options=t;this.endpoint=t.endpoint.replace(/\/+$/,""),this.fetchFn=t.fetch??((e,n)=>fetch(e,n))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(t,e){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:t,commands:e})}deleteImpact(t){return this.request("GET",`/plans/${this.options.plan}/blocks/${t}/delete-impact`)}async request(t,e,n){let i={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},o=this.options.csrfToken!==void 0?this.options.csrfToken:de();o&&(i["X-CSRF-TOKEN"]=o),n!==void 0&&(i["Content-Type"]="application/json");let s;try{s=await this.fetchFn(this.endpoint+e,{method:t,headers:i,credentials:"same-origin",body:n===void 0?void 0:JSON.stringify(n)})}catch(p){throw new h(p instanceof Error?p.message:"Network error")}if(s.ok)return await s.json();let l=await s.json().catch(()=>null);if(s.status===422)throw new u(l?.error??{reason:"invalid_request",message:l?.message??"The request was invalid."});let c={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[s.status];throw c?new u(c):new h(l?.message??`Server error (${s.status})`,s.status)}};function de(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var Q="0123456789abcdefghjkmnpqrstvwxyz";function w(r=Date.now()){let t="",e=r;for(let o=0;o<10;o++)t=Q.charAt(e%32)+t,e=Math.floor(e/32);let n=new Uint8Array(16);crypto.getRandomValues(n);let i="";for(let o of n)i+=Q.charAt(o%32);return t+i}var E=class extends EventTarget{constructor(e){super();this.options=e;this.storage=e.storage!==void 0?e.storage:pe(),this.retry=e.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;retry;onOnline=()=>this.retryNow();async load(){let[e,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...e,manifest:n})}hydrate(e){this.plan=e.plan,this.manifest=e.manifest,this.confirmed=new Map(e.blocks.map(n=>[n.id,n])),this.pending=this.restoreQueue(),this.recompute(),this.emit("change"),this.pending.length&&this.scheduleFlush()}async reload(){let[e,n]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=e.plan,this.manifest=n,this.confirmed=new Map(e.blocks.map(i=>[i.id,i])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(e){return this.view.get(e)}all(){return[...this.view.values()]}children(e){return S(this.view,e)}resolve(e){return C(this.view,e)}type(e){return this.manifest?.types[e]}create(e,n={}){let i=n.id??w();return this.dispatch("create",i,{type:e,parent:n.parent??null,after:n.after??null,payload:n.payload??{},...n.attachable?{attachable:n.attachable}:{}}),i}link(e,n,i=null){let o=w();return this.dispatch("link",o,{source:e,parent:n,after:i}),o}update(e,n){this.dispatch("update",e,{payload:n})}move(e,n){this.dispatch("move",e,"parent"in n?{parent:n.parent??null,after:n.after}:{after:n.after})}check(e){this.dispatch("check",e)}uncheck(e){this.dispatch("uncheck",e)}setChecked(e,n){this.dispatch(n?"check":"uncheck",e)}checkAll(e){this.dispatch("check_all",e)}uncheckAll(e){this.dispatch("uncheck_all",e)}exclude(e){this.dispatch("exclude",e)}include(e){this.dispatch("include",e)}delete(e){this.dispatch("delete",e)}restore(e){this.dispatch("restore",e)}deleteImpact(e){return this.options.transport.deleteImpact(e)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let e;try{e=await this.options.transport.send(this.version,this.inflight)}catch(n){n instanceof u?this.handleRejection(n.error):this.handleNetworkError(n);return}this.applyResult(e),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(e,n,i){let o={id:w(),type:e,block:n,...i?{args:i}:{}};this.pending.push(o),this.persistQueue(),F(this.view,o,this.manifest),this.emit("change"),this.emit("command",{command:o}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(e){if(e.full)this.confirmed=new Map(e.blocks.map(n=>[n.id,n]));else{for(let n of e.blocks)this.confirmed.set(n.id,n);for(let n of e.deleted)this.confirmed.delete(n)}this.plan&&(this.plan={...this.plan,version:e.version})}handleRejection(e){let n=this.inflight;if(this.inflight=[],e.reason==="unauthenticated"||e.reason==="session_expired"){this.pending=[...n,...this.pending],this.persistQueue(),this.setSync("offline",e.message),this.emit("error",{error:e,command:null});return}let i=n.findIndex(l=>l.id===e.command),o=i>=0?n[i]:void 0,s=o?n.filter(l=>l!==o):[];this.pending=[...s,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:e,command:o??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(e){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",e instanceof h?e.message:String(e));let n=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),n)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let e of[...this.inflight,...this.pending])F(this.view,e,this.manifest)}get storageKey(){return this.plan?`plan-block:queue:${this.plan.id}`:null}persistQueue(){let e=this.storageKey;if(!this.storage||!e)return;let n=[...this.inflight,...this.pending];try{n.length?this.storage.setItem(e,JSON.stringify(n)):this.storage.removeItem(e)}catch{}}restoreQueue(){let e=this.storageKey;if(!this.storage||!e)return[];try{let n=JSON.parse(this.storage.getItem(e)??"[]");return Array.isArray(n)?n:[]}catch{return[]}}setSync(e,n){this.syncState=e,this.emit("sync",{state:e,pending:this.pendingCount,message:n})}emit(e,n={}){this.dispatchEvent(new CustomEvent(e,{detail:n}))}};function pe(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var T=class{constructor(t,e=3e4){this.wire=t;this.timeoutMs=e}planData=null;async loadPlan(){let{plan:t,blocks:e}=await this.loadPlanData();return{plan:t,blocks:e}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(t,e){let n=await this.call("runCommands",e,t);if(!n.ok)throw new u(n.error);return n}deleteImpact(t){return this.call("deleteImpact",t)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(t,...e){let n=typeof this.wire=="function"?await this.wire():this.wire,i;try{return await Promise.race([n.$call(t,...e),new Promise((o,s)=>{i=setTimeout(()=>s(new h("Livewire request timed out")),this.timeoutMs)})])}catch(o){throw ce(o)}finally{clearTimeout(i)}}};function ce(r){if(r instanceof u||r instanceof h)return r;let t=typeof r=="object"&&r!==null&&"status"in r?r.status:null,n=t!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[t]:void 0;return n?new u(n):new h(t?`Server error (${t})`:r instanceof Error?r.message:"Network error",t??void 0)}function a(r,t={},...e){let n=document.createElement(r);for(let[i,o]of Object.entries(t))o===!1||o===null||o===void 0||(i.startsWith(".")?n[i.slice(1)]=o:n.setAttribute(i,o===!0?"":String(o)));for(let i of e)i==null||i===!1||n.append(i instanceof Node?i:String(i));return n}function P(r,t,e,n){let i=r.type(e);if(!i)return!1;if(t===null)return i.root;let o=r.get(t),s=o?r.type(o.type):void 0;if(!o||!s||n&&(t===n||ue(r,t,n)))return!1;let l=s.children,d=l.allow.includes(e)||l.any_content&&!i.structural,c=i.parents===null||i.parents.includes(o.type);if(!d||!c)return!1;let p=l.max[e];return p===void 0?!0:r.children(t).filter(g=>g.type===e&&g.id!==n).length<p}function ue(r,t,e){let n=r.get(t),i=new Set;for(;n?.parent&&!i.has(n.id);){if(n.parent===e)return!0;i.add(n.id),n=r.get(n.parent)}return!1}var he=4,R=56,J=14,B=class{constructor(t){this.host=t}state=null;get dragging(){return this.state?.started??!1}onPointerDown=t=>{if(t.pointerType==="mouse"&&t.button!==0)return;let e=this.host.store,n=t.target?.closest("[data-pb-drag-handle]");if(!n||!e||this.host.readonly||this.state)return;let i=n.closest("[data-pb-key]"),o=i?.dataset.pbId;if(!(!i||!o||!e.get(o))){t.preventDefault();try{n.setPointerCapture?.(t.pointerId)}catch{}this.state={id:o,el:i,pointerId:t.pointerId,startX:t.clientX,startY:t.clientY,x:t.clientX,y:t.clientY,offsetX:0,offsetY:0,started:!1,ghost:null,drop:null,frame:0},window.addEventListener("pointermove",this.onPointerMove),window.addEventListener("pointerup",this.onPointerUp),window.addEventListener("pointercancel",this.cancel),window.addEventListener("keydown",this.onKeyDown,!0)}};cancel=()=>{this.finish(!1)};onPointerMove=t=>{let e=this.state;if(!(!e||t.pointerId!==e.pointerId)){if(e.x=t.clientX,e.y=t.clientY,!e.started){if(Math.hypot(e.x-e.startX,e.y-e.startY)<he)return;this.begin(e)}t.preventDefault(),this.positionGhost(e),this.updateDrop(e)}};onPointerUp=t=>{this.state&&t.pointerId===this.state.pointerId&&this.finish(!0)};onKeyDown=t=>{t.key==="Escape"&&this.state&&(t.preventDefault(),t.stopPropagation(),this.finish(!1))};begin(t){t.started=!0;let e=t.el.getBoundingClientRect();t.offsetX=t.startX-e.left,t.offsetY=t.startY-e.top;let n=t.el.cloneNode(!0);for(let o of[n,...n.querySelectorAll("*")])for(let s of["data-pb-key","data-pb-id","data-pb-action","data-pb-drag-handle","id","name"])o.removeAttribute(s);n.classList.add("pb-drag-ghost"),n.setAttribute("aria-hidden","true"),n.style.width=`${e.width}px`,t.ghost=n,t.el.dataset.pbDragging="",this.host.container?.classList.add("pb-root--dragging"),this.host.root.append(n);let i=()=>{this.state?.started&&(this.autoScroll(this.state),this.state.frame=requestAnimationFrame(i))};t.frame=requestAnimationFrame(i)}positionGhost(t){t.ghost&&(t.ghost.style.transform=`translate(${t.x-t.offsetX}px, ${t.y-t.offsetY}px)`)}autoScroll(t){let e=window.innerHeight,n=0;t.y<R?n=-J*(1-t.y/R):t.y>e-R&&(n=J*(1-(e-t.y)/R)),n!==0&&(window.scrollBy(0,n),this.updateDrop(t))}updateDrop(t){let e=this.findDrop(t);t.drop&&(t.drop.el!==e?.el||t.drop.position!==e?.position)&&delete t.drop.el.dataset.pbDrop,e&&(e.el.dataset.pbDrop=e.position),t.drop=e}findDrop(t){let e=this.host.store,n=e?.get(t.id);if(!e||!n)return null;let i=this.host.root,o=(i instanceof ShadowRoot?i:document).elementFromPoint(t.x,t.y);if(!o||(i instanceof ShadowRoot,!i.contains(o)))return null;let s=o.closest("[data-pb-key]");for(;s;){if(s===t.el||t.el.contains(s))return null;let l=s.dataset.pbId,d=e.get(l);if(!d)return null;if(P(e,d.parent,n.type,n.id)){let p=s.getBoundingClientRect(),b=t.y<p.top+p.height/2?"before":"after";return{el:s,position:b,parent:d.parent,after:this.afterFor(d.parent,l,b,n.id)}}let c=e.resolve(l)??d;if(P(e,c.id,n.type,n.id)){let p=e.children(c.id).filter(b=>b.id!==n.id).at(-1);return{el:s,position:"inside",parent:c.id,after:p?.id??null}}s=s.parentElement?.closest("[data-pb-key]")??null}return null}afterFor(t,e,n,i){if(n==="after")return e;let o=this.host.store.children(t).filter(l=>l.id!==i),s=o.findIndex(l=>l.id===e);return s>0?o[s-1].id:null}finish(t){let e=this.state;if(!e||(this.state=null,window.removeEventListener("pointermove",this.onPointerMove),window.removeEventListener("pointerup",this.onPointerUp),window.removeEventListener("pointercancel",this.cancel),window.removeEventListener("keydown",this.onKeyDown,!0),cancelAnimationFrame(e.frame),e.ghost?.remove(),delete e.el.dataset.pbDragging,e.drop&&delete e.drop.el.dataset.pbDrop,this.host.container?.classList.remove("pb-root--dragging"),!t||!e.started||!e.drop))return;let n=this.host.store?.get(e.id);if(!n)return;let{parent:i,after:o}=e.drop,s=this.host.store.children(n.parent),l=s[s.findIndex(d=>d.id===n.id)-1]?.id??null;(i!==n.parent||o!==l)&&this.host.move(n.id,i,o)}};var x={addDay:"+ Day",addPool:"+ Pool",add:r=>`+ ${r}`,newItem:r=>`New ${r.toLowerCase()}`,day:r=>`Day ${r}`,pool:"Pool",checkAll:"Check all items",markDone:r=>`Mark "${r}" done`,progress:(r,t)=>`${r}/${t}`,poolProgress:(r,t)=>`${r} of ${t} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",dragHandle:"Drag to move (or focus and use the arrow keys)",exclude:"Skip (do not count)",include:"Count again",addToDay:"Add to day\u2026",linked:"linked",doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day or a pool to start.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:r=>`This also appears in ${r}. Delete it everywhere?`};var Z=new Map;function $(r,t){Z.set(r,t)}function ee(r){return Z.get(r)??ke[r]??ve}function me(r){return r?.fields.find(t=>t.type==="text")??r?.fields.find(t=>t.type==="textarea")}function q(r){let t=me(r.type),e=t?r.target.payload[t.name]:void 0;return typeof e=="string"&&e!==""?e:r.type?.label??r.target.type}function L(r,t){let e=t??q(r);return r.readonly?a("span",{class:"pb-title"},e):a("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:r.labels.edit},e)}function f(r,t,e,n={}){return a("button",{type:"button",class:`pb-button pb-button--ghost${r==="delete"?" pb-button--danger":""}`,"data-pb-action":r,"aria-label":t,title:t,...n},a("span",{"aria-hidden":"true"},e))}function H(r,t={}){if(r.readonly)return null;let{labels:e,block:n,store:i}=r,o=i.children(null).filter(l=>l.type==="timeline"),s=n.parent?i.get(n.parent):void 0;return a("div",{class:"pb-actions"},t.linkable&&s?.type==="pool"&&o.length>0?a("select",{class:"pb-select","data-pb-action":"link","aria-label":e.addToDay},a("option",{value:""},e.addToDay),...o.map(l=>a("option",{value:l.id},j(i,l,e)))):null,f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),r.type?.root?null:f(n.excluded?"include":"exclude",n.excluded?e.include:e.exclude,n.excluded?"\u21BA":"\u2298"),f("delete",e.delete,"\u2715"))}function A(r,t){if(r.readonly)return null;let e=t.filter(n=>fe(r,n)).map(n=>a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":n,"data-pb-parent":r.target.id},r.labels.add(r.store.type(n)?.label??n)));return e.length?a("div",{class:"pb-footer"},...e):null}function fe(r,t){return P(r.store,r.target.id,t)}function M(r){return r.readonly||r.editing?null:a("button",{type:"button",class:"pb-drag-handle","data-pb-drag-handle":"","aria-label":r.labels.dragHandle,title:r.labels.dragHandle},a("span",{"aria-hidden":"true"},"\u283F"))}function N(r){return r.type?.checkable?a("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":r.target.checked,"aria-label":r.labels.markDone(q(r)),disabled:r.readonly}):null}function _(r){return r.isLink?a("span",{class:"pb-badge",title:r.labels.linked},`\u2197 ${r.labels.linked}`):null}function D(r){let{labels:t,target:e}=r;return a("form",{class:"pb-form","data-pb-form":""},...(r.type?.fields??[]).map(n=>te(n,e.payload[n.name])),a("div",{class:"pb-actions"},a("button",{type:"submit",class:"pb-button pb-button--primary"},t.save),a("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},t.cancel)))}function te(r,t){let e={name:r.name,class:"pb-input",required:r.required,"data-pb-field":r.type},n=t==null?"":String(t),i;switch(r.type){case"textarea":i=a("textarea",{...e,rows:3,maxlength:r.max},n);break;case"select":i=a("select",e,r.required?null:a("option",{value:""},"\u2014"),...(r.options??[]).map(o=>a("option",{value:String(o.value),selected:String(o.value)===n},o.label)));break;case"toggle":i=a("input",{name:r.name,type:"checkbox","data-pb-field":"toggle",".checked":t===!0||t===1||t==="1"});break;case"number":i=a("input",{...e,type:"number",step:"any",min:r.min,max:r.max,value:n});break;default:i=a("input",{...e,type:r.type==="text"?"text":r.type,maxlength:r.type==="text"||r.type==="url"?r.max:void 0,value:n})}return a("label",{class:"pb-field"},r.label,i)}function j(r,t,e){let n=typeof t.payload.label=="string"&&t.payload.label!==""?` \xB7 ${t.payload.label}`:"",i=t.day?.number??r.children(null).filter(o=>o.type==="timeline").indexOf(t)+1;return e.day(i)+n}function ne(r){if(!r)return null;let t=new Date(`${r}T00:00:00`);return Number.isNaN(t.getTime())?r:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(t)}var I={title:L,titleOf:q,iconButton:f,itemActions:H,addButtons:A,dragHandle:M,checkbox:N,linkBadge:_,editForm:D,fieldInput:te,dayTitle:j,formatDate:ne},be=r=>{let{target:t,labels:e,store:n}=r,i=t.progress??{state:"none",done:0,total:0},o=ne(t.day?.date??null);return a("section",{class:"pb-group pb-day"},a("header",{class:"pb-group__header"},M(r),a("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":i.state==="all",".indeterminate":i.state==="some","aria-label":e.checkAll,disabled:r.readonly||i.total===0}),a("div",{class:"pb-group__title"},r.editing?null:L(r,j(n,t,e)),o?a("span",{class:"pb-muted"},o):null,_(r)),a("span",{class:"pb-progress","data-state":i.state},e.progress(i.done,i.total)),r.readonly?null:a("div",{class:"pb-actions"},f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),f("delete",e.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},D(r)):null,r.children,A(r,["place","note",...re(r)]))},ge=r=>{let{target:t,labels:e}=r,n=t.progress??{state:"none",done:0,total:0},i=typeof t.payload.label=="string"&&t.payload.label!==""?t.payload.label:e.pool;return a("section",{class:"pb-group pb-pool"},a("header",{class:"pb-group__header"},M(r),a("div",{class:"pb-group__title"},r.editing?null:L(r,i),_(r)),a("span",{class:"pb-progress"},e.poolProgress(n.done,n.total)),r.readonly?null:a("div",{class:"pb-actions"},f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),f("delete",e.delete,"\u2715"))),r.editing?a("div",{class:"pb-children"},D(r)):null,r.children,A(r,["place","note",...re(r)]))},V=r=>{let{target:t,labels:e}=r,n=typeof t.payload.time=="string"?t.payload.time:null,i=typeof t.payload.maps_url=="string"?t.payload.maps_url:null,o=typeof t.payload.notes=="string"?t.payload.notes:null;return a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),N(r),a("div",{class:"pb-item__main"},r.editing?D(r):a("div",{},L(r)," ",_(r),t.done&&!t.checked?a("span",{class:"pb-badge pb-badge--done"},e.doneViaBackup):null,n||i?a("div",{class:"pb-meta"},n?a("span",{},n):null,i?a("a",{href:i,target:"_blank",rel:"noopener noreferrer"},e.openMap):null):null,o?a("div",{class:"pb-notes"},o):null)),r.editing?null:H(r,{linkable:!0})),r.children,r.editing||r.isLink?null:A(r,["backup","note"]))},ye=r=>a("div",{class:"pb-item pb-note-item"},a("div",{class:"pb-item__row"},M(r),a("div",{class:"pb-item__main"},r.editing?D(r):a("div",{class:"pb-note"},L(r))),r.editing?null:H(r))),ve=r=>a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},M(r),N(r),a("div",{class:"pb-item__main"},r.editing?D(r):a("div",{},L(r)," ",_(r))),r.editing?null:H(r,{linkable:!0})),r.children);function re(r){let t=["timeline","pool","link","place","backup","note"];return Object.keys(r.store.manifest?.types??{}).filter(e=>!t.includes(e))}var ke={timeline:be,pool:ge,place:V,backup:V,note:ye};var z=`/*
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
`;var ie=!1,v=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly"];_store=null;ownsStore=!1;_labels=x;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;drag=new B(this.dragHost());toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;get store(){return this._store}set store(t){this.detachStore(),this._store=t,this.ownsStore=!1,t&&(this.attachStore(t),this.state=t.plan?"ready":"idle",this.scheduleRender())}get labels(){return this._labels}set labels(t){this._labels={...x,...t},this.cache.clear(),this.scheduleRender()}get readonly(){return this.hasAttribute("readonly")}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():this.scheduleRender()}disconnectedCallback(){window.removeEventListener("plan-block-refresh",this.onRefresh),this.drag.cancel(),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(t,e,n){e===n||!this.isConnected||((t==="plan"||t==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(this.cache.clear(),this.scheduleRender()))}async boot(){let t=this.getAttribute("plan");if(!t)return;let e=new E({transport:this.createTransport(t)});this._store=e,this.ownsStore=!0,this.attachStore(e);let n=this.readInitialData();if(n){e.hydrate(n),this.state="ready",this.render(),this.emit("ready",{plan:e.plan});return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.emit("ready",{plan:e.plan})}catch(i){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:i instanceof Error?i.message:String(i)}})}this.render()}createTransport(t){if(this.getAttribute("transport")==="livewire"){let e=this.parentElement;for(;e&&!e.hasAttribute("wire:id");)e=e.parentElement;let n=e?.getAttribute("wire:id")??"";return new T(()=>Te(n))}return new k({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:t})}onRefresh=t=>{let e=t.detail,n=Array.isArray(e)?e[0]?.plan:e?.plan;this._store?.plan&&(!n||n===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let t=oe(this,"script[data-pb-initial]")[0];if(!t?.textContent)return null;try{return JSON.parse(t.textContent)}catch{return null}finally{t.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=t=>{let{command:e}=t.detail;this.emit(e.type.replace(/_/g,"-"),{id:e.block,command:e})};onError=t=>{let{error:e}=t.detail;this.showToast({message:e.message,kind:"error"}),this.emit("error",t.detail)};onSync=t=>{this.emit("sync",t.detail),this.scheduleRender()};attachStore(t){t.addEventListener("change",this.onChange),t.addEventListener("command",this.onCommand),t.addEventListener("error",this.onError),t.addEventListener("sync",this.onSync)}detachStore(){let t=this._store;t&&(t.removeEventListener("change",this.onChange),t.removeEventListener("command",this.onCommand),t.removeEventListener("error",this.onError),t.removeEventListener("sync",this.onSync),this.cache.clear())}adoptStyles(){let t=this.root instanceof ShadowRoot?this.root:document;if(!(t===document&&ie)){try{let e=new CSSStyleSheet;e.replaceSync(z),t.adoptedStyleSheets=[...t.adoptedStyleSheets,e]}catch{let e=a("style",{"data-plan-block":""},z);t===document?document.head.append(e):t.prepend(e)}t===document&&(ie=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let p of oe(this,"[data-pb-fallback]"))p.remove();this.container=a("div",{class:"pb-root"}),this.root.append(this.container)}let t=this._store,e=this._labels;if(!t||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(a("div",{class:"pb-empty"},e.loading));return}if(this.state==="failed"||!t.plan){this.container.replaceChildren(a("div",{class:"pb-empty",role:"alert"},e.loadFailed));return}let n=this.captureFocus(),i=new Set,o=t.children(null).map(p=>this.renderBlock(p,"",i,0));for(let p of this.cache.keys())i.has(p)||this.cache.delete(p);let s=this.ensure("list",()=>a("div",{class:"pb-list"}));Y(s,o.length?o:[a("div",{class:"pb-empty"},e.empty)]);let l=this.readonly?null:this.ensure("toolbar",()=>a("div",{class:"pb-toolbar"},a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},e.addDay),a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},e.addPool))),d=a("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":t.syncState},t.syncState==="saving"?e.saving:t.syncState==="offline"?e.offline:""),c=this.toast?a("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},a("span",{},this.toast.message),a("div",{class:"pb-actions"},this.toast.action?a("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,a("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},e.dismiss))):null;Y(this.container,[l,s,d,c].filter(p=>p!==null)),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${K(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus()),this.restoreFocus(n)}captureFocus(){let t=(this.root instanceof ShadowRoot?this.root:document).activeElement;if(!t||!this.container?.contains(t))return null;let e=t.closest("[data-pb-key]")?.dataset.pbKey;if(!e)return null;let n=t.dataset?.pbAction,i=t.hasAttribute("data-pb-drag-handle")?"[data-pb-drag-handle]":n?`[data-pb-action="${K(n)}"]`:null;return i?{key:e,selector:i,el:t}:null}restoreFocus(t){if(!t||(this.root instanceof ShadowRoot?this.root:document).activeElement===t.el)return;if(t.el.isConnected){t.el.focus();return}let n=this.root.querySelector(`[data-pb-key="${K(t.key)}"]`);[...n?.querySelectorAll(t.selector)??[]].find(o=>o.closest("[data-pb-key]")===n)?.focus()}persistent=new Map;ensure(t,e){let n=this.persistent.get(t);return n||(n=e(),this.persistent.set(t,n)),n}renderBlock(t,e,n,i){let o=this._store,s=e+t.id,l=t.type==="link",d=(l?o.resolve(t.id):t)??t,c=o.type(d.type),p=this.editingKey===s;n.add(s);let b=JSON.stringify([t,l?d:null,p,this.readonly,t.parent?o.children(t.parent).length:0,o.children(d.id).map(m=>m.type).join(),o.children(null).filter(m=>m.type==="timeline").map(m=>m.id+(m.payload.label??"")).join()]),g=this.cache.get(s);if(!g||g.signature!==b){let m=g?.children??a("div",{class:"pb-children","data-pb-children":""}),le={block:t,target:d,type:c,isLink:l,children:m,editing:p,readonly:this.readonly,store:o,labels:this._labels,h:a,parts:I},y=ee(d.type)(le);y.classList.add("pb-block"),y.dataset.pbId=t.id,y.dataset.pbKey=s,y.dataset.pbType=d.type,O(y,"pbLink",l),O(y,"pbChecked",d.checked),O(y,"pbDone",d.done),O(y,"pbExcluded",t.excluded),g={signature:b,el:y,children:m},this.cache.set(s,g)}let se=l?`${s}>`:e,ae=i>20?[]:o.children(d.id).map(m=>this.renderBlock(m,se,n,i+1));return Y(g.children,ae),g.el}dragHost(){let t=this;return{get root(){return t.root},get container(){return t.container},get store(){return t._store},get readonly(){return t.readonly},move:(e,n,i)=>t._store?.move(e,{parent:n,after:i})}}listen(){this.listening=!0,this.root.addEventListener("click",t=>this.onClick(t)),this.root.addEventListener("change",t=>this.onInputChange(t)),this.root.addEventListener("submit",t=>this.onSubmit(t)),this.root.addEventListener("pointerdown",t=>this.drag.onPointerDown(t)),this.root.addEventListener("keydown",t=>{let e=t.key;if(e==="Escape"&&this.editingKey){this.editingKey=null,this.scheduleRender();return}let i=t.target?.closest("[data-pb-drag-handle]")?.closest("[data-pb-key]");(e==="ArrowUp"||e==="ArrowDown")&&i?.dataset.pbId&&!this.readonly&&(t.preventDefault(),this.shift(i.dataset.pbId,e==="ArrowUp"?-1:1))})}actionTarget(t){let e=t.target?.closest("[data-pb-action]");if(!e||!this.root.contains(e))return null;let n=e.closest("[data-pb-key]");return{action:e.dataset.pbAction,el:e,id:n?.dataset.pbId??null,key:n?.dataset.pbKey??null}}onClick(t){let e=this.actionTarget(t),n=this._store;if(!e||!n)return;let{action:i,el:o,id:s,key:l}=e;if(!(i==="toggle-check"||i==="check-all"||i==="link")){switch(i){case"add":return this.add(o.dataset.pbType,o.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return n.restore(o.dataset.pbTarget??s),this.showToast(null)}if(s)switch(i){case"check":return n.check(s);case"uncheck":return n.uncheck(s);case"exclude":return n.exclude(s);case"include":return n.include(s);case"move-up":case"move-down":return this.shift(s,i==="move-up"?-1:1);case"delete":this.confirmDelete(s);return}}}onInputChange(t){let e=this.actionTarget(t),n=this._store;if(!e?.id||!n)return;let i=e.el;if(e.action==="toggle-check")n.setChecked(e.id,i.checked);else if(e.action==="check-all")i.checked?n.checkAll(e.id):n.uncheckAll(e.id);else if(e.action==="link"){let o=e.el.value;o&&(n.link(e.id,o,n.children(o).at(-1)?.id??null),e.el.value="")}}onSubmit(t){let e=t.target?.closest("[data-pb-form]");if(!e||!this._store)return;t.preventDefault();let n=e.closest("[data-pb-key]"),i=n?.dataset.pbId?this._store.resolve(n.dataset.pbId):void 0,o=i?this._store.type(i.type):void 0;if(!i||!o)return;let s={};for(let l of o.fields){let d=Ee(e,l),c=i.payload[l.name]??null;d!==c&&(s[l.name]=d)}Object.keys(s).length&&this._store.update(i.id,s),this.editingKey=null,this.scheduleRender()}add(t,e,n){let i=this._store,o=i.type(t),s=o?.fields.find(p=>p.type==="text"||p.type==="textarea"),l=s?.required?{[s.name]:this._labels.newItem(o?.label??t)}:{},d=i.children(e).at(-1)?.id??null,c=i.create(t,{parent:e,after:d,payload:l});if(s){let p=n?this.cache.get(n):void 0,b=n&&e&&p?.el.dataset.pbLink!==void 0?`${n}>`:n&&e?n.slice(0,-e.length):"";this.editingKey=b+c,this.focusEditor=!0}}shift(t,e){let n=this._store,i=n.get(t);if(!i)return;let o=n.children(i.parent),s=o.findIndex(l=>l.id===t);e===-1&&s>0?n.move(t,{after:s>=2?o[s-2].id:null}):e===1&&s<o.length-1&&n.move(t,{after:o[s+1].id})}async confirmDelete(t){let e=this._store,n=[];try{let i=await e.deleteImpact(t);n=[...new Set(i.links.map(o=>o.day?this._labels.day(o.day.number):this._labels.pool))]}catch{}n.length&&!window.confirm(this._labels.confirmDeleteLinked(n.join(", ")))||(e.delete(t),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:t}}))}showToast(t){this.toast=t,this.toastTimer&&clearTimeout(this.toastTimer),t&&(this.toastTimer=setTimeout(()=>this.showToast(null),t.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(t,e){this.dispatchEvent(new CustomEvent(`plan-block:${t}`,{detail:e,bubbles:!0,composed:!0}))}};function Ee(r,t){let e=r.elements.namedItem(t.name);if(!e)return null;if(t.type==="toggle")return e.checked;let n=e.value.trim();return n===""?null:t.type==="number"?Number(n):n}function Y(r,t){let e=r.children;e.length===t.length&&t.every((n,i)=>e[i]===n)||r.replaceChildren(...t)}function Te(r,t=1e4){let e=()=>window.Livewire?.find(r);return new Promise((n,i)=>{let o=e();if(o)return n(o);let s=Date.now(),l=()=>{let p=e();p?(c(),n(p)):Date.now()-s>t&&(c(),i(new Error(`Livewire component ${r||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),c=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function oe(r,t){return Array.from(r.children).filter(e=>e.matches(t))}function O(r,t,e){e?r.dataset[t]="":delete r.dataset[t]}function K(r){return r.replace(/["\\]/g,"\\$&")}function X(r="plan-block"){typeof customElements<"u"&&!customElements.get(r)&&customElements.define(r,r==="plan-block"?v:class extends v{})}X();var Se={PlanStore:E,HttpTransport:k,LivewireTransport:T,RejectedError:u,TransportError:h,PlanBlockElement:v,renderer:$,parts:I,h:a,defaultLabels:x,defineElement:X,ulid:w};window.PlanBlock=Se;})();
