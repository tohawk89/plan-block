<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tohawk89\PlanBlock\Facades\PlanBlock;
use Tohawk89\PlanBlock\Models\Plan;
use Workbench\App\Models\User;

// Demo only: signs in the seeded user so the editor can save.
Route::middleware('web')->group(function () {
    Route::get('/', function () {
        Auth::login(User::query()->firstOrFail());

        return view('plan', ['plan' => Plan::query()->firstOrFail()]);
    });

    Route::get('/livewire', function () {
        Auth::login(User::query()->firstOrFail());

        return view('livewire-plan', ['plan' => Plan::query()->firstOrFail()]);
    });

    // Vue / React wrappers, fed like an Inertia page. Build the bundles with
    // `npm run demo` in js/ first.
    Route::get('/{framework}', function (string $framework) {
        Auth::login(User::query()->firstOrFail());
        $plan = Plan::query()->firstOrFail();

        return view('framework', ['plan' => $plan, 'framework' => $framework, 'data' => PlanBlock::initialData($plan)]);
    })->whereIn('framework', ['vue', 'react']);

    Route::get('/demo/{file}', fn (string $file) => response()->file(
        dirname(__DIR__, 2)."/js/demo/dist/{$file}",
        ['Content-Type' => 'application/javascript'],
    ))->whereIn('file', ['vue-demo.js', 'react-demo.js']);

    Route::get('/readonly', function () {
        Auth::login(User::query()->firstOrFail());

        return view('plan', ['plan' => Plan::query()->firstOrFail(), 'readonly' => true]);
    });
});
