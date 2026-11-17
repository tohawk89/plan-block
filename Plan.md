# Plan Block — Product Requirements & Technical Architecture (v2)

> Status: **design agreed, pre-implementation**. This supersedes `blockplan.pdf` (v1). v1 scope and decisions: §14.

---

## 1. Product Overview

**Plan Block** is a modular, Notion-style block system distributed as a Laravel package, built for dynamic itinerary and contingency planning. Blocks can be scheduled or kept in a flexible sandbox, nested (backup plans), and linked across days with a single source of truth.

**Primary goal:** plug into any Laravel front end — **Blade, Livewire, or a JS framework (Vue / React / Inertia)** — while all behaviour runs through the package's own handler code. Developers customise *how blocks look*; the package owns *how blocks behave*.

---

## 2. Core Features & UX

- **Timeline vs. Sandbox.** Blocks are either ordered within a day (timeline) or kept in a pool to pull from when needed.
- **Inline backups.** Backup blocks nest under a primary block (e.g. a backup restaurant inside Breakfast).
- **Linking with a single source of truth.** Any block — individual or group — can be linked elsewhere. Checking it in one place checks it everywhere.
- **Checkbox state.** Every individual block is a checkbox; groups show a derived tri-state checkbox (see §5).
- **Order first.** Sequence is defined by manual order, not by time (see §6).
- **Independent styling.** Scoped CSS that does not clash with Tailwind, Bootstrap, etc.

---

## 3. Architecture: Headless Core + Adapters

```
┌─────────────────────────────────────────────────────────┐
│ Adapters (presentation)                                 │
│  Blade components │ Livewire │ <plan-block> web comp.   │
│                   │          │ Vue/React/Inertia wraps  │
├─────────────────────────────────────────────────────────┤
│ JS client core (headless)    store, commands,           │
│                              optimistic update, sync    │
├─────────────────────────────────────────────────────────┤
│ Contract: JSON tree format + command endpoint (§8)      │
├─────────────────────────────────────────────────────────┤
│ PHP core: models, block type registry, check logic,     │
│           Actions (Check, Move, Link, ...), events      │
└─────────────────────────────────────────────────────────┘
```

1. **PHP core (UI-free).** All behaviour lives in Action classes (`CreateBlock`, `MoveBlock`, `CheckBlock`, `LinkBlock`, `DeleteBlock`, ...). The API controller, the Livewire adapter, queue jobs and host code all call the same Actions — one implementation, no drift between stacks.
2. **Contract.** A versioned JSON tree format plus a command endpoint. Every adapter speaks it.
3. **Headless JS client.** Store, command dispatch, optimistic updates with rollback, linked-block sync. Renders nothing itself; framework wrappers bind to it.
4. **Adapters.**
   - **Web component** `<plan-block plan="...">` — the universal default; works in Blade, Livewire, Inertia, Vue, React.
   - **Blade adapter** — `<x-plan-block :plan="$plan" />` outputs the web component with the plan's data embedded as JSON (no extra requests on load) and a read-only server-rendered copy from per-type Blade views (shown until the script loads and without JavaScript). Data is only embedded when the `plan-block.view` gate allows. `@planBlockAssets` adds the prebuilt script from a public, hash-versioned asset route (CSP nonce supported, reuses `Vite::cspNonce()`).
   - **Livewire adapter** — calls Actions directly in PHP and re-renders normally (no `wire:ignore` needed). `wire:ignore` is only needed when dropping the web component inside a Livewire view.
   - **Vue / React wrappers** — thin bindings over the headless client, built on demand.

**Change from v1:** "DOM attributes are the state" is no longer a core rule. The headless store is the client's source of truth. Vanilla and web-component renderers mirror it into `data-pb-*` attributes so CSS can style by state.

---

## 4. Block Types

### 4.1 Structural vs. content types

| Kind | Types | Customisable? |
|---|---|---|
| **Structural (locked)** | `timeline` (day), `pool`, `link` | Renderer only. Behaviour, rules and group logic are fixed so linking and progress guarantees hold. |
| **Content (open)** | `place`, `backup`, `note`, and any developer-registered type (`hotel`, `flight`, ...) | Fully definable via a block type definition. |

