<?php

namespace Tohawk89\PlanBlock\Livewire;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Livewire\Attributes\Locked;
use Livewire\Component;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Commands\CommandResult;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\PlanBlockManager;
use Tohawk89\PlanBlock\Support\DeleteImpact;

/**
 * <livewire:plan-block :plan="$plan" />
 *
 * The same editor as <x-plan-block>, but commands go through this
 * component ($wire) straight to the command bus: no API routes needed,
 * Livewire's session and middleware apply, and other components hear
 * about changes through the "plan-block-changed" event.
 *
 * Tell the editor to reload after changing a plan elsewhere in PHP:
 *   $this->dispatch('plan-block-refresh', plan: $plan->ulid);
 *
 * Extend this class and override changed() to react on the server.
 */
class PlanBlockEditor extends Component
{
    #[Locked]
    public string $planId;

    #[Locked]
    public bool $readonly = false;

    #[Locked]
    public bool $shadow = false;

    #[Locked]
    public bool $noStyles = false;

    public function mount(Plan|string $plan, bool $readonly = false, bool $shadow = false, bool $noStyles = false): void
    {
        $model = $this->resolve($plan);
        Gate::authorize('plan-block.view', $model);

        $this->planId = $model->ulid;
        $this->readonly = $readonly;
        $this->shadow = $shadow;
        $this->noStyles = $noStyles;
    }

    /**
     * Called by the JS client with a batch of commands.
     *
     * @param  array<int, array<string, mixed>>  $commands
     */
    public function runCommands(array $commands, ?int $baseVersion = null): array
    {
        $this->skipRender();

        $plan = $this->plan();
        Gate::authorize('plan-block.edit', $plan);

        if ($this->readonly) {
            return ['ok' => false, 'error' => ['reason' => 'forbidden', 'message' => 'This plan is read-only here.']];
        }

        try {
            $result = app(CommandBus::class)->run($plan, $commands, $baseVersion, auth()->user());
        } catch (CommandRejected $e) {
            return ['ok' => false, 'error' => $e->toArray()];
        }

        $this->changed($plan->fresh(), $result);

        return ['ok' => true, ...$result->toArray()];
    }

    public function deleteImpact(string $block): array
    {
        $this->skipRender();

        $plan = $this->plan();
        Gate::authorize('plan-block.view', $plan);

        $model = Block::query()->where('plan_id', $plan->getKey())->where('ulid', strtolower($block))->firstOrFail();
        $tree = $plan->tree();

        return DeleteImpact::for($tree, $tree->find($model->id));
    }

    /**
     * Plan, blocks and manifest, for reloading after an external change.
     */
    public function planData(): array
    {
        $this->skipRender();

        $plan = $this->plan();
        Gate::authorize('plan-block.view', $plan);

        return app(PlanBlockManager::class)->initialData($plan);
    }

    public function render(): View
    {
        return view('plan-block::livewire.plan-block', ['model' => $this->plan()]);
    }

    /**
     * Runs after every successful batch. Override to react on the server.
     */
    protected function changed(Plan $plan, CommandResult $result): void
    {
        $this->dispatch('plan-block-changed', plan: $plan->ulid, version: $result->version);
    }

    protected function plan(): Plan
    {
        return $this->resolve($this->planId);
    }

    private function resolve(Plan|string $plan): Plan
    {
        return $plan instanceof Plan ? $plan : Plan::query()->where('ulid', strtolower($plan))->firstOrFail();
    }
}
