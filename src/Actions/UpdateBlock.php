<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockUpdated;
use Tohawk89\PlanBlock\Support\Context;

/**
 * Partial payload update, last write wins per field. args: payload
 */
class UpdateBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $block = $this->block($ctx, $blockId);
        $changes = $this->validatePayload($block->type(), $args['payload'] ?? [], partial: true);

        // Unknown keys already stored are kept (lenient reading).
        $block->payload = array_merge($block->payload ?? [], $changes);

        if (! $block->isDirty('payload')) {
            return;
        }

        $block->save();

        $ctx->changes->touch($block);
        $ctx->changes->event(new BlockUpdated($block, $ctx->user));
    }
}
