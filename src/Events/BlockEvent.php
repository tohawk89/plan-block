<?php

namespace Tohawk89\PlanBlock\Events;

use Illuminate\Contracts\Auth\Authenticatable;
use Tohawk89\PlanBlock\Models\Block;

/**
 * Base for block events. Dispatched after the batch is committed.
 */
abstract class BlockEvent
{
    public function __construct(
        public readonly Block $block,
        public readonly ?Authenticatable $user = null,
    ) {}
}
