<?php

namespace Tohawk89\PlanBlock\View;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\HtmlString;
use Illuminate\View\Component;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\PlanBlockManager;
use Tohawk89\PlanBlock\Support\PlanTree;

/**
 * <x-plan-block :plan="$plan" />
 *
 * Outputs the <plan-block> element with the plan's data embedded, so the
 * editor appears without extra requests, plus a read-only server-rendered
 * copy shown until the script loads (and to visitors without JavaScript).
 */
class PlanBlockComponent extends Component
{
    public Plan $model;

    private ?PlanTree $tree = null;

    public function __construct(
        Plan|string $plan,
        public bool $readonly = false,
        public bool $shadow = false,
        public bool $noStyles = false,
        public bool $fallback = true,
        public ?string $endpoint = null,
    ) {
        $this->model = $plan instanceof Plan ? $plan : Plan::query()->where('ulid', strtolower($plan))->firstOrFail();
    }

    public function render(): View
    {
        return view('plan-block::components.plan-block');
    }

    /** Only embed data the current user may see; the script then loads nothing. */
    public function canView(): bool
    {
        return Gate::allows('plan-block.view', $this->model);
    }

    public function endpointUrl(): string
    {
        return $this->endpoint ?? url(config('plan-block.routes.prefix', 'plan-block'));
    }

    /**
     * Same shape as the plan and manifest endpoints, safe inside <script>.
     */
    public function initialJson(): HtmlString
    {
        return new HtmlString(json_encode(app(PlanBlockManager::class)->initialData($this->model, $this->tree()), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    public function fallbackHtml(): HtmlString
    {
        return (new BladeRenderer($this->tree()))->render();
    }

    public function stylesheetUrl(): string
    {
        return app(PlanBlockManager::class)->assetUrl('plan-block.css');
    }

    private function tree(): PlanTree
    {
        return $this->tree ??= $this->model->tree();
    }
}
