@php($title = $pb->title($target, $type))
@php($time = $pb->payload($target, 'time'))
@php($mapUrl = $pb->payload($target, 'maps_url'))
@php($notes = $pb->payload($target, 'notes'))
@php($rank = $pb->optionRank($model))
<div {{ $pb->attributes($block, $target, $isLink, $key)->class('pb-block pb-item') }}>
    <div class="pb-item__row">
        <input type="checkbox" class="pb-check" disabled @checked($target['checked']) aria-label="{{ __('plan-block::ui.mark_done', ['name' => $title]) }}">
        <div class="pb-item__main">
            @if ($rank === 0)
                <span class="pb-badge pb-badge--main">★ {{ __('plan-block::ui.main') }}</span>
            @elseif ($rank !== null)
                <span class="pb-badge pb-badge--backup">{{ __('plan-block::ui.backup', ['number' => $rank]) }}</span>
            @endif
            <span class="pb-title">{{ $title }}</span>
            @if ($isLink)
                <span class="pb-badge">↗ {{ __('plan-block::ui.linked') }}</span>
            @endif
            @if ($target['done'] && ! $target['checked'])
                <span class="pb-badge pb-badge--done">{{ __('plan-block::ui.done_via_backup') }}</span>
            @endif
            @if ($time || $mapUrl)
                <div class="pb-meta">
                    @if ($time)
                        <span>{{ $time }}</span>
                    @endif
                    @if ($mapUrl)
                        <a href="{{ $mapUrl }}" target="_blank" rel="noopener noreferrer">{{ __('plan-block::ui.map') }}</a>
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
