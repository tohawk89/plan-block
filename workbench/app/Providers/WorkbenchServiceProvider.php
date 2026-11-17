<?php

namespace Workbench\App\Providers;

use Illuminate\Support\ServiceProvider;
use Livewire\Livewire;
use Workbench\App\Livewire\TripSummary;

class WorkbenchServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Livewire::component('trip-summary', TripSummary::class);
    }
}
