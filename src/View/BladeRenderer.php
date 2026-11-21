<?php

namespace Tohawk89\PlanBlock\View;

use Illuminate\Support\Carbon;
use Illuminate\Support\HtmlString;
use Illuminate\View\ComponentAttributeBag;
use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Palette;
use Tohawk89\PlanBlock\Support\PlanTree;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BuiltIn\SlotType;

/**
 * Renders a plan with Blade views, read-only. Each type's view comes from
 * its renderers()['blade'] (override with PlanBlock::extend()), falling back
 * to plan-block::blocks.generic.
 *
 * Views receive: $block and $target (serialized arrays; $target is the
 * link's source for links), $model (the target Block model), $type
 * (BlockType), $isLink, $children (HtmlString) and $pb (this renderer).
 */
class BladeRenderer
{
    public function __construct(public readonly PlanTree $tree) {}

    public function render(): HtmlString
    {
        $html = '';

        foreach ($this->tree->children(null) as $block) {
            $html .= $this->block($block, '', 0);
        }

        return new HtmlString($html);
    }

    public function block(Block $block, string $scope, int $depth): string
    {
        $target = $this->tree->resolve($block);
        $type = $this->tree->type($target);
        $isLink = $block->isLink();
        $key = $scope.$block->ulid;

        $children = '';
        if ($depth < 20) {
            foreach ($this->tree->children($target) as $child) {
                $children .= $this->block($child, $isLink ? $key.'>' : $scope, $depth + 1);
            }
        }

        $view = $type->resolvedRenderers()['blade'] ?? null;
        if ($view === null || ! view()->exists($view)) {
            $view = 'plan-block::blocks.generic';
        }

        return view($view, [
            'block' => $this->tree->serialize($block),
            'target' => $this->tree->serialize($target),
            'model' => $target,
            'type' => $type,
            'isLink' => $isLink,
            'key' => $key,
            'children' => new HtmlString($children),
            'pb' => $this,
        ])->render();
    }

    /**
     * The same data-pb-* attributes the web component sets.
     */
    public function attributes(array $block, array $target, bool $isLink, string $key, array $extra = []): ComponentAttributeBag
    {
        return new ComponentAttributeBag(array_filter([
            'data-pb-id' => $block['id'],
            'data-pb-key' => $key,
            'data-pb-type' => $target['type'],
            'data-pb-link' => $isLink,
            'data-pb-checked' => $target['checked'],
            'data-pb-done' => $target['done'],
            'data-pb-excluded' => $block['excluded'],
            ...$extra,
        ], fn ($value) => $value !== false && $value !== null));
    }

    /** Value of the type's first text field, or the type label. */
    public function title(array $target, BlockType $type): string
    {
        $payload = (array) $target['payload'];
        $fields = $type->resolvedFields();
        $field = collect($fields)->first(fn (Field $f) => $f->type === 'text') ?? collect($fields)->first(fn (Field $f) => $f->type === 'textarea');
        $value = $field ? ($payload[$field->name] ?? null) : null;

        return is_string($value) && $value !== '' ? $value : $type->label();
    }

    public function payload(array $target, string $key): mixed
    {
        return ((array) $target['payload'])[$key] ?? null;
    }

    public function dayTitle(array $target): string
    {
        $label = $this->payload($target, 'label');
        $title = __('plan-block::ui.day', ['number' => $target['day']['number'] ?? '?']);

        return is_string($label) && $label !== '' ? "{$title} · {$label}" : $title;
    }

    public function date(?string $date): ?string
    {
        return $date ? Carbon::parse($date)->translatedFormat('D j M') : null;
    }

    /** @return array{state: string, done: int, total: int} */
    /** A plan's own title, else its category's label. */
    public function slotTitle(array $target): string
    {
        $title = $this->payload($target, 'title');
        if (is_string($title) && $title !== '') {
            return $title;
        }

        $category = $this->payload($target, 'category');

        return SlotType::CATEGORIES[is_string($category) ? $category : 'other'] ?? SlotType::CATEGORIES['other'];
    }

    /**
     * Position of a place among its plan's options: 0 for the main choice,
     * 1 for the first backup... Null outside a plan.
     */
    public function optionRank(Block $model): ?int
    {
        $parent = $this->tree->parent($model);
        if (! $parent || $parent->block_type !== SlotType::$key) {
            return null;
        }

        $options = array_values(array_filter($this->tree->children($parent), fn (Block $b) => $b->block_type === 'place'));
        $index = array_search($model->id, array_map(fn (Block $b) => $b->id, $options), true);

        return $index === false ? null : $index;
    }

    /**
     * The option ticked in a plan, with its rank.
     *
     * @return array{name: string, rank: int}|null
     */
    public function chosenOption(Block $slot): ?array
    {
        foreach ($this->tree->children($slot) as $child) {
            if ($child->block_type === 'place' && $child->checked_at !== null) {
                $name = $child->payload['name'] ?? '';

                return ['name' => is_string($name) ? $name : '', 'rank' => $this->optionRank($child) ?? 0];
            }
        }

        return null;
    }

    /** Colour name for a day or ideas list (stored, or its default). */
    public function color(array $target): ?string
    {
        return Palette::resolve($target['type'], $this->payload($target, 'color'), $target['day']['number'] ?? null);
    }

    public function progress(array $target): array
    {
        return $target['progress'] ?? ['state' => 'none', 'done' => 0, 'total' => 0];
    }
}
