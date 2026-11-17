<?php

namespace Tohawk89\PlanBlock\Tests;

use Livewire\LivewireServiceProvider;
use Orchestra\Testbench\Attributes\WithMigration;
use Orchestra\Testbench\TestCase as Orchestra;
use Tohawk89\PlanBlock\PlanBlockServiceProvider;

#[WithMigration]
abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        // Livewire first, as package discovery would load it in a real app.
        return [LivewireServiceProvider::class, PlanBlockServiceProvider::class];
    }

    /**
     * Pin everything tests depend on, so testbench.yaml (the demo app's
     * settings) never leaks in. In particular the tests must never touch
     * the demo database.
     */
    protected function defineEnvironment($app): void
    {
        // SQLite in memory by default; CI sets PLAN_BLOCK_TEST_DB=mysql|pgsql
        // plus DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD.
        $app['config']->set('database.default', getenv('PLAN_BLOCK_TEST_DB') ?: 'testing');
        $app['config']->set('app.url', 'http://localhost');
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
        $app['config']->set('session.driver', 'array');
        // The demo app broadcasts through Reverb; tests never connect anywhere.
        $app['config']->set('broadcasting.default', 'null');
        $app['config']->set('plan-block.broadcasting.enabled', false);
        $app['config']->set('plan-block.broadcasting.connection', null);
    }
}
