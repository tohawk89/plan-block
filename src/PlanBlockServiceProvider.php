<?php

namespace Tohawk89\PlanBlock;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\Ordering;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

class PlanBlockServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/plan-block.php', 'plan-block');

        $this->app->singleton(BlockTypeRegistry::class, fn () => BlockTypeRegistry::withBuiltIns());
        $this->app->singleton(Ordering::class);
        $this->app->singleton(CommandBus::class);
        $this->app->singleton(PlanBlockManager::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/plan-block.php' => config_path('plan-block.php'),
            ], 'plan-block-config');
        }

        $this->app->make(BlockTypeRegistry::class)->register(config('plan-block.types', []));

        if (config('plan-block.routes.enabled', true)) {
            Route::group([
                'prefix' => config('plan-block.routes.prefix', 'plan-block'),
                'middleware' => config('plan-block.routes.middleware', ['web', 'auth']),
                'as' => 'plan-block.',
            ], fn () => $this->loadRoutesFrom(__DIR__.'/../routes/plan-block.php'));
        }

        $this->defineDefaultGates();
    }

    /**
     * Fallback gates: only the plan's owner model may view or edit it.
     * Host apps override these with Gate::define() in their own provider.
     */
    protected function defineDefaultGates(): void
    {
        $ownerOnly = fn ($user, Plan $plan) => $plan->owner instanceof Model && $plan->owner->is($user);

        foreach (['plan-block.view', 'plan-block.edit'] as $ability) {
            if (! Gate::has($ability)) {
                Gate::define($ability, $ownerOnly);
            }
        }
    }
}
