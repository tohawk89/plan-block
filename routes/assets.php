<?php

use Illuminate\Support\Facades\Route;
use Tohawk89\PlanBlock\Http\Controllers\AssetController;

// Public, no session or auth: static files only.

Route::get('assets/{file}', AssetController::class)
    ->where('file', 'plan-block\.(js|css)')
    ->name('assets');