### 4.2 Block type definition (sketch)

```php
class PlaceBlock extends BlockType
{
    public static string $key = 'place';

    public function label(): string { return 'Place'; }
    public function icon(): string  { return 'map-pin'; }

    // Payload schema → validation + auto-generated edit form
    public function fields(): array
    {
        return [
            Field::text('name')->required()->max(120),
            Field::url('maps_url'),
            Field::time('time'),
            Field::textarea('notes'),
        ];
    }

    // Tree rules
    public function parents(): array { return ['timeline', 'pool']; }

    public function children(): Children
    {
        return Children::allow(['backup', 'note'])->max('backup', 3);
    }

    // Host models this block may attach to (polymorphic)
    public function attachable(): array
    {
        return [Restaurant::class, Attraction::class];
    }

    // Optional guards on check / uncheck
    public function checkGuards(): array
    {
        return [];
    }

    // Presentation per adapter; falls back to package default
    public function renderers(): array
    {
        return [
            'blade' => 'blocks.place',
            'js'    => 'place',
        ];
    }
}
```

Guards and any side effects are **classes, not closures**: testable, transactional, and safe with `config:cache`.

### 4.3 Registration and extension

```php
// AppServiceProvider
PlanBlock::register([HotelBlock::class, FlightBlock::class]);

// Modify a built-in content type without forking
PlanBlock::extend('place', fn (PlaceBlock $type) => $type
    ->addField(Field::number('budget')->min(0))
    ->renderer('blade', 'my-app.blocks.place')
);
```

### 4.4 Customisation levels

| Level | Developer does | Still tied to package handlers because |
|---|---|---|
| 1. Theme | Override CSS variables (`--pb-accent`, ...) | Only tokens change |
| 2. Template override | Publish/override a view, slot or render function | Markup uses package action hooks (`data-pb-action="check"` / `block.check()`) |
| 3. Custom block type | Register a type class | Goes through the registry and check logic |
| 4. Hooks | Listen to events, add guards | Runs inside package handlers |

### 4.5 Manifest

PHP definitions are serialised into a manifest (inlined or served from an endpoint) that every adapter reads:

```json
{
  "version": 1,
  "types": {
    "place": {
      "label": "Place",
      "fields": [{ "name": "name", "type": "text", "required": true }],
      "parents": ["timeline", "pool"],
      "children": ["backup", "note"],
      "renderer": "place"
    }
  }
}
```

The client uses it **only for UI decisions** (which buttons to show, valid drop targets, default forms). The server re-validates every command.

### 4.6 Renderer contract

Every adapter's renderer receives the same inputs: **`block`** (data), **`actions`** (actions currently allowed), and **children**.

```blade
<div {{ $pb->attributes($block) }}>
  <h3>{{ $block->payload('name') }}</h3>
  <input type="checkbox" data-pb-action="check" @checked($block->isChecked())>
  {{ $pb->children($block) }}
</div>
```

`$pb->attributes()` outputs `data-pb-id`, `data-pb-type`, `data-pb-checked`, etc. This is what binds custom markup back to package handlers via event delegation.

---

## 5. Check State (Checkbox Model)

### 5.1 Individual blocks

Stored state is a checkbox:

- `checked_at` — nullable timestamp (null = unchecked)
- `checked_by` — nullable user id (for shared plans)

No custom statuses. A type that needs something like "booked" stores it as a payload field.

### 5.2 Groups (derived, never stored)

Groups show a tri-state checkbox derived from their children: `☐ none` · `◩ some` · `☑ all/done`. Because it is computed, it never desyncs (adding a child to a done day makes it "some" automatically).

| Group | Rule | Meaning | Bulk check |
|---|---|---|---|
| Day / timeline | **all** | Done when every (non-excluded) item is done | Yes — checks **primaries only**; uncheck-all clears primaries and backups |
| Place with backups | **any** | Done if the primary **or** any backup is checked | — |
| Pool / sandbox | **count** | Progress only ("3 of 10 visited"), never "done" | No |

