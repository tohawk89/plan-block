{{-- Fallback for custom types without their own Blade view. --}}
@php($title = $pb->title($target, $type))
<div {{ $pb->attributes($block, $target, $isLink, $key)->class('pb-block pb-item') }}>
    <div class="pb-item__row">
        @if ($type->checkable())
            <input type="checkbox" class="pb-check" disabled @checked($target['checked']) aria-label="{{ __('plan-block::ui.mark_done', ['name' => $title]) }}">
        @endif
        <div class="pb-item__main">
            <span class="pb-title">{{ $title }}</span>
            @if ($isLink)
                <span class="pb-badge">↗ {{ __('plan-block::ui.linked') }}</span>
            @endif
        </div>
    </div>
    <div class="pb-children">{{ $children }}</div>
</div>
