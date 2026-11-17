<?php

namespace Tohawk89\PlanBlock\Events;

use Illuminate\Contracts\Auth\Authenticatable;
use Tohawk89\PlanBlock\Commands\CommandResult;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * A batch of commands was committed. Carries the same change list the
 * client receives, ready for broadcasting.
 */
final class PlanChanged
{
    public function __construct(
        public readonly Plan $plan,
        public readonly CommandResult $result,
        public readonly ?Authenticatable $user = null,
    ) {}
}
