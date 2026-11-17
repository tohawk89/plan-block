<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tohawk89\PlanBlock\Models\Plan;
use Workbench\App\Models\User;

// Demo only: signs in the seeded user so the editor can save.
Route::middleware('web')->group(function () {
    Route::get('/', function () {
        Auth::login(User::query()->firstOrFail());

        return view('plan', ['plan' => Plan::query()->firstOrFail()]);
    });

    Route::get('/readonly', function () {
        Auth::login(User::query()->firstOrFail());

        return view('plan', ['plan' => Plan::query()->firstOrFail(), 'readonly' => true]);
    });
});
