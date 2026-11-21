# Changelog

All notable changes to this package are listed here. Versions follow
[Semantic Versioning](https://semver.org); while below 1.0, minor versions
may contain breaking changes.

## Unreleased

### Colours
- **Coloured days.** Each day has a colour (coral, teal, purple, amber, blue, pink, green in turn) shown as a tinted header and border; ideas lists are gray. Pick another from the day's "⋯" menu or its edit form, stored in a new optional `color` field on days and ideas lists (validated against the palette). The server-rendered copy uses the same colours.
- Days and ideas lists show a progress bar; a finished day gets a ✓ and a green bar.
- Backups are numbered ("Backup 1", "Backup 2") in their day's colour.
- **Dark theme**: `theme="dark"`, or `theme="auto"` to follow the device. Also a `theme` prop on the Vue and React wrappers.
- Colours are `--pb-*` CSS variables (`--pb-teal`, `--pb-teal-soft`, `--pb-teal-strong`, …) for restyling.

## 0.2.0 - 2026-11-21

### Editor
- **Normal and edit modes.** A Normal / Edit switch in the toolbar. Normal mode hides drag handles, add buttons and block actions, so the plan reads as a finished itinerary while checkboxes still work. A plan with blocks starts in normal mode and an empty plan in edit mode; the last choice is remembered per plan in the browser. New `mode` attribute and property, `plan-block:mode` event, `mode` prop on the Vue and React wrappers, and `ctx.mode` / `ctx.canEdit` for custom renderers.
- Block actions (edit, move up, move down, skip, delete) moved into a single "⋯" menu per block.
- When a block can hold more than one type, one "+ Add" menu replaces the row of "+ Place", "+ Note"… buttons.
- Clearer wording: pools are labelled "Ideas", "Exclude" is "Skip" (and "Undo skip"), and a linked copy shows where the original lives ("Also in Day 1") instead of "linked".

### Breaking
- The editor now opens plans that have blocks in normal mode. Add `mode="edit"` to keep the previous always-editing behaviour.
- Custom renderers that hide controls with `ctx.readonly` keep showing them in normal mode; switch to `ctx.canEdit`.
- Day and pool cards no longer use `overflow: hidden` (menus need to open past their edge).

## 0.1.0 - 2026-11-18

First release.

### Plans and blocks
- Days (timeline), pools (sandbox), places, backups, notes and links, in one table with nesting and gapped ordering.
- Checkbox model: individual blocks are checked; days are done when all items are ("all"), places when they or any backup are ("any"), pools show progress only ("count"). Items can be excluded from counting.
- Links to individual blocks or whole groups, with one source of truth; linking a link stores the original; cycles are rejected.
- Delete removes a block, its children and every link to it, with a warning listing where it also appears, and can be restored as one batch.
- Custom block types with a small field DSL (validation and auto-generated edit forms), placement rules, check guards and per-adapter renderers. Days, pools and links are locked.

### Saving
- One command API for every frontend (`create`, `update`, `move`, `check`, `uncheck`, `check_all`, `uncheck_all`, `exclude`, `include`, `link`, `delete`, `restore`), run in a transaction per batch with plan versioning.
- JSON endpoints, gated by `plan-block.view` and `plan-block.edit`, and a fluent PHP API: `$plan->commands($user)->check($block)->run()`.

### Frontends
- `<plan-block>` web component with no dependencies: optimistic updates, batching, rollback of rejected commands, offline retry queue that survives reloads and works across tabs, drag-and-drop reordering (mouse, touch, pen, keyboard), Shadow DOM option, custom renderers and labels.
- Blade: `@planBlockAssets` (no npm needed) and `<x-plan-block>` with embedded data and a server-rendered fallback.
- Livewire 3.8.3+ and 4.4.8+: `<livewire:plan-block>`, with `plan-block-changed` and `plan-block-refresh` events.
- Vue 3.3+ and React 18/19 wrappers, plus `usePlanStore()` / `usePlanSnapshot()` for custom UIs, and `PlanBlock::initialData()` for Inertia props. (JS package not yet published to npm.)

### Realtime
- Optional live updates through Laravel broadcasting (Reverb, Pusher) and Echo, on a private channel per plan, with automatic catch-up after missed messages.

### Requirements
- PHP 8.3+, Laravel 12 or 13. Tested on SQLite, MySQL 8.4 and PostgreSQL 17.
