<?php

namespace Tohawk89\PlanBlock;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Livewire\PlanBlockEditor;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\Ordering;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;
use Tohawk89\PlanBlock\View\PlanBlockComponent;

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
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'plan-block');
        $this->loadTranslationsFrom(__DIR__.'/../lang', 'plan-block');

        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/plan-block.php' => config_path('plan-block.php'),
            ], 'plan-block-config');

            $this->publishes([
                __DIR__.'/../resources/views' => resource_path('views/vendor/plan-block'),
            ], 'plan-block-views');

            $this->publishes([
                __DIR__.'/../lang' => $this->app->langPath('vendor/plan-block'),
            ], 'plan-block-lang');
        }

        $this->app->make(BlockTypeRegistry::class)->register(config('plan-block.types', []));

        $prefix = config('plan-block.routes.prefix', 'plan-block');

        // The JSON API. Livewire-only apps may disable it.
        if (config('plan-block.routes.enabled', true)) {
            Route::group([
                'prefix' => $prefix,
                'middleware' => config('plan-block.routes.middleware', ['web', 'auth']),
                'as' => 'plan-block.',
            ], fn () => $this->loadRoutesFrom(__DIR__.'/../routes/plan-block.php'));
        }

        // Static assets for @planBlockAssets: always available.
        Route::group(['prefix' => $prefix, 'as' => 'plan-block.'], fn () => $this->loadRoutesFrom(__DIR__.'/../routes/assets.php'));

        $this->registerBlade();
        $this->registerLivewire();
        $this->defineDefaultGates();
    }

    /**
     * <livewire:plan-block :plan="$plan" />, only when Livewire is installed
     * and its service provider is loaded.
     */
    protected function registerLivewire(): void
    {
        if (class_exists(\Livewire\LivewireManager::class) && $this->app->bound(\Livewire\LivewireManager::class)) {
            $this->app->make(\Livewire\LivewireManager::class)->component('plan-block', PlanBlockEditor::class);
        }
    }

    protected function registerBlade(): void
    {
        Blade::component('plan-block', PlanBlockComponent::class);

        // @planBlockAssets  or  @planBlockAssets(['nonce' => $nonce, 'css' => true])
        Blade::directive('planBlockAssets', fn (string $expression) => '<?php echo app('.PlanBlockManager::class.'::class)->assets('.($expression ?: '[]').'); ?>');
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
