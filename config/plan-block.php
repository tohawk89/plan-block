<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Table names
    |--------------------------------------------------------------------------
    |
    | Prefixed by default so they never clash with a host "plans" table
    | (e.g. subscription plans).
    |
    */

    'tables' => [
        'plans' => 'plan_block_plans',
        'blocks' => 'plan_block_blocks',
    ],

    /*
    |--------------------------------------------------------------------------
    | HTTP routes
    |--------------------------------------------------------------------------
    |
    | The JSON API used by the JS client and web component. Access is checked
    | with the "plan-block.view" and "plan-block.edit" gates, which your app
    | should define (see README). Apps that only use <livewire:plan-block>
    | can disable it. The asset route for @planBlockAssets always stays on.
    |
    */

    'routes' => [
        'enabled' => true,
        'prefix' => 'plan-block',
        'middleware' => ['web', 'auth'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom block types
    |--------------------------------------------------------------------------
    |
    | Extra content block type classes to register, e.g. App\Blocks\HotelBlock.
    | You can also call PlanBlock::register() from a service provider.
    |
    */

    'types' => [],

    /*
    |--------------------------------------------------------------------------
    | Realtime
    |--------------------------------------------------------------------------
    |
    | Broadcast every saved change on a private channel per plan
    | ("plan-block.plans.{ulid}"), so other tabs and devices update live.
    | Needs Laravel broadcasting set up (e.g. Reverb or Pusher) and Laravel
    | Echo on the page. Who may listen follows the "plan-block.view" gate.
    |
    | connection: queue connection for the broadcast job. null uses your
    | default queue (needs a worker); "sync" sends during the request.
    |
    | max_payload: larger messages are sent without blocks and clients
    | reload instead (Pusher limits messages to 10 KB).
    |
    */

    'broadcasting' => [
        'enabled' => env('PLAN_BLOCK_BROADCASTING', false),
        'connection' => env('PLAN_BLOCK_BROADCAST_CONNECTION'),
        'max_payload' => 8000,
    ],

    /*
    |--------------------------------------------------------------------------
    | Limits
    |--------------------------------------------------------------------------
    */

    'max_commands_per_request' => 100,

];
