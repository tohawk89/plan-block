<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockExcluded;
use Tohawk89\PlanBlock\Events\BlockIncluded;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Support\Context;

/**
 * Excludes a block from progress. Applies to the block itself (a link's own
 * flag, not its source), so it can be dropped on one day only.
 */
class ExcludeBlock extends Action
{
    protected bool $exclude = true;

    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $block = $this->block($ctx, $blockId);

        if ($block->type()->allowedAtRoot()) {
            throw CommandRejected::because('not_excludable', 'Days and pools cannot be excluded.');
        }

        if (($block->excluded_at !== null) === $this->exclude) {
            return;
        }

        $block->forceFill(['excluded_at' => $this->exclude ? now() : null])->save();

        $ctx->changes->touch($block);
        $ctx->changes->event($this->exclude
            ? new BlockExcluded($block, $ctx->user)
            : new BlockIncluded($block, $ctx->user));
    }
}
