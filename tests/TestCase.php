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
        $app['config']->set('database.default', 'testing');
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
    }
}
