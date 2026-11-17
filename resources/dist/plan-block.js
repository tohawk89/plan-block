"use strict";(()=>{function D(n,t,e){let r=t.args??{};switch(t.type){case"create":case"link":{if(n.has(t.block))return;let i=r.parent??null,s=t.type==="link"?"link":String(r.type),o=e?.types[s],l={};for(let d of o?.fields??[])d.default!==void 0&&d.default!==null&&(l[d.name]=d.default);n.set(t.block,{id:t.block,type:s,parent:i,order:W(n,i,r.after??null,null),source:t.type==="link"?r.source??null:null,attachable:r.attachable??null,payload:{...l,...r.payload??{}},checked:!1,checked_at:null,checked_by:null,excluded:!1,done:!1,progress:o&&(o.rule==="all"||o.rule==="count")?{state:"none",done:0,total:0}:null,day:null});return}case"update":{let i=n.get(t.block);if(!i)return;n.set(i.id,{...i,payload:{...i.payload,...r.payload??{}}});return}case"move":{let i=n.get(t.block);if(!i)return;let s="parent"in r?r.parent??null:i.parent;n.set(i.id,{...i,parent:s,order:W(n,s,r.after??null,i.id)});return}case"check":case"uncheck":{let i=M(n,t.block);i&&z(n,i,t.type==="check",e);return}case"check_all":case"uncheck_all":{let i=M(n,t.block);if(!i)return;let s=t.type==="check_all";for(let o of T(n,i.id)){if(o.excluded)continue;let l=M(n,o.id);if(!l)continue;let d=s?[l]:[...j(n,l.id).reverse(),l];for(let p of d)p.type!=="link"&&e?.types[p.type]?.checkable&&z(n,p,s,e)}return}case"exclude":case"include":{let i=n.get(t.block);i&&n.set(i.id,{...i,excluded:t.type==="exclude"});return}case"delete":{let i=n.get(t.block);if(!i)return;let s=new Set([i.id,...j(n,i.id).map(o=>o.id)]);for(let o of n.values())o.source&&s.has(o.source)&&s.add(o.id);for(let o of s)n.delete(o);return}case"restore":return}}function M(n,t){let e=n.get(t);return e?.source?n.get(e.source)??e:e}function T(n,t){let e=[];for(let r of n.values())r.parent===t&&e.push(r);return e.sort((r,i)=>r.order-i.order||(r.id<i.id?-1:r.id>i.id?1:0))}function j(n,t){let e=[],r=[t],i=new Set;for(;r.length;){let s=r.pop();if(!i.has(s)){i.add(s);for(let o of T(n,s))e.push(o),r.push(o.id)}}return e}function z(n,t,e,r){let s=(r?.types[t.type]?.rule??"none")==="any"&&T(n,t.id).some(o=>!o.excluded&&o.done);n.set(t.id,{...t,checked:e,checked_at:e?new Date().toISOString():null,done:e||s})}function W(n,t,e,r){let i=T(n,t).filter(d=>d.id!==r);if(e===null){let d=i[0];return d?d.order/2:1024}let s=i.findIndex(d=>d.id===e),o=i[s];if(!o)return(i.at(-1)?.order??0)+1024;let l=i[s+1];return l?(o.order+l.order)/2:o.order+1024}var u=class extends Error{constructor(e){super(e.message);this.error=e;this.name="RejectedError"}},h=class extends Error{constructor(e,r){super(e);this.status=r;this.name="TransportError"}},v=class{constructor(t){this.options=t;this.endpoint=t.endpoint.replace(/\/+$/,""),this.fetchFn=t.fetch??((e,r)=>fetch(e,r))}endpoint;fetchFn;loadPlan(){return this.request("GET",`/plans/${this.options.plan}`)}loadManifest(){return this.request("GET","/manifest")}send(t,e){return this.request("POST",`/plans/${this.options.plan}/commands`,{base_version:t,commands:e})}deleteImpact(t){return this.request("GET",`/plans/${this.options.plan}/blocks/${t}/delete-impact`)}async request(t,e,r){let i={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...this.options.headers},s=this.options.csrfToken!==void 0?this.options.csrfToken:re();s&&(i["X-CSRF-TOKEN"]=s),r!==void 0&&(i["Content-Type"]="application/json");let o;try{o=await this.fetchFn(this.endpoint+e,{method:t,headers:i,credentials:"same-origin",body:r===void 0?void 0:JSON.stringify(r)})}catch(c){throw new h(c instanceof Error?c.message:"Network error")}if(o.ok)return await o.json();let l=await o.json().catch(()=>null);if(o.status===422)throw new u(l?.error??{reason:"invalid_request",message:l?.message??"The request was invalid."});let p={401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[o.status];throw p?new u(p):new h(l?.message??`Server error (${o.status})`,o.status)}};function re(){return typeof document>"u"?null:document.querySelector('meta[name="csrf-token"]')?.content??null}var G="0123456789abcdefghjkmnpqrstvwxyz";function k(n=Date.now()){let t="",e=n;for(let s=0;s<10;s++)t=G.charAt(e%32)+t,e=Math.floor(e/32);let r=new Uint8Array(16);crypto.getRandomValues(r);let i="";for(let s of r)i+=G.charAt(s%32);return t+i}var w=class extends EventTarget{constructor(e){super();this.options=e;this.storage=e.storage!==void 0?e.storage:ie(),this.retry=e.retry??{base:1e3,max:3e4},typeof window<"u"&&window.addEventListener("online",this.onOnline)}plan=null;manifest=null;syncState="idle";confirmed=new Map;view=new Map;pending=[];inflight=[];flushScheduled=!1;retryTimer=null;retryAttempt=0;destroyed=!1;storage;retry;onOnline=()=>this.retryNow();async load(){let[e,r]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.hydrate({...e,manifest:r})}hydrate(e){this.plan=e.plan,this.manifest=e.manifest,this.confirmed=new Map(e.blocks.map(r=>[r.id,r])),this.pending=this.restoreQueue(),this.recompute(),this.emit("change"),this.pending.length&&this.scheduleFlush()}async reload(){let[e,r]=await Promise.all([this.options.transport.loadPlan(),this.options.transport.loadManifest()]);this.destroyed||(this.plan=e.plan,this.manifest=r,this.confirmed=new Map(e.blocks.map(i=>[i.id,i])),this.recompute(),this.emit("change"))}destroy(){this.destroyed=!0,this.retryTimer&&clearTimeout(this.retryTimer),typeof window<"u"&&window.removeEventListener("online",this.onOnline)}get version(){return this.plan?.version??0}get pendingCount(){return this.pending.length+this.inflight.length}get(e){return this.view.get(e)}all(){return[...this.view.values()]}children(e){return T(this.view,e)}resolve(e){return M(this.view,e)}type(e){return this.manifest?.types[e]}create(e,r={}){let i=r.id??k();return this.dispatch("create",i,{type:e,parent:r.parent??null,after:r.after??null,payload:r.payload??{},...r.attachable?{attachable:r.attachable}:{}}),i}link(e,r,i=null){let s=k();return this.dispatch("link",s,{source:e,parent:r,after:i}),s}update(e,r){this.dispatch("update",e,{payload:r})}move(e,r){this.dispatch("move",e,"parent"in r?{parent:r.parent??null,after:r.after}:{after:r.after})}check(e){this.dispatch("check",e)}uncheck(e){this.dispatch("uncheck",e)}setChecked(e,r){this.dispatch(r?"check":"uncheck",e)}checkAll(e){this.dispatch("check_all",e)}uncheckAll(e){this.dispatch("uncheck_all",e)}exclude(e){this.dispatch("exclude",e)}include(e){this.dispatch("include",e)}delete(e){this.dispatch("delete",e)}restore(e){this.dispatch("restore",e)}deleteImpact(e){return this.options.transport.deleteImpact(e)}async flush(){if(this.flushScheduled=!1,this.destroyed||!this.plan||this.inflight.length||!this.pending.length)return;this.inflight=this.pending.splice(0),this.setSync("saving");let e;try{e=await this.options.transport.send(this.version,this.inflight)}catch(r){r instanceof u?this.handleRejection(r.error):this.handleNetworkError(r);return}this.applyResult(e),this.inflight=[],this.retryAttempt=0,this.persistQueue(),this.recompute(),this.emit("change"),this.pending.length?await this.flush():this.setSync("idle")}dispatch(e,r,i){let s={id:k(),type:e,block:r,...i?{args:i}:{}};this.pending.push(s),this.persistQueue(),D(this.view,s,this.manifest),this.emit("change"),this.emit("command",{command:s}),this.scheduleFlush()}scheduleFlush(){this.flushScheduled||this.retryTimer||(this.flushScheduled=!0,queueMicrotask(()=>void this.flush()))}applyResult(e){if(e.full)this.confirmed=new Map(e.blocks.map(r=>[r.id,r]));else{for(let r of e.blocks)this.confirmed.set(r.id,r);for(let r of e.deleted)this.confirmed.delete(r)}this.plan&&(this.plan={...this.plan,version:e.version})}handleRejection(e){let r=this.inflight;if(this.inflight=[],e.reason==="unauthenticated"||e.reason==="session_expired"){this.pending=[...r,...this.pending],this.persistQueue(),this.setSync("offline",e.message),this.emit("error",{error:e,command:null});return}let i=r.findIndex(l=>l.id===e.command),s=i>=0?r[i]:void 0,o=s?r.filter(l=>l!==s):[];this.pending=[...o,...this.pending],this.persistQueue(),this.recompute(),this.emit("change"),this.emit("error",{error:e,command:s??null}),this.pending.length?this.flush():this.setSync("idle")}handleNetworkError(e){this.pending=[...this.inflight,...this.pending],this.inflight=[],this.persistQueue(),this.setSync("offline",e instanceof h?e.message:String(e));let r=Math.min(this.retry.max,this.retry.base*2**this.retryAttempt);this.retryAttempt++,this.retryTimer=setTimeout(()=>this.retryNow(),r)}retryNow(){this.retryTimer&&clearTimeout(this.retryTimer),this.retryTimer=null,this.flush()}recompute(){this.view=new Map(this.confirmed);for(let e of[...this.inflight,...this.pending])D(this.view,e,this.manifest)}get storageKey(){return this.plan?`plan-block:queue:${this.plan.id}`:null}persistQueue(){let e=this.storageKey;if(!this.storage||!e)return;let r=[...this.inflight,...this.pending];try{r.length?this.storage.setItem(e,JSON.stringify(r)):this.storage.removeItem(e)}catch{}}restoreQueue(){let e=this.storageKey;if(!this.storage||!e)return[];try{let r=JSON.parse(this.storage.getItem(e)??"[]");return Array.isArray(r)?r:[]}catch{return[]}}setSync(e,r){this.syncState=e,this.emit("sync",{state:e,pending:this.pendingCount,message:r})}emit(e,r={}){this.dispatchEvent(new CustomEvent(e,{detail:r}))}};function ie(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}var E=class{constructor(t,e=3e4){this.wire=t;this.timeoutMs=e}planData=null;async loadPlan(){let{plan:t,blocks:e}=await this.loadPlanData();return{plan:t,blocks:e}}async loadManifest(){return(await this.loadPlanData()).manifest}async send(t,e){let r=await this.call("runCommands",e,t);if(!r.ok)throw new u(r.error);return r}deleteImpact(t){return this.call("deleteImpact",t)}loadPlanData(){return this.planData??=this.call("planData").finally(()=>{queueMicrotask(()=>this.planData=null)}),this.planData}async call(t,...e){let r=typeof this.wire=="function"?await this.wire():this.wire,i;try{return await Promise.race([r.$call(t,...e),new Promise((s,o)=>{i=setTimeout(()=>o(new h("Livewire request timed out")),this.timeoutMs)})])}catch(s){throw se(s)}finally{clearTimeout(i)}}};function se(n){if(n instanceof u||n instanceof h)return n;let t=typeof n=="object"&&n!==null&&"status"in n?n.status:null,r=t!==null?{401:{reason:"unauthenticated",message:"You are signed out. Sign in again to keep editing."},403:{reason:"forbidden",message:"You do not have permission to edit this plan."},404:{reason:"not_found",message:"This plan no longer exists."},419:{reason:"session_expired",message:"Your session expired. Reload the page to keep editing."}}[t]:void 0;return r?new u(r):new h(t?`Server error (${t})`:n instanceof Error?n.message:"Network error",t??void 0)}function a(n,t={},...e){let r=document.createElement(n);for(let[i,s]of Object.entries(t))s===!1||s===null||s===void 0||(i.startsWith(".")?r[i.slice(1)]=s:r.setAttribute(i,s===!0?"":String(s)));for(let i of e)i==null||i===!1||r.append(i instanceof Node?i:String(i));return r}var S={addDay:"+ Day",addPool:"+ Pool",add:n=>`+ ${n}`,newItem:n=>`New ${n.toLowerCase()}`,day:n=>`Day ${n}`,pool:"Pool",checkAll:"Check all items",markDone:n=>`Mark "${n}" done`,progress:(n,t)=>`${n}/${t}`,poolProgress:(n,t)=>`${n} of ${t} done`,edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",moveUp:"Move up",moveDown:"Move down",exclude:"Skip (do not count)",include:"Count again",addToDay:"Add to day\u2026",linked:"linked",doneViaBackup:"done via backup",openMap:"Map",saving:"Saving\u2026",offline:"Offline. Changes are saved on this device and will be sent when you reconnect.",deleted:"Deleted.",undo:"Undo",dismiss:"Dismiss",empty:"Nothing planned yet. Add a day or a pool to start.",loading:"Loading plan\u2026",loadFailed:"Could not load this plan.",confirmDeleteLinked:n=>`This also appears in ${n}. Delete it everywhere?`};var U=new Map;function H(n,t){U.set(n,t)}function Q(n){return U.get(n)??ue[n]??ce}function oe(n){return n?.fields.find(t=>t.type==="text")??n?.fields.find(t=>t.type==="textarea")}function A(n){let t=oe(n.type),e=t?n.target.payload[t.name]:void 0;return typeof e=="string"&&e!==""?e:n.type?.label??n.target.type}function x(n,t){let e=t??A(n);return n.readonly?a("span",{class:"pb-title"},e):a("button",{type:"button",class:"pb-title","data-pb-action":"edit",title:n.labels.edit},e)}function f(n,t,e,r={}){return a("button",{type:"button",class:`pb-button pb-button--ghost${n==="delete"?" pb-button--danger":""}`,"data-pb-action":n,"aria-label":t,title:t,...r},a("span",{"aria-hidden":"true"},e))}function P(n,t={}){if(n.readonly)return null;let{labels:e,block:r,store:i}=n,s=i.children(null).filter(l=>l.type==="timeline"),o=r.parent?i.get(r.parent):void 0;return a("div",{class:"pb-actions"},t.linkable&&o?.type==="pool"&&s.length>0?a("select",{class:"pb-select","data-pb-action":"link","aria-label":e.addToDay},a("option",{value:""},e.addToDay),...s.map(l=>a("option",{value:l.id},$(i,l,e)))):null,f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),n.type?.root?null:f(r.excluded?"include":"exclude",r.excluded?e.include:e.exclude,r.excluded?"\u21BA":"\u2298"),f("delete",e.delete,"\u2715"))}function R(n,t){if(n.readonly)return null;let e=t.filter(r=>ae(n,r)).map(r=>a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":r,"data-pb-parent":n.target.id},n.labels.add(n.store.type(r)?.label??r)));return e.length?a("div",{class:"pb-footer"},...e):null}function ae(n,t){let e=n.store.type(t),r=n.type?.children;if(!e||!r)return!1;let i=r.allow.includes(t)||r.any_content&&!e.structural,s=e.parents===null||e.parents.includes(n.target.type),o=r.max[t],l=n.store.children(n.target.id).filter(d=>d.type===t).length;return i&&s&&(o===void 0||l<o)}function O(n){return n.type?.checkable?a("input",{type:"checkbox",class:"pb-check","data-pb-action":"toggle-check",".checked":n.target.checked,"aria-label":n.labels.markDone(A(n)),disabled:n.readonly}):null}function L(n){return n.isLink?a("span",{class:"pb-badge",title:n.labels.linked},`\u2197 ${n.labels.linked}`):null}function C(n){let{labels:t,target:e}=n;return a("form",{class:"pb-form","data-pb-form":""},...(n.type?.fields??[]).map(r=>Y(r,e.payload[r.name])),a("div",{class:"pb-actions"},a("button",{type:"submit",class:"pb-button pb-button--primary"},t.save),a("button",{type:"button",class:"pb-button","data-pb-action":"cancel"},t.cancel)))}function Y(n,t){let e={name:n.name,class:"pb-input",required:n.required,"data-pb-field":n.type},r=t==null?"":String(t),i;switch(n.type){case"textarea":i=a("textarea",{...e,rows:3,maxlength:n.max},r);break;case"select":i=a("select",e,n.required?null:a("option",{value:""},"\u2014"),...(n.options??[]).map(s=>a("option",{value:String(s.value),selected:String(s.value)===r},s.label)));break;case"toggle":i=a("input",{name:n.name,type:"checkbox","data-pb-field":"toggle",".checked":t===!0||t===1||t==="1"});break;case"number":i=a("input",{...e,type:"number",step:"any",min:n.min,max:n.max,value:r});break;default:i=a("input",{...e,type:n.type==="text"?"text":n.type,maxlength:n.type==="text"||n.type==="url"?n.max:void 0,value:r})}return a("label",{class:"pb-field"},n.label,i)}function $(n,t,e){let r=typeof t.payload.label=="string"&&t.payload.label!==""?` \xB7 ${t.payload.label}`:"",i=t.day?.number??n.children(null).filter(s=>s.type==="timeline").indexOf(t)+1;return e.day(i)+r}function J(n){if(!n)return null;let t=new Date(`${n}T00:00:00`);return Number.isNaN(t.getTime())?n:new Intl.DateTimeFormat(void 0,{weekday:"short",day:"numeric",month:"short"}).format(t)}var _={title:x,titleOf:A,iconButton:f,itemActions:P,addButtons:R,checkbox:O,linkBadge:L,editForm:C,fieldInput:Y,dayTitle:$,formatDate:J},le=n=>{let{target:t,labels:e,store:r}=n,i=t.progress??{state:"none",done:0,total:0},s=J(t.day?.date??null);return a("section",{class:"pb-group pb-day"},a("header",{class:"pb-group__header"},a("input",{type:"checkbox",class:"pb-check","data-pb-action":"check-all",".checked":i.state==="all",".indeterminate":i.state==="some","aria-label":e.checkAll,disabled:n.readonly||i.total===0}),a("div",{class:"pb-group__title"},n.editing?null:x(n,$(r,t,e)),s?a("span",{class:"pb-muted"},s):null,L(n)),a("span",{class:"pb-progress","data-state":i.state},e.progress(i.done,i.total)),n.readonly?null:a("div",{class:"pb-actions"},f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),f("delete",e.delete,"\u2715"))),n.editing?a("div",{class:"pb-children"},C(n)):null,n.children,R(n,["place","note",...V(n)]))},de=n=>{let{target:t,labels:e}=n,r=t.progress??{state:"none",done:0,total:0},i=typeof t.payload.label=="string"&&t.payload.label!==""?t.payload.label:e.pool;return a("section",{class:"pb-group pb-pool"},a("header",{class:"pb-group__header"},a("div",{class:"pb-group__title"},n.editing?null:x(n,i),L(n)),a("span",{class:"pb-progress"},e.poolProgress(r.done,r.total)),n.readonly?null:a("div",{class:"pb-actions"},f("move-up",e.moveUp,"\u2191"),f("move-down",e.moveDown,"\u2193"),f("delete",e.delete,"\u2715"))),n.editing?a("div",{class:"pb-children"},C(n)):null,n.children,R(n,["place","note",...V(n)]))},K=n=>{let{target:t,labels:e}=n,r=typeof t.payload.time=="string"?t.payload.time:null,i=typeof t.payload.maps_url=="string"?t.payload.maps_url:null,s=typeof t.payload.notes=="string"?t.payload.notes:null;return a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},O(n),a("div",{class:"pb-item__main"},n.editing?C(n):a("div",{},x(n)," ",L(n),t.done&&!t.checked?a("span",{class:"pb-badge pb-badge--done"},e.doneViaBackup):null,r||i?a("div",{class:"pb-meta"},r?a("span",{},r):null,i?a("a",{href:i,target:"_blank",rel:"noopener noreferrer"},e.openMap):null):null,s?a("div",{class:"pb-notes"},s):null)),n.editing?null:P(n,{linkable:!0})),n.children,n.editing||n.isLink?null:R(n,["backup","note"]))},pe=n=>a("div",{class:"pb-item pb-note-item"},a("div",{class:"pb-item__row"},a("div",{class:"pb-item__main"},n.editing?C(n):a("div",{class:"pb-note"},x(n))),n.editing?null:P(n))),ce=n=>a("div",{class:"pb-item"},a("div",{class:"pb-item__row"},O(n),a("div",{class:"pb-item__main"},n.editing?C(n):a("div",{},x(n)," ",L(n))),n.editing?null:P(n,{linkable:!0})),n.children);function V(n){let t=["timeline","pool","link","place","backup","note"];return Object.keys(n.store.manifest?.types??{}).filter(e=>!t.includes(e))}var ue={timeline:le,pool:de,place:K,backup:K,note:pe};var F=`/*
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
`;var X=!1,g=class extends HTMLElement{static observedAttributes=["plan","endpoint","readonly"];_store=null;ownsStore=!1;_labels=S;root=this;container=null;cache=new Map;editingKey=null;focusEditor=!1;toast=null;toastTimer=null;renderScheduled=!1;state="idle";listening=!1;get store(){return this._store}set store(t){this.detachStore(),this._store=t,this.ownsStore=!1,t&&(this.attachStore(t),this.state=t.plan?"ready":"idle",this.scheduleRender())}get labels(){return this._labels}set labels(t){this._labels={...S,...t},this.cache.clear(),this.scheduleRender()}get readonly(){return this.hasAttribute("readonly")}connectedCallback(){window.addEventListener("plan-block-refresh",this.onRefresh),this.hasAttribute("shadow")&&!this.shadowRoot&&(this.root=this.attachShadow({mode:"open"})),this.hasAttribute("no-styles")||this.adoptStyles(),this.listening||this.listen(),!this._store&&this.getAttribute("plan")?document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.isConnected&&!this._store&&void this.boot(),{once:!0}):this.boot():this.scheduleRender()}disconnectedCallback(){window.removeEventListener("plan-block-refresh",this.onRefresh),this.ownsStore&&(this._store?.destroy(),this.detachStore(),this._store=null,this.state="idle")}attributeChangedCallback(t,e,r){e===r||!this.isConnected||((t==="plan"||t==="endpoint")&&this.ownsStore?(this._store?.destroy(),this.detachStore(),this._store=null,this.boot()):(this.cache.clear(),this.scheduleRender()))}async boot(){let t=this.getAttribute("plan");if(!t)return;let e=new w({transport:this.createTransport(t)});this._store=e,this.ownsStore=!0,this.attachStore(e);let r=this.readInitialData();if(r){e.hydrate(r),this.state="ready",this.render(),this.emit("ready",{plan:e.plan});return}this.state="loading",this.render();try{if(await e.load(),this._store!==e)return;this.state="ready",this.emit("ready",{plan:e.plan})}catch(i){if(this._store!==e)return;this.state="failed",this.emit("error",{error:{reason:"load_failed",message:i instanceof Error?i.message:String(i)}})}this.render()}createTransport(t){if(this.getAttribute("transport")==="livewire"){let e=this.parentElement;for(;e&&!e.hasAttribute("wire:id");)e=e.parentElement;let r=e?.getAttribute("wire:id")??"";return new E(()=>fe(r))}return new v({endpoint:this.getAttribute("endpoint")??"/plan-block",plan:t})}onRefresh=t=>{let e=t.detail,r=Array.isArray(e)?e[0]?.plan:e?.plan;this._store?.plan&&(!r||r===this._store.plan.id)&&this._store.reload().catch(()=>this.showToast({message:this._labels.loadFailed,kind:"error"}))};readInitialData(){let t=Z(this,"script[data-pb-initial]")[0];if(!t?.textContent)return null;try{return JSON.parse(t.textContent)}catch{return null}finally{t.remove()}}onChange=()=>{this._store?.plan&&(this.state="ready"),this.scheduleRender()};onCommand=t=>{let{command:e}=t.detail;this.emit(e.type.replace(/_/g,"-"),{id:e.block,command:e})};onError=t=>{let{error:e}=t.detail;this.showToast({message:e.message,kind:"error"}),this.emit("error",t.detail)};onSync=t=>{this.emit("sync",t.detail),this.scheduleRender()};attachStore(t){t.addEventListener("change",this.onChange),t.addEventListener("command",this.onCommand),t.addEventListener("error",this.onError),t.addEventListener("sync",this.onSync)}detachStore(){let t=this._store;t&&(t.removeEventListener("change",this.onChange),t.removeEventListener("command",this.onCommand),t.removeEventListener("error",this.onError),t.removeEventListener("sync",this.onSync),this.cache.clear())}adoptStyles(){let t=this.root instanceof ShadowRoot?this.root:document;if(!(t===document&&X)){try{let e=new CSSStyleSheet;e.replaceSync(F),t.adoptedStyleSheets=[...t.adoptedStyleSheets,e]}catch{let e=a("style",{"data-plan-block":""},F);t===document?document.head.append(e):t.prepend(e)}t===document&&(X=!0)}}scheduleRender(){this.renderScheduled||!this.isConnected||(this.renderScheduled=!0,queueMicrotask(()=>{this.renderScheduled=!1,this.render()}))}render(){if(!this.container){for(let p of Z(this,"[data-pb-fallback]"))p.remove();this.container=a("div",{class:"pb-root"}),this.root.append(this.container)}let t=this._store,e=this._labels;if(!t||this.state==="loading"||this.state==="idle"){this.container.replaceChildren(a("div",{class:"pb-empty"},e.loading));return}if(this.state==="failed"||!t.plan){this.container.replaceChildren(a("div",{class:"pb-empty",role:"alert"},e.loadFailed));return}let r=new Set,i=t.children(null).map(p=>this.renderBlock(p,"",r,0));for(let p of this.cache.keys())r.has(p)||this.cache.delete(p);let s=this.ensure("list",()=>a("div",{class:"pb-list"}));N(s,i.length?i:[a("div",{class:"pb-empty"},e.empty)]);let o=this.readonly?null:this.ensure("toolbar",()=>a("div",{class:"pb-toolbar"},a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"timeline","data-pb-parent":""},e.addDay),a("button",{type:"button",class:"pb-button","data-pb-action":"add","data-pb-type":"pool","data-pb-parent":""},e.addPool))),l=a("div",{class:"pb-status",role:"status","aria-live":"polite","data-state":t.syncState},t.syncState==="saving"?e.saving:t.syncState==="offline"?e.offline:""),d=this.toast?a("div",{class:"pb-toast",role:this.toast.kind==="error"?"alert":"status","data-kind":this.toast.kind},a("span",{},this.toast.message),a("div",{class:"pb-actions"},this.toast.action?a("button",{type:"button",class:"pb-button","data-pb-action":this.toast.action.name,"data-pb-target":this.toast.action.id},this.toast.action.label):null,a("button",{type:"button",class:"pb-button","data-pb-action":"dismiss"},e.dismiss))):null;N(this.container,[o,s,l,d].filter(p=>p!==null)),this.focusEditor&&this.editingKey&&(this.focusEditor=!1,this.root.querySelector(`[data-pb-key="${be(this.editingKey)}"] [data-pb-form] .pb-input`)?.focus())}persistent=new Map;ensure(t,e){let r=this.persistent.get(t);return r||(r=e(),this.persistent.set(t,r)),r}renderBlock(t,e,r,i){let s=this._store,o=e+t.id,l=t.type==="link",d=(l?s.resolve(t.id):t)??t,p=s.type(d.type),c=this.editingKey===o;r.add(o);let I=JSON.stringify([t,l?d:null,c,this.readonly,t.parent?s.children(t.parent).length:0,s.children(d.id).map(m=>m.type).join(),s.children(null).filter(m=>m.type==="timeline").map(m=>m.id+(m.payload.label??"")).join()]),y=this.cache.get(o);if(!y||y.signature!==I){let m=y?.children??a("div",{class:"pb-children","data-pb-children":""}),ne={block:t,target:d,type:p,isLink:l,children:m,editing:c,readonly:this.readonly,store:s,labels:this._labels,h:a,parts:_},b=Q(d.type)(ne);b.classList.add("pb-block"),b.dataset.pbId=t.id,b.dataset.pbKey=o,b.dataset.pbType=d.type,B(b,"pbLink",l),B(b,"pbChecked",d.checked),B(b,"pbDone",d.done),B(b,"pbExcluded",t.excluded),y={signature:I,el:b,children:m},this.cache.set(o,y)}let ee=l?`${o}>`:e,te=i>20?[]:s.children(d.id).map(m=>this.renderBlock(m,ee,r,i+1));return N(y.children,te),y.el}listen(){this.listening=!0,this.root.addEventListener("click",t=>this.onClick(t)),this.root.addEventListener("change",t=>this.onInputChange(t)),this.root.addEventListener("submit",t=>this.onSubmit(t)),this.root.addEventListener("keydown",t=>{t.key==="Escape"&&this.editingKey&&(this.editingKey=null,this.scheduleRender())})}actionTarget(t){let e=t.target?.closest("[data-pb-action]");if(!e||!this.root.contains(e))return null;let r=e.closest("[data-pb-key]");return{action:e.dataset.pbAction,el:e,id:r?.dataset.pbId??null,key:r?.dataset.pbKey??null}}onClick(t){let e=this.actionTarget(t),r=this._store;if(!e||!r)return;let{action:i,el:s,id:o,key:l}=e;if(!(i==="toggle-check"||i==="check-all"||i==="link")){switch(i){case"add":return this.add(s.dataset.pbType,s.dataset.pbParent||null,l);case"edit":return this.editingKey=l,this.focusEditor=!0,this.scheduleRender();case"cancel":return this.editingKey=null,this.scheduleRender();case"dismiss":return this.showToast(null);case"restore":return r.restore(s.dataset.pbTarget??o),this.showToast(null)}if(o)switch(i){case"check":return r.check(o);case"uncheck":return r.uncheck(o);case"exclude":return r.exclude(o);case"include":return r.include(o);case"move-up":case"move-down":return this.shift(o,i==="move-up"?-1:1);case"delete":this.confirmDelete(o);return}}}onInputChange(t){let e=this.actionTarget(t),r=this._store;if(!e?.id||!r)return;let i=e.el;if(e.action==="toggle-check")r.setChecked(e.id,i.checked);else if(e.action==="check-all")i.checked?r.checkAll(e.id):r.uncheckAll(e.id);else if(e.action==="link"){let s=e.el.value;s&&(r.link(e.id,s,r.children(s).at(-1)?.id??null),e.el.value="")}}onSubmit(t){let e=t.target?.closest("[data-pb-form]");if(!e||!this._store)return;t.preventDefault();let r=e.closest("[data-pb-key]"),i=r?.dataset.pbId?this._store.resolve(r.dataset.pbId):void 0,s=i?this._store.type(i.type):void 0;if(!i||!s)return;let o={};for(let l of s.fields){let d=me(e,l),p=i.payload[l.name]??null;d!==p&&(o[l.name]=d)}Object.keys(o).length&&this._store.update(i.id,o),this.editingKey=null,this.scheduleRender()}add(t,e,r){let i=this._store,s=i.type(t),o=s?.fields.find(c=>c.type==="text"||c.type==="textarea"),l=o?.required?{[o.name]:this._labels.newItem(s?.label??t)}:{},d=i.children(e).at(-1)?.id??null,p=i.create(t,{parent:e,after:d,payload:l});if(o){let c=r?this.cache.get(r):void 0,I=r&&e&&c?.el.dataset.pbLink!==void 0?`${r}>`:r&&e?r.slice(0,-e.length):"";this.editingKey=I+p,this.focusEditor=!0}}shift(t,e){let r=this._store,i=r.get(t);if(!i)return;let s=r.children(i.parent),o=s.findIndex(l=>l.id===t);e===-1&&o>0?r.move(t,{after:o>=2?s[o-2].id:null}):e===1&&o<s.length-1&&r.move(t,{after:s[o+1].id})}async confirmDelete(t){let e=this._store,r=[];try{let i=await e.deleteImpact(t);r=[...new Set(i.links.map(s=>s.day?this._labels.day(s.day.number):this._labels.pool))]}catch{}r.length&&!window.confirm(this._labels.confirmDeleteLinked(r.join(", ")))||(e.delete(t),this.showToast({message:this._labels.deleted,kind:"info",action:{label:this._labels.undo,name:"restore",id:t}}))}showToast(t){this.toast=t,this.toastTimer&&clearTimeout(this.toastTimer),t&&(this.toastTimer=setTimeout(()=>this.showToast(null),t.kind==="error"?8e3:6e3)),this.scheduleRender()}emit(t,e){this.dispatchEvent(new CustomEvent(`plan-block:${t}`,{detail:e,bubbles:!0,composed:!0}))}};function me(n,t){let e=n.elements.namedItem(t.name);if(!e)return null;if(t.type==="toggle")return e.checked;let r=e.value.trim();return r===""?null:t.type==="number"?Number(r):r}function N(n,t){let e=n.children;e.length===t.length&&t.every((r,i)=>e[i]===r)||n.replaceChildren(...t)}function fe(n,t=1e4){let e=()=>window.Livewire?.find(n);return new Promise((r,i)=>{let s=e();if(s)return r(s);let o=Date.now(),l=()=>{let c=e();c?(p(),r(c)):Date.now()-o>t&&(p(),i(new Error(`Livewire component ${n||"(none)"} not found. Is <plan-block transport="livewire"> inside <livewire:plan-block>?`)))},d=setInterval(l,50),p=()=>{clearInterval(d),document.removeEventListener("livewire:initialized",l)};document.addEventListener("livewire:initialized",l)})}function Z(n,t){return Array.from(n.children).filter(e=>e.matches(t))}function B(n,t,e){e?n.dataset[t]="":delete n.dataset[t]}function be(n){return typeof CSS<"u"&&CSS.escape?CSS.escape(n):n.replace(/["\\]/g,"\\$&")}function q(n="plan-block"){typeof customElements<"u"&&!customElements.get(n)&&customElements.define(n,n==="plan-block"?g:class extends g{})}q();var ge={PlanStore:w,HttpTransport:v,LivewireTransport:E,RejectedError:u,TransportError:h,PlanBlockElement:g,renderer:H,parts:_,h:a,defaultLabels:S,defineElement:q,ulid:k};window.PlanBlock=ge;})();
