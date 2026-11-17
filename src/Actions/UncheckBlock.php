<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockUnchecked;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;

/**
 * Unchecks a block. On a link, unchecks the source. Idempotent.
 */
class UncheckBlock extends CheckBlock
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $this->uncheck($ctx, $this->target($ctx, $blockId));
    }

    public function uncheck(Context $ctx, Block $target): void
    {
        if ($target->checked_at === null) {
            return;
        }

        $target->forceFill(['checked_at' => null, 'checked_by' => null])->save();

        $ctx->changes->touch($target);
        $ctx->changes->event(new BlockUnchecked($target, $ctx->user));
    }
}
