<?php

namespace Tohawk89\PlanBlock\Guards;

use Illuminate\Contracts\Auth\Authenticatable;
use Tohawk89\PlanBlock\Models\Block;

/**
 * Runs before a block is checked. Throw CommandRejected to stop it.
 */
interface CheckGuard
{
    /**
     * @throws \Tohawk89\PlanBlock\Exceptions\CommandRejected
     */
    public function check(Block $block, ?Authenticatable $user): void;
}
