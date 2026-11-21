@php($progress = $pb->progress($target))
@php($label = $pb->payload($target, 'label'))
<section {{ $pb->attributes($block, $target, $isLink, $key, ['data-pb-color' => $pb->color($target)])->class('pb-block pb-group pb-pool') }}>
    <header class="pb-group__header">
        <div class="pb-group__title">
            <span class="pb-title">{{ is_string($label) && $label !== '' ? $label : __('plan-block::ui.pool') }}</span>
            @if ($isLink)
                <span class="pb-badge">↗ {{ __('plan-block::ui.linked') }}</span>
            @endif
        </div>
        <span class="pb-progress">{{ __('plan-block::ui.pool_progress', ['done' => $progress['done'], 'total' => $progress['total']]) }}</span>
    </header>
    <div class="pb-children">{{ $children }}</div>
</section>
