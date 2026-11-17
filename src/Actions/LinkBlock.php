<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Events\BlockCreated;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;

/**
 * Creates a link block. args: source, parent, after?
 */
class LinkBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        if ($this->alreadyCreated($ctx, $blockId)) {
            return;
        }

        $source = $this->optionalBlock($ctx, $args, 'source')
            ?? throw CommandRejected::because('invalid_argument', 'Argument [source] is required.');

        // Never chain links: point at the original block.
        if ($source->source_block_id !== null) {
            $source = $this->block($ctx, Block::query()->findOrFail($source->source_block_id)->ulid);
        }

        $parent = $this->optionalBlock($ctx, $args, 'parent');
        $after = $this->optionalBlock($ctx, $args, 'after');
        $type = $ctx->types->get('link');

        $this->assertPlacement($ctx, $type, $parent);
        $this->assertNoCycle($ctx, $source, $parent);

        $block = new Block([
            'ulid' => strtolower($blockId),
            'plan_id' => $ctx->plan->getKey(),
            'parent_id' => $parent->id,
            'block_type' => 'link',
            'source_block_id' => $source->id,
            'order_column' => $ctx->ordering->position($ctx, $parent, $after),
            'payload' => [],
        ]);
        $block->save();

        $ctx->changes->touch($block);
        $ctx->changes->event(new BlockCreated($block, $ctx->user));
    }
}
