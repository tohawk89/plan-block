<?php

namespace Tohawk89\PlanBlock\Types;

/**
 * How a block's "done" state is derived.
 */
enum GroupRule: string
{
    /** Done when every countable, non-excluded child is done (day). */
    case All = 'all';

    /** Done when the block itself or any checkable child is checked (place with backups). */
    case Any = 'any';

    /** Progress only, never done (pool). */
    case Count = 'count';

    /** Not a group: done when checked. */
    case None = 'none';
}
