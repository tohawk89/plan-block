<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockMoved;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Support\Context;

/**
 * args: parent? (omit to stay in the same parent, null for top level), after?
 */
class MoveBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        $block = $this->block($ctx, $blockId);
        $type = $block->type();
        $oldParentId = $block->parent_id;

        $parent = array_key_exists('parent', $args)
            ? $this->optionalBlock($ctx, $args, 'parent')
            : ($block->parent_id !== null ? $block->parent()->first() : null);

        $after = $this->optionalBlock($ctx, $args, 'after');

        if ($after !== null && $after->id === $block->id) {
            throw CommandRejected::because('invalid_after', 'A block cannot be placed after itself.');
        }

        if ($parent !== null && $parent->id !== $oldParentId) {
            $tree = $ctx->tree();

            foreach ($tree->ancestors($tree->find($parent->id)) as $ancestor) {
                if ($ancestor->id === $block->id) {
                    throw CommandRejected::because('invalid_parent', 'A block cannot be moved inside its own children.');
                }
            }
        }

        $this->assertPlacement($ctx, $type, $parent, $block);

        if ($block->isLink() && $parent !== null) {
            $this->assertNoCycle($ctx, $block->source()->firstOrFail(), $parent);
        }

        $block->parent_id = $parent?->id;
        $block->order_column = $ctx->ordering->position($ctx, $parent, $after, $block);

        if (! $block->isDirty(['parent_id', 'order_column'])) {
            return;
        }

        $block->save();

        $ctx->changes->touch($block);
        $ctx->changes->touch($oldParentId);
        $ctx->changes->event(new BlockMoved($block, $ctx->user));
    }
}
