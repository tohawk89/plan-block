<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Support\Context;

/**
 * Unchecks every item of a day, including their backups. Excluded items
 * are skipped.
 */
class UncheckAll extends CheckAll
{
    public function handle(Context $ctx, string $blockId, array $args): void
    {
        [$tree, $day] = $this->day($ctx, $blockId);

        foreach ($tree->children($day) as $child) {
            if ($child->excluded_at !== null) {
                continue;
            }

            $target = $tree->resolve($child);

            foreach ([$target, ...$tree->descendants($target)] as $block) {
                if (! $block->isLink() && $tree->type($block)->checkable()) {
                    $this->checker->uncheck($ctx, $block);
                }
            }
        }
    }
}
