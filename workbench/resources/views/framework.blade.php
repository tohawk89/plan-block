<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $plan->title }} · {{ ucfirst($framework) }} · Plan Block workbench</title>
    <style>
        body { max-width: 760px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; background: #fafafa; }
        #log { font-size: 12px; color: #656d76; }
    </style>
</head>
<body>
    <h1>{{ $plan->title }} <small style="font-weight:normal;color:#656d76">({{ ucfirst($framework) }})</small></h1>
    {{-- What an Inertia page would receive as a prop. --}}
    <script type="application/json" id="plan-data">@json($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)</script>
    <div id="app"></div>
    <script type="module" src="/demo/{{ $framework }}-demo.js"></script>
</body>
</html>
