<?php

namespace Tohawk89\PlanBlock\Actions;

use Illuminate\Support\Str;
use Tohawk89\PlanBlock\Events\BlockDeleted;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Support\PlanTree;

/**
 * Soft-deletes a block, everything inside it, and every link pointing to
 * any of them. All share one delete batch so "restore" brings them back
 * together. Deleting a link removes only that link.
 */
class DeleteBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $block = $this->block($ctx, $blockId, withTrashed: true);

        // Already deleted: a retried request whose first response was lost.
        if ($block->trashed()) {
            return;
        }

        $tree = $ctx->tree();
        $affected = self::affected($tree, $tree->find($block->id));
        $batch = strtolower((string) Str::ulid());
        $now = now();

        foreach ($affected as $item) {
            $item->forceFill(['delete_batch' => $batch, 'deleted_at' => $now])->save();
            $ctx->changes->deleted($item);

            if ($item->parent_id !== null && ! isset($affected[$item->parent_id])) {
                $ctx->changes->touch($item->parent_id);
            }
        }

        $ctx->changes->event(new BlockDeleted($block, $ctx->user));
    }

    /**
     * The block, its descendants, and links to any of them.
     *
     * @return array<int, Block> keyed by id
     */
    public static function affected(PlanTree $tree, Block $block): array
    {
        $affected = [];

        foreach ([$block, ...$tree->descendants($block)] as $item) {
            $affected[$item->id] = $item;
        }

        foreach ($affected as $item) {
            foreach ($tree->linksTo($item) as $link) {
                $affected[$link->id] ??= $link;
            }
        }

        return $affected;
    }
}