### 5.3 Excluded

`excluded_at` — nullable timestamp. The item stays visible (struck through) but is not counted in progress and is ignored by bulk check. Keeps trip history without blocking a day from reaching "done".

### 5.4 Checking links

Checking a link checks its **source**; all linked copies update. Progress counts each source once.

---

## 6. Ordering & Time

- **`order_column` is the source of truth** for sequence, scoped per `parent_id`.
- **Time is an optional label** (a `time` field on content types). A nullable `starts_at` column may be added later if "what's next" queries are needed.
- **Times never re-sort items.** Optionally show a soft hint when times are out of order.
- **Gapped order values** (1000, 2000, 3000...). Inserting between two items writes one row (e.g. 1500); rebalance siblings only when gaps run out.

---

## 7. Linking

- A link can point to an **individual block or a group**.
- **No links to links** — linking a link stores its source instead (always one hop).
- **No cycles** — a block cannot link to one of its own ancestors.
- **Group links mirror live** — a linked pool shows the source pool's current children; checking a child checks the source. The link's checkbox uses the source group's rule.
- **Delete:**
  - Deleting a **link** removes only that link.
  - Deleting a **source** deletes it and every link to it (`source_block_id` FK with `ON DELETE CASCADE`).
  - **Reminder before delete:** count links to the block *and all its descendants*, and warn: *"This also appears in Day 2 and Day 3. Delete everywhere?"*
  - **Soft delete + Undo toast** as a safety net.

`source_block_id` (block-to-block links) is deliberately separate from `attachable_type` / `attachable_id` (block-to-host-model).

---

## 8. Command Endpoint & Persistence

### 8.1 Endpoint

One endpoint per plan, accepting a single command or a batch:

```
POST /plan-block/plans/{plan}/commands
{
  "base_version": 41,
  "commands": [
    { "id": "c1", "type": "create", "block": "01J...X",
      "args": { "type": "place", "parent": "01J...D", "after": "01J...A", "payload": { } } },
    { "id": "c2", "type": "check", "block": "01J...X" }
  ]
}
```

### 8.2 Commands (1:1 with Actions)

`create`, `update` (payload), `move` (parent + after), `check`, `uncheck`, `check_all`, `uncheck_all`, `exclude`, `include`, `link`, `delete`, `restore`.

### 8.3 Key decisions

| Decision | Reason |
|---|---|
| **Client-generated ULIDs** | Client can create and then reference a block in the same batch before the server replies; no incremental IDs exposed. |
| **`check` / `uncheck`, never `toggle`** | Toggles cancel each other out under concurrent use; set-commands are idempotent. (Replaces v1 `toggleBlockStatus`.) |
| **Server returns all affected blocks** | One check can change linked copies and group totals; the client applies the returned changes, so logic isn't duplicated in JS. |
| **Optimistic with rollback** | Client applies immediately, keeps the command pending, rolls back and shows an error on rejection. |
| **Plan `version` counter** | Incremented per command. If `base_version` is stale, the server still applies and also returns changes since, so the client catches up. |
| **Last write wins** | Payload updates overwrite per field. Only impossible commands are rejected (e.g. move into a deleted parent). |

### 8.4 Authorisation

The package calls Laravel Gates `plan-block.view` and `plan-block.edit`. Default: only the plan's owner model may view/edit; the host app overrides with `Gate::define()`.

### 8.5 PHP API and Livewire

Host code and the Livewire adapter use the same bus without HTTP:

```php
$plan->commands($user)->check($block)->move($other, $day)->run(); // returns the same change list
```

`after: null` means "insert first"; omitting `parent` on `move` keeps the current parent.

### 8.6 Optional extras

- **Realtime:** after commit, broadcast the change list on `private-plan.{id}` via Laravel broadcasting (Reverb / Pusher); clients apply it the same way as their own responses.
- **Command log table:** audit trail and future undo/redo.

