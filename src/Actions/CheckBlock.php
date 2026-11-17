<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockChecked;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * Checks a block. On a link, checks the source. Idempotent.
 */
class CheckBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $this->check($ctx, $this->target($ctx, $blockId));
    }

    /**
     * The block a check applies to: the link's source, or the block itself.
     */
    protected function target(Context $ctx, string $blockId): Block
    {
        $block = $this->block($ctx, $blockId);
        $tree = $ctx->tree();
        $target = $tree->resolve($tree->find($block->id));

        if ($target->isLink()) {
            throw CommandRejected::because('broken_link', 'The linked block no longer exists.');
        }

        $type = $ctx->types->get($target->block_type);

        if (! $type->checkable()) {
            throw CommandRejected::because('not_checkable', $type->groupRule() === GroupRule::All
                ? 'Use check_all / uncheck_all for a whole day.'
                : "A {$type->label()} block cannot be checked.");
        }

        return $target;
    }

    public function check(Context $ctx, Block $target): void
    {
        if ($target->checked_at !== null) {
            return;
        }

        $this->runGuards($ctx, $target);

        $target->forceFill(['checked_at' => now(), 'checked_by' => $ctx->userId()])->save();

        $ctx->changes->touch($target);
        $ctx->changes->event(new BlockChecked($target, $ctx->user));
    }
}
