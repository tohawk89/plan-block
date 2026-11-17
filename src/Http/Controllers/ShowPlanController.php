<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Models\Plan;

class ShowPlanController
{
    public function __invoke(Plan $plan): JsonResponse
    {
        Gate::authorize('plan-block.view', $plan);

        $tree = $plan->tree();

        return response()->json([
            'plan' => $tree->serializePlan(),
            'blocks' => $tree->serializeAll(),
        ]);
    }
}
