# Plan Block

[![Tests](https://github.com/tohawk89/plan-block/actions/workflows/tests.yml/badge.svg)](https://github.com/tohawk89/plan-block/actions/workflows/tests.yml)

A Notion-style block system for Laravel, built for flexible itineraries and backup plans.

- Schedule blocks into days or keep them in a sandbox pool
- Nest backup plans inside a primary block
- Link any block or group across days with a single source of truth
- Checkbox progress for items, days and pools
- Works with Blade, Livewire, or any JS framework

> **Status:** in development, not released yet. See [Plan.md](Plan.md) for the full specification.

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

The component embeds the plan's data, so the editor appears without extra requests, and renders a read-only copy for visitors without JavaScript. Options: `readonly`, `shadow` (Shadow DOM), `no-styles`, `:fallback="false"`.

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
composer serve          # demo app at http://127.0.0.1:8000 (/, /livewire, /readonly)
vendor/bin/pest         # PHP tests
cd js && npm ci && npm test && npm run build
```

After changing anything in `js/src`, run `npm run build` and commit `resources/dist` (CI checks it is up to date).

## License

MIT. See [LICENSE](LICENSE).
