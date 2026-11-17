<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockRestored;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;

/**
 * Restores a deleted block together with everything deleted in the same batch.
 */
class RestoreBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $block = $this->block($ctx, $blockId, withTrashed: true);

        if (! $block->trashed()) {
            return;
        }

        $items = $block->delete_batch !== null
            ? Block::onlyTrashed()->where('plan_id', $ctx->plan->getKey())->where('delete_batch', $block->delete_batch)->get()
            : collect([$block]);

        $ids = $items->pluck('id')->flip();

        foreach ($items as $item) {
            foreach (['parent_id' => 'parent_deleted', 'source_block_id' => 'source_deleted'] as $column => $reason) {
                $relatedId = $item->{$column};

                if ($relatedId !== null && ! $ids->has($relatedId) && Block::onlyTrashed()->whereKey($relatedId)->exists()) {
                    throw CommandRejected::because($reason, 'Restore the block it belongs to first.');
                }
            }
        }

        foreach ($items as $item) {
            $item->forceFill(['deleted_at' => null, 'delete_batch' => null])->save();
            $ctx->changes->restored($item);
        }

        $ctx->changes->event(new BlockRestored($block, $ctx->user));
    }
}
