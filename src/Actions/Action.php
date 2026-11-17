<?php

namespace Tohawk89\PlanBlock\Actions;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Guards\CheckGuard;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Types\BlockType;

/**
 * One command. Every way of changing a plan (HTTP, Livewire, PHP) runs
 * through these classes via the CommandBus.
 */
abstract class Action
{
    /**
     * @param  string  $blockId  the block's ULID (for create/link: the new block's ULID)
     * @param  array<string, mixed>  $args
     */
    abstract public function handle(Context $ctx, string $blockId, array $args): void;

    protected function block(Context $ctx, string $ulid, bool $withTrashed = false): Block
    {
        return Block::query()
            ->when($withTrashed, fn ($query) => $query->withTrashed())
            ->where('plan_id', $ctx->plan->getKey())
            ->where('ulid', strtolower($ulid))
            ->first()
            ?? throw CommandRejected::because('not_found', "Block [{$ulid}] does not exist in this plan.");
    }

    protected function optionalBlock(Context $ctx, array $args, string $key): ?Block
    {
        $value = $args[$key] ?? null;

        if ($value === null) {
            return null;
        }

        if (! is_string($value) || ! Str::isUlid($value)) {
            throw CommandRejected::because('invalid_argument', "Argument [{$key}] must be a block ULID or null.");
        }

        return $this->block($ctx, $value);
    }

    /**
     * Returns true when the block already exists (an idempotent retry).
     */
    protected function alreadyCreated(Context $ctx, string $ulid): bool
    {
        $existing = Block::withTrashed()->where('ulid', strtolower($ulid))->first();

        if ($existing === null) {
            return false;
        }

        if ($existing->plan_id !== $ctx->plan->getKey()) {
            throw CommandRejected::because('duplicate_id', "Block id [{$ulid}] is already used.");
        }

        return true;
    }

    /**
     * Enforces root, parents(), children() and max-children rules.
     */
    protected function assertPlacement(Context $ctx, BlockType $type, ?Block $parent, ?Block $self = null): void
    {
        if ($parent === null) {
            if (! $type->allowedAtRoot()) {
                throw CommandRejected::because('invalid_parent', "A {$type->label()} block cannot be placed at the top level of a plan.");
            }

            return;
        }

        if ($self !== null && $parent->id === $self->id) {
            throw CommandRejected::because('invalid_parent', 'A block cannot be placed inside itself.');
        }

        $parentType = $ctx->types->get($parent->block_type);
        $allowedParents = $type->parents();

        if (! $parentType->children()->permits($type)
            || ($allowedParents !== null && ! in_array($parentType->key(), $allowedParents, true))) {
            throw CommandRejected::because('invalid_parent', "A {$type->label()} block cannot be placed inside a {$parentType->label()} block.");
        }

        $max = $parentType->children()->maxFor($type->key());

        if ($max !== null) {
            $count = Block::query()
                ->where('parent_id', $parent->id)
                ->where('block_type', $type->key())
                ->when($self, fn ($query) => $query->whereKeyNot($self->id))
                ->count();

            if ($count >= $max) {
                throw CommandRejected::because('limit_reached', "A {$parentType->label()} block can hold at most {$max} {$type->label()} blocks.");
            }
        }
    }

    /**
     * Validates declared fields; undeclared keys are dropped.
     *
     * @return array<string, mixed>
     */
    protected function validatePayload(BlockType $type, mixed $payload, bool $partial): array
    {
        if (! is_array($payload)) {
            throw CommandRejected::because('invalid_payload', 'The payload must be an object.');
        }

        $rules = [];

        foreach ($type->resolvedFields() as $field) {
            $rules[$field->name] = $field->toRules($partial);
        }

        try {
            $validated = Validator::make($payload, $rules)->validate();
        } catch (ValidationException $e) {
            throw CommandRejected::because('invalid_payload', $e->getMessage(), $e->errors());
        }

        $names = array_map(fn (Field $field) => $field->name, $type->resolvedFields());

        return array_intersect_key($validated, array_flip($names));
    }

    protected function runGuards(Context $ctx, Block $block): void
    {
        foreach ($ctx->types->get($block->block_type)->checkGuards() as $guard) {
            $instance = app($guard);

            if ($instance instanceof CheckGuard) {
                $instance->check($block, $ctx->user);
            }
        }
    }

    protected function assertNoCycle(Context $ctx, Block $source, Block $parent): void
    {
        $tree = $ctx->tree();
        $from = $tree->find($source->id);
        $target = $tree->find($parent->id);

        if ($from !== null && $target !== null && $tree->reaches($from, $target)) {
            throw CommandRejected::because('cycle', 'This link would make a block contain itself.');
        }
    }
}
