<?php

namespace Tohawk89\PlanBlock\Facades;

use Illuminate\Support\Facades\Facade;
use Tohawk89\PlanBlock\PlanBlockManager;

/**
 * @method static void register(string|\Tohawk89\PlanBlock\Types\BlockType|array $types)
 * @method static void extend(string $key, \Closure $callback)
 * @method static \Tohawk89\PlanBlock\Types\BlockTypeRegistry types()
 * @method static array manifest()
 * @method static \Tohawk89\PlanBlock\Commands\PendingCommands commands(\Tohawk89\PlanBlock\Models\Plan $plan, ?\Illuminate\Contracts\Auth\Authenticatable $user = null)
 * @method static \Tohawk89\PlanBlock\Support\PlanTree tree(\Tohawk89\PlanBlock\Models\Plan $plan)
 *
 * @see PlanBlockManager
 */
class PlanBlock extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return PlanBlockManager::class;
    }
}
