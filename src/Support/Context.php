<?php

namespace Tohawk89\PlanBlock\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

/**
 * Shared state for one batch of commands.
 */
final class Context
{
    public function __construct(
        public readonly Plan $plan,
        public readonly ?Authenticatable $user,
        public readonly ChangeSet $changes,
        public readonly BlockTypeRegistry $types,
        public readonly Ordering $ordering,
    ) {}

    /**
     * A fresh tree reflecting every change made so far in this batch.
     */
    public function tree(): PlanTree
    {
        return new PlanTree(
            $this->plan,
            \Tohawk89\PlanBlock\Models\Block::query()->where('plan_id', $this->plan->getKey())->get(),
            $this->types,
        );
    }

    public function userId(): ?string
    {
        $id = $this->user?->getAuthIdentifier();

        return $id === null ? null : (string) $id;
    }
}
