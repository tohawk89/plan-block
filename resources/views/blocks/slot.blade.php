@php($category = $pb->payload($target, 'category'))
@php($title = $pb->slotTitle($target))
@php($time = $pb->payload($target, 'time'))
@php($notes = $pb->payload($target, 'notes'))
@php($chosen = $pb->chosenOption($model))
<div {{ $pb->attributes($block, $target, $isLink, $key, ['data-pb-category' => is_string($category) ? $category : 'other'])->class('pb-block pb-item pb-slot') }}>
    <div class="pb-item__row">
        <span class="pb-slot__icon" aria-hidden="true"></span>
        <div class="pb-item__main">
            <div class="pb-slot__heading">
                <span class="pb-title">{{ $title }}</span>
                @if ($time)
                    <span class="pb-muted">{{ $time }}</span>
                @endif
                @if ($isLink)
                    <span class="pb-badge">↗ {{ __('plan-block::ui.linked') }}</span>
                @endif
            </div>
            @if ($chosen)
                <div class="pb-slot__summary pb-slot__summary--done">✓ {{ __('plan-block::ui.went_to', ['name' => $chosen['name']]) }}
                    @if ($chosen['rank'] > 0)
                        <span class="pb-badge pb-badge--backup">{{ __('plan-block::ui.backup', ['number' => $chosen['rank']]) }}</span>
                    @endif
                </div>
            @endif
            @if ($notes)
                <div class="pb-notes">{{ $notes }}</div>
            @endif
        </div>
    </div>
    <div class="pb-children">{{ $children }}</div>
</div>
