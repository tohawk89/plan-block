<?php

namespace Tohawk89\PlanBlock\Actions;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Tohawk89\PlanBlock\Events\BlockCreated;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Exceptions\UnknownBlockType;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Types\BlockType;

/**
 * args: type, parent?, after?, payload?, attachable? {type, id}
 */
class CreateBlock extends Action
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        if ($this->alreadyCreated($ctx, $blockId)) {
            return;
        }

        $key = $args['type'] ?? null;

        if (! is_string($key)) {
            throw CommandRejected::because('invalid_argument', 'Argument [type] is required.');
        }

        if ($key === 'link') {
            throw CommandRejected::because('invalid_argument', 'Use the "link" command to create links.');
        }

        try {
            $type = $ctx->types->get($key);
        } catch (UnknownBlockType $e) {
            throw CommandRejected::because('unknown_type', $e->getMessage());
        }

        $parent = $this->optionalBlock($ctx, $args, 'parent');
        $after = $this->optionalBlock($ctx, $args, 'after');

        $this->assertPlacement($ctx, $type, $parent);
        $payload = $this->validatePayload($type, $args['payload'] ?? [], partial: false);

        $block = new Block([
            'ulid' => strtolower($blockId),
            'plan_id' => $ctx->plan->getKey(),
            'parent_id' => $parent?->id,
            'block_type' => $key,
            'order_column' => $ctx->ordering->position($ctx, $parent, $after),
            'payload' => $payload,
            ...$this->attachable($type, $args['attachable'] ?? null),
        ]);
        $block->save();

        $ctx->changes->touch($block);
        $ctx->changes->event(new BlockCreated($block, $ctx->user));
    }

    /**
     * @return array{attachable_type?: string, attachable_id?: string}
     */
    protected function attachable(BlockType $type, mixed $attachable): array
    {
        if ($attachable === null) {
            return [];
        }

        if (! is_array($attachable) || ! isset($attachable['type'], $attachable['id'])) {
            throw CommandRejected::because('invalid_attachable', 'Argument [attachable] must be {type, id}.');
        }

        $class = Relation::getMorphedModel($attachable['type']) ?? $attachable['type'];

        if (! in_array($class, $type->attachable(), true) || ! is_subclass_of($class, Model::class)) {
            throw CommandRejected::because('invalid_attachable', "A {$type->label()} block cannot attach to [{$attachable['type']}].");
        }

        if (! $class::query()->whereKey($attachable['id'])->exists()) {
            throw CommandRejected::because('invalid_attachable', 'The attached record does not exist.');
        }

        return [
            'attachable_type' => (new $class)->getMorphClass(),
            'attachable_id' => (string) $attachable['id'],
        ];
    }
}
