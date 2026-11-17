<?php

namespace Tohawk89\PlanBlock\Support;

use Tohawk89\PlanBlock\Actions\DeleteBlock;
use Tohawk89\PlanBlock\Models\Block;

/**
 * What deleting a block would also remove, for the "this also appears in
 * Day 2 and Day 3" warning. Shared by the HTTP and Livewire adapters.
 */
final class DeleteImpact
{
    /**
     * @return array{block: string, descendants: int, links: array<int, array<string, mixed>>}
     */
    public static function for(PlanTree $tree, Block $root): array
    {
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
                'source' => $item->source_block_id !== null ? $tree->find($item->source_block_id)?->ulid : null,
                'parent' => $parent?->ulid,
                'parent_type' => $parent?->block_type,
                'day' => $parent ? $tree->day($parent) : null,
            ];
        }

        return [
            'block' => $root->ulid,
            'descendants' => count($descendants),
            'links' => $links,
        ];
    }
}
