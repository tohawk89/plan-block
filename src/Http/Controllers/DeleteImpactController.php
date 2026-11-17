<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Actions\DeleteBlock;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * What deleting a block would also remove, for the "this also appears
 * in Day 2 and Day 3" warning.
 */
class DeleteImpactController
{
    public function __invoke(Plan $plan, string $block): JsonResponse
    {
        Gate::authorize('plan-block.view', $plan);

        $model = Block::query()->where('plan_id', $plan->getKey())->where('ulid', strtolower($block))->firstOrFail();
        $tree = $plan->tree();
        $root = $tree->find($model->id);
        $descendants = $tree->descendants($root);
        $inside = array_flip(array_map(fn (Block $b) => $b->id, [$root, ...$descendants]));

        $links = [];

        foreach (DeleteBlock::affected($tree, $root) as $item) {
            if (isset($inside[$item->id])) {
                continue;
            }

            $parent = $tree->parent($item);

            $links[] = [
                'id' => $item->ulid,
                'source' => $tree->find($item->source_block_id)?->ulid,
                'parent' => $parent?->ulid,
                'parent_type' => $parent?->block_type,
                'day' => $parent ? $tree->day($parent) : null,
            ];
        }

        return response()->json([
            'block' => $root->ulid,
            'descendants' => count($descendants),
            'links' => $links,
        ]);
    }
}
