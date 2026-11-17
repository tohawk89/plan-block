<?php

namespace Tohawk89\PlanBlock\Concerns;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * Add to any host model that owns plans, e.g. User or Trip.
 */
trait HasPlans
{
    public function plans(): MorphMany
    {
        return $this->morphMany(Plan::class, 'owner');
    }

    public function createPlan(string $title, DateTimeInterface|string|null $startDate = null): Plan
    {
        return $this->plans()->create([
            'title' => $title,
            'start_date' => $startDate,
        ]);
    }
}
