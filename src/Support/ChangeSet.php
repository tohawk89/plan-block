<?php

namespace Tohawk89\PlanBlock\Support;

use Tohawk89\PlanBlock\Models\Block;

/**
 * Collects what a batch of commands touched, deleted and should announce.
 */
final class ChangeSet
{
    /** @var array<int, true> */
    private array $touched = [];

    /** @var array<string, true> */
    private array $deleted = [];

    /** @var array<int, object> */
    private array $events = [];

    public function touch(Block|int|null $block): void
    {
        if ($block === null) {
            return;
        }

        $this->touched[$block instanceof Block ? $block->id : $block] = true;
    }

    public function deleted(Block $block): void
    {
        $this->deleted[$block->ulid] = true;
    }

    public function restored(Block $block): void
    {
        unset($this->deleted[$block->ulid]);
        $this->touch($block);
    }

    public function event(object $event): void
    {
        $this->events[] = $event;
    }

    /**
     * @return array<int, int>
     */
    public function touchedIds(): array
    {
        return array_keys($this->touched);
    }

    /**
     * @return array<int, string>
     */
    public function deletedIds(): array
    {
        return array_keys($this->deleted);
    }

    /**
     * @return array<int, object>
     */
    public function events(): array
    {
        return $this->events;
    }
}
