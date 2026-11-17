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
    | Limits
    |--------------------------------------------------------------------------
    */

    'max_commands_per_request' => 100,

];
