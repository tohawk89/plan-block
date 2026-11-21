# Plan Block

[![Tests](https://github.com/tohawk89/plan-block/actions/workflows/tests.yml/badge.svg)](https://github.com/tohawk89/plan-block/actions/workflows/tests.yml)

A Notion-style block system for Laravel, built for flexible itineraries and backup plans.

- Schedule blocks into days or keep them in a sandbox pool
- Nest backup plans inside a primary block
- Link any block or group across days with a single source of truth
- Checkbox progress for items, days and pools
- Works with Blade, Livewire, or any JS framework

> **Status:** early release (0.x). It works and is tested on PHP 8.3 to 8.5, Laravel 12 and 13, and SQLite, MySQL and PostgreSQL, but the API may still change before 1.0. See [CHANGELOG.md](CHANGELOG.md) and the [full specification](https://github.com/tohawk89/plan-block/blob/main/Plan.md).

## Quick start (Blade)

Requires PHP 8.3+ and Laravel 12+.

```bash
composer require tohawk89/plan-block
php artisan migrate
```

Let a model own plans:

```php
use Tohawk89\PlanBlock\Concerns\HasPlans;

class User extends Authenticatable
{
    use HasPlans;
}

$plan = $user->createPlan('Trip to JB', '2026-12-01');
```

Show the editor. No npm needed: the package serves its own script.

```blade
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @planBlockAssets
</head>
<body>
    <x-plan-block :plan="$plan" />
</body>
```

The component embeds the plan's data, so the editor appears without extra requests, and renders a read-only copy for visitors without JavaScript. Blocks reorder by dragging their handle (mouse, touch or pen) or with the arrow keys on a focused handle. Options: `readonly`, `mode`, `theme`, `shadow` (Shadow DOM), `no-styles`, `:fallback="false"`.

#### Normal and edit modes

The editor has a **Normal / Edit** switch in its toolbar. Normal mode is for reading the plan and ticking things off: no drag handles, add buttons or delete controls. Edit mode shows them, with each block's actions (edit, move, skip, delete) in a "⋯" menu. A plan with blocks opens in normal mode and an empty plan in edit mode; after that, each browser remembers the last mode per plan. Set `mode="view"` or `mode="edit"` to choose the starting mode. Listen for `plan-block:mode` to react to switches, or read and set `element.mode`. `readonly` always means normal mode with no switch.

#### Colours and dark theme

Each day gets a colour, taking turns through coral, teal, purple, amber, blue, pink and green; ideas lists are gray. In edit mode, pick another colour from the day's "⋯" menu or its edit form ("Auto" goes back to the default). The colour is stored in the block's `color` field, so it shows for everyone and in the server-rendered copy. Backups are numbered ("Backup 1") and each day shows a progress bar.

Add `theme="dark"` for a dark editor, or `theme="auto"` to follow the device setting (default: light). To restyle, override the `--pb-*` variables, e.g. `--pb-teal`, `--pb-teal-soft` (header tint) and `--pb-teal-strong` (text on the tint).

Custom renderers get `ctx.mode` and `ctx.canEdit` (true only in edit mode and not readonly). Use `canEdit` to decide whether to show editing controls: `ctx.readonly` alone is still true only for readonly plans.

### Livewire

```blade
<livewire:plan-block :plan="$plan" />
```

Same editor, but changes go through the Livewire component (your Livewire session and middleware) straight to the package's command code. Works with Livewire 3.8.3+ and 4.4.8+ (earlier releases have open security advisories). Apps that only use Livewire can turn the JSON API off with `plan-block.routes.enabled = false`.

Other components can react to edits, and PHP code can tell the editor to reload:

```php
#[On('plan-block-changed')]            // fired after every saved change
public function refreshTotals(string $plan, int $version) { /* ... */ }

$this->dispatch('plan-block-refresh', plan: $plan->ulid);   // after changing a plan in PHP
```

To react on the server, extend `Tohawk89\PlanBlock\Livewire\PlanBlockEditor`, override `changed()`, and register your class as `plan-block`.

### Vue, React and Inertia

The JS package (published to npm later; for now from this repo's `js/` folder) has thin wrappers around the same editor. Pass the plan's data as a prop to show it without requests:

```php
// Controller (authorize first: initialData() does not check permissions)
Gate::authorize('plan-block.view', $plan);

return Inertia::render('Trip', ['planBlock' => PlanBlock::initialData($plan)]);
```

```vue
<script setup>
import { PlanBlock } from 'plan-block/vue'
defineProps(['planBlock'])
</script>

<template>
  <PlanBlock :initial="planBlock" @command="(c) => console.log(c.type)" />
</template>
```

```jsx
import { PlanBlock } from 'plan-block/react'

export default function Trip({ planBlock }) {
  return <PlanBlock initial={planBlock} onError={(e) => alert(e.message)} />
}
```

Props: `initial` or `plan` (ULID), `endpoint`, `readonly`, `mode`, `theme`, `shadow`, `noStyles`, `labels`, `store`, `transport`. Events: `ready`, `command`, `error`, `sync`. React 18 and 19, Vue 3.3+.

For a completely custom UI, use the headless store directly: `usePlanStore({ initial })` returns the store and a live snapshot (`usePlanSnapshot(store)` for an existing store). Call `store.check(id)`, `store.move(id, { parent, after })` and so on; changes appear instantly and are saved in the background.

### Live updates across tabs and devices

With Laravel broadcasting set up (`php artisan install:broadcasting`, e.g. Reverb or Pusher) and Laravel Echo on the page as `window.Echo`, turn it on:

```dotenv
PLAN_BLOCK_BROADCASTING=true
# "sync" sends during the request; leave empty to use your queue (needs a worker)
PLAN_BLOCK_BROADCAST_CONNECTION=sync
```

Every saved change is broadcast on the private channel `plan-block.plans.{ulid}`. The package authorizes it with the `plan-block.view` gate. Open editors apply changes from others instantly, and reload by themselves if they missed any (for example after a dropped connection). Load Echo before `@planBlockAssets`. If broadcasting fails (say Reverb is down), the change is still saved and the error is reported, not shown to the user. Turn live updates off per editor with `realtime="off"`, or supply another source through the element's `realtime` property.

### Who can view and edit

By default only the plan's owner can. Define the gates in your app to change that:

```php
use Tohawk89\PlanBlock\Models\Plan;

// e.g. in AppServiceProvider::boot()
Gate::define('plan-block.view', fn ($user, Plan $plan) => $plan->owner->is($user) || $user->is_admin);
Gate::define('plan-block.edit', fn ($user, Plan $plan) => $plan->owner->is($user));
```

### Changing plans from PHP

```php
use Tohawk89\PlanBlock\Commands\PendingCommands;

$plan->commands($user)
    ->create('timeline', id: $day = PendingCommands::newId())
    ->create('place', $day, payload: ['name' => 'Breakfast', 'time' => '08:00'])
    ->run();
```

## Local development

```bash
composer serve          # demo app at http://127.0.0.1:8000 (/, /livewire, /vue, /react, /readonly)
vendor/bin/testbench reverb:start   # optional: live updates between demo tabs
cd js && npm run demo   # build the demo bundles first (/vue, /react, and Echo for live updates)
vendor/bin/pest         # PHP tests
cd js && npm ci && npm test && npm run build
```

After changing anything in `js/src`, run `npm run build` and commit `resources/dist` (CI checks it is up to date).

## License

MIT. See [LICENSE](LICENSE).
