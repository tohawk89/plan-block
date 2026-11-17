<?php

namespace Tohawk89\PlanBlock\Support;

use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * A whole plan loaded in one query and held in memory. Resolves links,
 * derives done/progress and serializes blocks to the JSON contract.
 */
final class PlanTree
{
    /** @var array<int, Block> */
    private array $byId = [];

    /** @var array<int, array<int, Block>> keyed by parent id, 0 = root */
    private array $children = [];

    /** @var array<int, array<int, Block>> keyed by source id */
    private array $links = [];

    /** @var array<int, int> timeline id => day number */
    private array $dayNumbers = [];

    /** @var array<int, bool> */
    private array $doneMemo = [];

    /**
     * @param  iterable<Block>  $blocks
     */
    public function __construct(
        public readonly Plan $plan,
        iterable $blocks,
        private readonly BlockTypeRegistry $types,
    ) {
        foreach ($blocks as $block) {
            $this->byId[$block->id] = $block;
        }

        foreach ($this->byId as $block) {
            $this->children[$block->parent_id ?? 0][] = $block;

            if ($block->source_block_id !== null) {
                $this->links[$block->source_block_id][] = $block;
            }
        }

        foreach ($this->children as &$siblings) {
            usort($siblings, fn (Block $a, Block $b) => [$a->order_column, $a->id] <=> [$b->order_column, $b->id]);
        }
        unset($siblings);

        $day = 0;
        foreach ($this->children[0] ?? [] as $block) {
            if ($block->block_type === 'timeline') {
                $this->dayNumbers[$block->id] = ++$day;
            }
        }
    }

    public static function load(Plan $plan): self
    {
        return new self(
            $plan,
            Block::query()->where('plan_id', $plan->getKey())->get(),
            app(BlockTypeRegistry::class),
        );
    }

    public function find(int $id): ?Block
    {
        return $this->byId[$id] ?? null;
    }

    /**
     * @return array<int, Block>
     */
    public function all(): array
    {
        return array_values($this->byId);
    }

    /**
     * Ordered children; null for the plan's top level.
     *
     * @return array<int, Block>
     */
    public function children(?Block $block): array
    {
        return $this->children[$block?->id ?? 0] ?? [];
    }

    public function parent(Block $block): ?Block
    {
        return $block->parent_id !== null ? $this->find($block->parent_id) : null;
    }

    /**
     * @return array<int, Block> nearest first
     */
    public function ancestors(Block $block): array
    {
        $ancestors = [];
        $seen = [$block->id => true];

        while (($block = $this->parent($block)) && ! isset($seen[$block->id])) {
            $seen[$block->id] = true;
            $ancestors[] = $block;
        }

        return $ancestors;
    }

    /**
     * All blocks nested under a block (not following links).
     *
     * @return array<int, Block>
     */
    public function descendants(Block $block): array
    {
        $result = [];

        foreach ($this->children($block) as $child) {
            $result[] = $child;
            array_push($result, ...$this->descendants($child));
        }

        return $result;
    }

    /**
     * @return array<int, Block>
     */
    public function linksTo(Block $block): array
    {
        return $this->links[$block->id] ?? [];
    }

    public function type(Block $block): BlockType
    {
        return $this->types->get($block->block_type);
    }

    /**
     * A link's source, or the block itself.
     */
    public function resolve(Block $block): Block
    {
        if ($block->source_block_id !== null && isset($this->byId[$block->source_block_id])) {
            return $this->byId[$block->source_block_id];
        }

        return $block;
    }

    /**
     * Whether $target can be reached from $from by walking children and
     * following links. Used to stop link cycles.
     */
    public function reaches(Block $from, Block $target): bool
    {
        $stack = [$from];
        $seen = [];

        while ($stack) {
            $block = array_pop($stack);

            if ($block->id === $target->id) {
                return true;
            }

            if (isset($seen[$block->id])) {
                continue;
            }

            $seen[$block->id] = true;

            if ($block->source_block_id !== null && isset($this->byId[$block->source_block_id])) {
                $stack[] = $this->byId[$block->source_block_id];
            }

            array_push($stack, ...$this->children($block));
        }

        return false;
    }

    public function isDone(Block $block): bool
    {
        return $this->doneMemo[$block->id] ??= $this->computeDone($block, []);
    }

    /**
     * Progress of a group (day or pool), or of a link to one.
     *
     * @return array{state: string, done: int, total: int}|null
     */
    public function progress(Block $block): ?array
    {
        $target = $this->resolve($block);

        return in_array($this->type($target)->groupRule(), [GroupRule::All, GroupRule::Count], true)
            ? $this->computeProgress($target, [$block->id => true])
            : null;
    }

