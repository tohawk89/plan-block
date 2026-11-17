<?php

it('checking a link checks its source everywhere', function () {
    $plan = makePlan();
    [$pool, $museum, $day2, $link] = [id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Museum'], id: $museum)
        ->create('timeline', after: $pool, id: $day2)
        ->link($museum, $day2, id: $link)
        ->run();

    $result = $plan->commands()->check($link)->run();

    expect(block($museum)->checked_at)->not->toBeNull()
        ->and(block($link)->checked_at)->toBeNull()
        ->and(state($plan, $link)['done'])->toBeTrue()
        ->and(state($plan, $day2)['done'])->toBeTrue();

    // The response carries the source, the link, and both parents.
    expect(collect($result->blocks)->pluck('id')->sort()->values()->all())
        ->toBe(collect([$pool, $museum, $day2, $link])->sort()->values()->all());
});

it('counts several links to the same source once', function () {
    $plan = makePlan();
    [$pool, $museum, $day] = [id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Museum'], id: $museum)
        ->create('timeline', after: $pool, id: $day)
        ->link($museum, $day)
        ->link($museum, $day)
        ->run();

    expect(state($plan, $day)['progress']['total'])->toBe(1);
});

it('never chains links: linking a link stores the original source', function () {
    $plan = makePlan();
    [$pool, $museum, $day, $first, $second] = [id(), id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Museum'], id: $museum)
        ->create('timeline', after: $pool, id: $day)
        ->link($museum, $day, id: $first)
        ->link($first, $day, id: $second)
        ->run();

    expect(block($second)->source_block_id)->toBe(block($museum)->id);
});

it('mirrors a linked group and does not let a linked pool block a day', function () {
    $plan = makePlan();
    [$pool, $museum, $day, $lunch, $link] = [id(), id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Museum'], id: $museum)
        ->create('timeline', after: $pool, id: $day)
        ->create('place', $day, payload: ['name' => 'Lunch'], id: $lunch)
        ->link($pool, $day, $lunch, id: $link)
        ->check($lunch)
        ->run();

    expect(state($plan, $link)['progress'])->toBe(['state' => 'none', 'done' => 0, 'total' => 1])
        ->and(state($plan, $day)['done'])->toBeTrue();
});

it('rejects link cycles', function () {
    $plan = makePlan();
    [$poolA, $poolB] = [id(), id()];

    $plan->commands()
        ->create('pool', id: $poolA)
        ->create('pool', after: $poolA, id: $poolB)
        ->link($poolB, $poolA)
        ->run();

    expect(rejected(fn () => $plan->commands()->link($poolA, $poolB)->run())->reason)->toBe('cycle')
        ->and(rejected(fn () => $plan->commands()->link($poolA, $poolA)->run())->reason)->toBe('cycle');
});

it('only places links in days and pools', function () {
    $plan = makePlan();
    [$day, $place, $other] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'A'], id: $place)
        ->create('place', $day, $place, ['name' => 'B'], id: $other)
        ->run();

    expect(rejected(fn () => $plan->commands()->link($other, $place)->run())->reason)->toBe('invalid_parent');
});
