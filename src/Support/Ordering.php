<?php

namespace Tohawk89\PlanBlock\Support;

use Illuminate\Support\Collection;
use LogicException;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;

/**
 * Gapped ordering: inserting between two siblings writes one row. Siblings
 * are renumbered only when the gap runs out.
 */
final class Ordering
{
    public const GAP = 1024;

    /**
     * Order value for a block placed in $parent right after $after
     * (null = first position).
     */
    public function position(Context $ctx, ?Block $parent, ?Block $after, ?Block $moving = null): int
    {
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $siblings = $this->siblings($ctx, $parent, $moving);

            if ($after !== null) {
                $index = $siblings->search(fn (Block $sibling) => $sibling->id === $after->id);

                if ($index === false) {
                    throw CommandRejected::because('invalid_after', 'The "after" block must be a sibling in the target parent.');
                }

                $prev = $siblings[$index]->order_column;
                $next = $siblings->get($index + 1)?->order_column;
            } else {
                $prev = 0;
                $next = $siblings->first()?->order_column;
            }

            if ($next === null) {
                return $prev + self::GAP;
            }

            $mid = intdiv($prev + $next, 2);

            if ($mid > $prev && $mid < $next) {
                return $mid;
            }

            $this->rebalance($ctx, $siblings);
        }

        throw new LogicException('Could not find an order position after rebalancing.');
    }

    /**
     * @return Collection<int, Block>
     */
    private function siblings(Context $ctx, ?Block $parent, ?Block $moving): Collection
    {
        return Block::query()
            ->where('plan_id', $ctx->plan->getKey())
            ->when($parent, fn ($query) => $query->where('parent_id', $parent->id), fn ($query) => $query->whereNull('parent_id'))
            ->when($moving, fn ($query) => $query->whereKeyNot($moving->id))
            ->orderBy('order_column')
            ->orderBy('id')
            ->get()
            ->values();
    }

    /**
     * @param  Collection<int, Block>  $siblings
     */
    private function rebalance(Context $ctx, Collection $siblings): void
    {
        foreach ($siblings as $index => $sibling) {
            $sibling->order_column = ($index + 1) * self::GAP;

            if ($sibling->isDirty('order_column')) {
                $sibling->save();
                $ctx->changes->touch($sibling);
            }
        }
    }
}
