<?php

use Illuminate\Support\Facades\Route;
use Tohawk89\PlanBlock\Http\Controllers\CommandController;
use Tohawk89\PlanBlock\Http\Controllers\DeleteImpactController;
use Tohawk89\PlanBlock\Http\Controllers\ManifestController;
use Tohawk89\PlanBlock\Http\Controllers\ShowPlanController;

Route::get('manifest', ManifestController::class)->name('manifest');
Route::get('plans/{plan}', ShowPlanController::class)->name('plans.show');
Route::post('plans/{plan}/commands', CommandController::class)->name('plans.commands');
Route::get('plans/{plan}/blocks/{block}/delete-impact', DeleteImpactController::class)->name('blocks.delete-impact');