    /**
     * @return array{number: int, date: string|null}|null
     */
    public function day(Block $block): ?array
    {
        if (! isset($this->dayNumbers[$block->id])) {
            return null;
        }

        $number = $this->dayNumbers[$block->id];

        return [
            'number' => $number,
            'date' => $this->plan->start_date?->copy()->addDays($number - 1)->toDateString(),
        ];
    }

    public function serializePlan(): array
    {
        return [
            'id' => $this->plan->ulid,
            'title' => $this->plan->title,
            'start_date' => $this->plan->start_date?->toDateString(),
            'version' => (int) $this->plan->version,
        ];
    }

    public function serialize(Block $block): array
    {
        $type = $this->type($block);
        $payload = $block->payload ?? [];

        foreach ($type->resolvedFields() as $field) {
            if (! array_key_exists($field->name, $payload) && $field->getDefault() !== null) {
                $payload[$field->name] = $field->getDefault();
            }
        }

        return [
            'id' => $block->ulid,
            'type' => $block->block_type,
            'parent' => $this->parent($block)?->ulid,
            'order' => (int) $block->order_column,
            'source' => $block->source_block_id !== null ? $this->find($block->source_block_id)?->ulid : null,
            'attachable' => $block->attachable_type !== null
                ? ['type' => $block->attachable_type, 'id' => $block->attachable_id]
                : null,
            'payload' => $payload === [] ? new \stdClass : $payload,
            'checked' => $block->checked_at !== null,
            'checked_at' => $block->checked_at?->toIso8601String(),
            'checked_by' => $block->checked_by,
            'excluded' => $block->excluded_at !== null,
            'done' => $this->isDone($block),
            'progress' => $this->progress($block),
            'day' => $this->day($block),
        ];
    }

    /**
     * @param  iterable<Block>  $blocks
     * @return array<int, array<string, mixed>>
     */
    public function serializeMany(iterable $blocks): array
    {
        $list = [];

        foreach ($blocks as $block) {
            $list[] = $block;
        }

        usort($list, fn (Block $a, Block $b) => $a->id <=> $b->id);

        return array_map(fn (Block $block) => $this->serialize($block), $list);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function serializeAll(): array
    {
        return $this->serializeMany($this->byId);
    }

    /**
     * @param  array<int, true>  $visiting  guards against cycles
     */
    private function computeDone(Block $block, array $visiting): bool
    {
        if (isset($visiting[$block->id])) {
            return false;
        }

        $visiting[$block->id] = true;
        $target = $this->resolve($block);

        if ($target->id !== $block->id) {
            return $this->computeDone($target, $visiting);
        }

        if ($block->block_type === 'link') {
            return false; // source is gone
        }

        $type = $this->type($block);

        return match ($type->groupRule()) {
            GroupRule::All => (function () use ($block, $visiting) {
                $progress = $this->computeProgress($block, $visiting);

                return $progress['total'] > 0 && $progress['done'] === $progress['total'];
            })(),
            GroupRule::Count => false,
            GroupRule::Any => $block->checked_at !== null || $this->anyChildDone($block, $visiting),
            GroupRule::None => $type->checkable() && $block->checked_at !== null,
        };
    }

    /**
     * @param  array<int, true>  $visiting
     */
    private function anyChildDone(Block $block, array $visiting): bool
    {
        foreach ($this->children($block) as $child) {
            if ($child->excluded_at !== null) {
                continue;
            }

            if ($this->type($this->resolve($child))->checkable() && $this->computeDone($child, $visiting)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Counts countable, non-excluded children. Several links to the same
     * source count once.
     *
     * @param  array<int, true>  $visiting
     * @return array{state: string, done: int, total: int}
     */
    private function computeProgress(Block $group, array $visiting): array
    {
        $visiting[$group->id] = true;
        $seen = [];
        $done = 0;
        $total = 0;

        foreach ($this->children($group) as $child) {
            if ($child->excluded_at !== null) {
                continue;
            }

            $target = $this->resolve($child);

            if ($target->block_type === 'link' || ! $this->type($target)->countable() || isset($seen[$target->id])) {
                continue;
            }

            $seen[$target->id] = true;
            $total++;

            if ($this->computeDone($target, $visiting)) {
                $done++;
            }
        }

        return [
            'state' => $done === 0 ? 'none' : ($done === $total ? 'all' : 'some'),
            'done' => $done,
            'total' => $total,
        ];
    }
}
