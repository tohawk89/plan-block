<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $plan->title }} · Plan Block workbench</title>
    @if (config('plan-block.broadcasting.enabled'))
        {{-- Laravel Echo for live updates; must run before the editor script. --}}
        @php
            $echoConfig = [
                'key' => config('broadcasting.connections.reverb.key'),
                'host' => config('broadcasting.connections.reverb.options.host'),
                'port' => (int) config('broadcasting.connections.reverb.options.port'),
            ];
        @endphp
        <script type="application/json" id="echo-config">@json($echoConfig)</script>
        <script type="module" src="/demo/echo.js"></script>
    @endif
    @planBlockAssets
    <style>
        body { max-width: 760px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; background: #fafafa; }
    </style>
</head>
<body>
    <h1>{{ $plan->title }}</h1>
    <x-plan-block :plan="$plan" :readonly="$readonly ?? false" />
</body>
</html>