### 8.7 Client events

The `<plan-block>` element emits bubbling, composed browser events for host integration (generalised from v1's `plan-block-updated`), named after the command: `plan-block:check`, `plan-block:check-all`, `plan-block:move`, `plan-block:delete`, ... plus `plan-block:error`, `plan-block:sync` and `plan-block:ready`. The headless `PlanStore` emits `change`, `command`, `error` and `sync`. Laravel events (`BlockChecked`, `BlockMoved`, ...) are dispatched server-side.

Client implementation notes (v1):

- **View = confirmed server state + unconfirmed commands**, recomputed on every change. Rollback is dropping a command and recomputing.
- Optimistic updates cover stored fields only (checked, payload, position, new and deleted blocks). Group progress and "done" come from the server response.
- Commands issued in the same tick go out as one batch. If the server rejects one command, the rest of the batch is resent.
- Network errors: commands stay queued in `localStorage` and retry with backoff (and on the browser's `online` event). Signed-out or expired sessions keep the queue until reload.
- `delete` on an already-deleted block is a no-op on the server, so retries are safe.

---

## 9. Database Schema (draft)

### `plans` (default table name `plan_block_plans`, configurable)

| Column | Type | Notes |
|---|---|---|
| id | BigInt | PK |
| ulid | ULID | Public identifier |
| owner_type / owner_id | String morph, nullable | Host decides ownership; strings so int, UUID and ULID keys all work |
| title | String | e.g. "Trip to JB" |
| start_date | Date, nullable | Day dates derive from this (§14.4) |
| version | Integer | Incremented per command (§8.3) |
| timestamps, deleted_at | | |

### `plan_blocks` (default table name `plan_block_blocks`, configurable)

| Column | Type | Notes |
|---|---|---|
| id | BigInt | PK |
| ulid | ULID | Public / client-generated identifier |
| plan_id | FK | Parent plan |
| parent_id | FK, nullable | Self-reference for nesting |
| block_type | String | `timeline`, `pool`, `link`, `place`, `backup`, custom... |
| order_column | Integer | Gapped ordering, scoped per `parent_id` |
| source_block_id | FK, nullable | Link target; `ON DELETE CASCADE` |
| attachable_type / attachable_id | String morph, nullable | Attach to host model (e.g. `Restaurant`) |
| payload | JSON | Type-specific fields |
| checked_at | Timestamp, nullable | Checkbox state (individual blocks only) |
| checked_by | String, nullable | Auth identifier of who checked it (no FK: host users table is unknown) |
| excluded_at | Timestamp, nullable | Excluded from progress |
| delete_batch | ULID, nullable | Blocks deleted together share a batch and restore together |
| timestamps, deleted_at | | Soft delete for undo |

### Loading

Load a whole plan in **one query** (`PlanBlock::where('plan_id', $id)->get()`) and build the tree in memory. Works at any depth; no nested-set package and no fixed-depth eager loading. (Replaces v1 §3.2.)

---

## 10. Payloads & Field DSL

- **Field DSL** — one definition produces validation rules *and* an auto-generated edit form. Kept small for v1:
  - Types: `text`, `textarea`, `url`, `number`, `date`, `time`, `select`, `toggle`
  - `->rules([...])` escape hatch for any Laravel rule
  - Developers may replace the auto form entirely
- **Payload versioning (v1: lenient reading only)** — missing fields fall back to defaults; unknown fields are kept but ignored. Formal `version()` / `migratePayload()` deferred to v2.

---

## 11. Styling

Scoped CSS shipped by the package (decided, see §14.6):

- `.pb-` class prefix + CSS cascade layers (`@layer plan-block`)
- Theme via CSS custom properties (`--pb-*`)
- Shadow DOM opt-in for the web component only

Must account for Tailwind preflight / Bootstrap reboot bleeding in.

---

## 12. Packaging

Monorepo:

- **Composer:** `tohawk89/plan-block` — PHP core, API, Blade and Livewire adapters, plus prebuilt JS/CSS assets
- **npm (JS-framework users only):** `client`, `web-component`, later `vue`, `react` — scope name TBD

---

## 13. Build Order

1. PHP core, Actions, schema, command contract
2. Headless JS client + web component (works in every stack)
3. Blade adapter, then Livewire adapter
4. Vue / React wrappers (on demand)

---

## 14. v1 Scope & Decisions

### 14.1 Platform

| Item | Decision |
|---|---|
| PHP | 8.3+ |
| Laravel | 12+ (11 dropped: end of life, every release has open security advisories) |
| Livewire | 3+ (adapter ships after v1 core) |
| Databases | MySQL, PostgreSQL, SQLite — CI runs tests on all three |
| Composer package | `tohawk89/plan-block` (Packagist) |
| PHP namespace | `Tohawk89\PlanBlock` |
| Repository | `github.com/tohawk89/plan-block` (public) |
| License | MIT |

### 14.2 Plan ownership

- Package ships the `plans` table (§9).
- Host models opt in with a `HasPlans` trait (e.g. `Trip` has plans) via the polymorphic `owner_type` / `owner_id`.
- Table names are configurable in `config/plan-block.php`.

### 14.3 Plan root structure

- Only **days (`timeline`) and pools** may sit at the top level of a plan.
- **Pools belong to the plan**, not to a day; a plan may have several pools. Days pull from or link to pools.

### 14.4 Day dates

- `plans` gets a nullable `start_date`.
- A day's date is derived: `start_date + position among days`. Reordering days updates dates automatically.
- A day may override its label in its payload (e.g. "Arrival day"). No start date → days show "Day 1, Day 2...".

### 14.5 Asset delivery

- **Blade / Livewire users need no npm.** The package serves its prebuilt JS and CSS from its own route, injected with an `@planBlockAssets` Blade directive (Livewire-style).
- **npm packages are only for JS-framework users** (Vue / React / Inertia). npm scope TBD at publish time.
- The JS client is written in **TypeScript** and ships type definitions.

### 14.6 Styling

- `.pb-` class prefix + `@layer plan-block` cascade layer + `--pb-*` custom properties for theming.
- Shadow DOM is opt-in for the web component only.

### 14.7 Mobile & touch

- Reordering is built on **pointer events** (works with mouse, touch and pen); no native HTML5 drag-and-drop.
- Up/down move controls always available as a fallback and for accessibility.

### 14.8 Weak connections

- Failed commands are persisted in `localStorage` and **retried automatically** in order when the connection returns.
- Full offline editing is out of scope for v1.

### 14.9 v1 feature scope

**In:**

- Block types: `timeline` (day), `pool`, `link`, `place`, `backup`, `note`
- Commands: `create`, `update`, `move`, `check`, `uncheck`, `check_all`, `uncheck_all`, `exclude`, `include`, `link`, `delete`, `restore`
- Adapters: **Blade** and **web component**
- Field DSL (small set, §10), lenient payload reading
- Delete warning for linked blocks + soft delete with undo
- Retry queue for failed commands

**Later milestones:**

1. Livewire adapter
2. Custom block type registration as a public, documented API (internally used from day one)
3. Realtime broadcast
4. Vue / React wrappers

### 14.10 Quality

- **Tests:** Pest + Orchestra Testbench (PHP), Vitest (JS).
- **Contract fixtures:** shared JSON fixtures for the tree format and command responses, tested by both PHP and JS so the two sides cannot drift.
- **Accessibility:** group checkboxes use `aria-checked="mixed"` for "some"; keyboard reordering supported.
- **Translations:** all UI strings go through Laravel translation files (`lang/vendor/plan-block`).
- **Local testing:** Testbench workbench app served by Herd.

---

## 15. Deferred to v2

- Payload versioning & migrations
- Complex fields (map, coordinates); the `map` block type
- `starts_at` column / "what's next" queries
- Undo/redo built on the command log
- Full offline editing

## 16. Open Questions

- npm scope name for JS packages (decide before first npm publish)
