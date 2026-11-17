<?php

namespace Tohawk89\PlanBlock\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Tohawk89\PlanBlock\Commands\PendingCommands;
use Tohawk89\PlanBlock\Facades\PlanBlock;
use Tohawk89\PlanBlock\Support\PlanTree;

/**
 * @property int $id
 * @property string $ulid
 * @property string $title
 * @property \Illuminate\Support\Carbon|null $start_date
 * @property int $version
 */
class Plan extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date',
        'version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (Plan $plan) {
            $plan->ulid = strtolower($plan->ulid ?: (string) Str::ulid());
        });
    }

    public function getTable(): string
    {
        return config('plan-block.tables.plans', 'plan_block_plans');
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(Block::class, 'plan_id');
    }

    public function tree(): PlanTree
    {
        return PlanTree::load($this);
    }

    public function commands(?Authenticatable $user = null): PendingCommands
    {
        return PlanBlock::commands($this, $user);
    }
}
