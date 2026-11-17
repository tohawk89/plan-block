<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $plan->title }} · Livewire · Plan Block workbench</title>
    @planBlockAssets
    <style>
        body { max-width: 760px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; background: #fafafa; }
    </style>
</head>
<body>
    <h1>{{ $plan->title }} <small style="font-weight:normal;color:#656d76">(Livewire)</small></h1>
    <livewire:trip-summary :plan-id="$plan->ulid" />
    <livewire:plan-block :plan="$plan" />
</body>
</html>
