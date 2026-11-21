@php($progress = $pb->progress($target))
@php($date = $pb->date($target['day']['date'] ?? null))
<section {{ $pb->attributes($block, $target, $isLink, $key, ['data-pb-color' => $pb->color($target)])->class('pb-block pb-group pb-day') }}>
    <header class="pb-group__header">
        <input type="checkbox" class="pb-check" disabled @checked($progress['state'] === 'all') aria-label="{{ __('plan-block::ui.check_all') }}">
        <div class="pb-group__title">
            <span class="pb-title">{{ $pb->dayTitle($target) }}</span>
            @if ($date)
                <span class="pb-muted">{{ $date }}</span>
            @endif
            @if ($isLink)
                <span class="pb-badge">↗ {{ __('plan-block::ui.linked') }}</span>
            @endif
        </div>
        <span class="pb-progress" data-state="{{ $progress['state'] }}">{{ __('plan-block::ui.progress', ['done' => $progress['done'], 'total' => $progress['total']]) }}</span>
    </header>
    <div class="pb-children">{{ $children }}</div>
</section>
