<?php

namespace Tohawk89\PlanBlock\Actions;

use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Support\PlanTree;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * Checks every item of a day. Only direct items (primaries), never their
 * backups; for a plan, its main (first) option unless one is already
 * chosen. Excluded items are skipped.
 */
class CheckAll extends Action
{
    public function __construct(protected UncheckBlock $checker) {}

    public function handle(Context $ctx, string $blockId, array $args): void
    {
        [$tree, $day] = $this->day($ctx, $blockId);

        foreach ($tree->children($day) as $child) {
            if ($child->excluded_at !== null) {
                continue;
            }

            $target = $tree->resolve($child);

            if ($target->isLink()) {
                continue;
            }

            $type = $tree->type($target);

            if ($type->checkable()) {
                $this->checker->check($ctx, $target);
            } elseif ($type->groupRule() === GroupRule::One && ! $tree->isDone($target)) {
                $main = $this->mainChoice($tree, $target);

                if ($main) {
                    $this->checker->check($ctx, $main);
                }
            }
        }
    }

    /** First non-excluded, checkable child: a plan's main option. */
    protected function mainChoice(PlanTree $tree, Block $group): ?Block
    {
        foreach ($tree->children($group) as $child) {
            if ($child->excluded_at === null && ! $child->isLink() && $tree->type($child)->checkable()) {
                return $child;
            }
        }

        return null;
    }

    /**
     * @return array{0: PlanTree, 1: Block}
     */
    protected function day(Context $ctx, string $blockId): array
    {
        $block = $this->block($ctx, $blockId);
        $tree = $ctx->tree();
        $day = $tree->resolve($tree->find($block->id));

        if ($tree->type($day)->groupRule() !== GroupRule::All) {
            throw CommandRejected::because('not_a_day', 'check_all and uncheck_all only work on a day.');
        }

        return [$tree, $day];
    }
}
