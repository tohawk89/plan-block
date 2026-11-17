<plan-block {{ $attributes->merge(array_filter([
    'plan' => $model->ulid,
    'endpoint' => $endpointUrl(),
    'readonly' => $readonly,
    'shadow' => $shadow,
    'no-styles' => $noStyles,
])) }}>
@if ($canView())
    <script type="application/json" data-pb-initial>{{ $initialJson() }}</script>
    @if ($fallback)
        {{-- Read-only copy shown until the script loads, and without JavaScript. --}}
        <div class="pb-root" data-pb-fallback>
            @unless ($noStyles)
                <link rel="stylesheet" href="{{ $stylesheetUrl() }}">
            @endunless
            <div class="pb-list">{{ $fallbackHtml() }}</div>
        </div>
    @endif
@endif
</plan-block>
