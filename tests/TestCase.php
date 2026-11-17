<?php

namespace Tohawk89\PlanBlock\Tests;

use Orchestra\Testbench\Attributes\WithMigration;
use Orchestra\Testbench\TestCase as Orchestra;
use Tohawk89\PlanBlock\PlanBlockServiceProvider;

#[WithMigration]
abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [PlanBlockServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        // SQLite in memory by default; CI sets DB_CONNECTION=mysql|pgsql
        // plus DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD.
        $app['config']->set('database.default', env('DB_CONNECTION', 'testing'));
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
    }
}
