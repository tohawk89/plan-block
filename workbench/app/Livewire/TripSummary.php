<?php

namespace Workbench\App\Livewire;

use Livewire\Attributes\On;
use Livewire\Component;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * Demo of the Livewire event bridge: re-renders when the editor saves
 * (plan-block-changed) and changes the plan from PHP, then tells the editor
 * to reload (plan-block-refresh).
 */
class TripSummary extends Component
{
    public string $planId;

    #[On('plan-block-changed')]
    public function onPlanChanged(): void
    {
        // Re-render with fresh numbers.
    }

    public function checkEveryDay(): void
    {
        $plan = Plan::query()->where('ulid', $this->planId)->firstOrFail();
        $commands = $plan->commands(auth()->user());

        foreach ($plan->tree()->children(null) as $block) {
            if ($block->block_type === 'timeline') {
                $commands->checkAll($block);
            }
        }

        $commands->run();
        $this->dispatch('plan-block-refresh', plan: $this->planId);
    }

    public function render(): string
    {
        $plan = Plan::query()->where('ulid', $this->planId)->firstOrFail();
        $tree = $plan->tree();
        $days = array_filter($tree->children(null), fn ($b) => $b->block_type === 'timeline');
        $done = count(array_filter($days, fn ($day) => $tree->isDone($day)));

        return <<<BLADE
            <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;padding:.75rem;border:1px solid #d0d7de;border-radius:8px;background:#fff">
                <strong data-summary>{$done} of {$this->count($days)} days done · version {$plan->version}</strong>
                <button type="button" wire:click="checkEveryDay">Check every day (from PHP)</button>
            </div>
            BLADE;
    }

    private function count(array $items): int
    {
        return count($items);
    }
}
