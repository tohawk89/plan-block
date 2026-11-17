<?php

it('only allows days and pools at the top level', function () {
    $plan = makePlan();

    $plan->commands()->create('timeline')->create('pool')->run();

    expect($plan->blocks()->count())->toBe(2);
    expect(rejected(fn () => $plan->commands()->create('place', payload: ['name' => 'Cafe'])->run())->reason)
        ->toBe('invalid_parent');
});

it('does not allow days inside days', function () {
    $plan = makePlan();
    $day = id();
    $plan->commands()->create('timeline', id: $day)->run();

    expect(rejected(fn () => $plan->commands()->create('timeline', $day)->run())->reason)->toBe('invalid_parent');
});

it('only allows backups inside places, up to three', function () {
    $plan = makePlan();
    [$day, $place] = [id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'Breakfast'], id: $place)
        ->run();

    expect(rejected(fn () => $plan->commands()->create('backup', $day, payload: ['name' => 'X'])->run())->reason)
        ->toBe('invalid_parent');

    $plan->commands()
        ->create('backup', $place, payload: ['name' => 'B1'])
        ->create('backup', $place, payload: ['name' => 'B2'])
        ->create('backup', $place, payload: ['name' => 'B3'])
        ->run();

    expect(rejected(fn () => $plan->commands()->create('backup', $place, payload: ['name' => 'B4'])->run())->reason)
        ->toBe('limit_reached');
});

it('validates payloads against the type fields and drops unknown keys', function () {
    $plan = makePlan();
    [$day, $place] = [id(), id()];
    $plan->commands()->create('timeline', id: $day)->run();

    $error = rejected(fn () => $plan->commands()->create('place', $day, payload: ['time' => '25:99'])->run());
    expect($error->reason)->toBe('invalid_payload')
        ->and($error->errors)->toHaveKeys(['name', 'time']);

    $plan->commands()->create('place', $day, payload: ['name' => 'Cafe', 'hack' => 'x'], id: $place)->run();
    expect(block($place)->payload)->toBe(['name' => 'Cafe']);
});

it('merges partial payload updates', function () {
    $plan = makePlan();
    [$day, $place] = [id(), id()];
    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'Cafe', 'time' => '08:00'], id: $place)
        ->run();

    $plan->commands()->update($place, ['time' => '09:30'])->run();

    expect(block($place)->payload)->toBe(['name' => 'Cafe', 'time' => '09:30']);
});

it('rolls back the whole batch when one command fails', function () {
    $plan = makePlan();
    $day = id();

    $error = rejected(fn () => $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: [])
        ->run());

    expect($error->commandId)->toBe('1')
        ->and($plan->blocks()->count())->toBe(0)
        ->and($plan->fresh()->version)->toBe(0);
});

it('treats a repeated create with the same id as a no-op', function () {
    $plan = makePlan();
    $day = id();

    $plan->commands()->create('timeline', id: $day)->run();
    $plan->commands()->create('timeline', id: $day)->run();

    expect($plan->blocks()->count())->toBe(1);
});
