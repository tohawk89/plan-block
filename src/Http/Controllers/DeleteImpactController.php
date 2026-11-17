<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\DeleteImpact;

class DeleteImpactController
{
    public function __invoke(Plan $plan, string $block): JsonResponse
    {
        Gate::authorize('plan-block.view', $plan);

        $model = Block::query()->where('plan_id', $plan->getKey())->where('ulid', strtolower($block))->firstOrFail();
        $tree = $plan->tree();

        return response()->json(DeleteImpact::for($tree, $tree->find($model->id)));
    }
}
