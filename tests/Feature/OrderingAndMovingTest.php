<?php

use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Support\Ordering;

function orderOf(string $parent): array
{
    return Block::query()
        ->where('parent_id', block($parent)->id)
        ->orderBy('order_column')
        ->get()
        ->map(fn (Block $b) => $b->payload['name'])
        ->all();
}

it('inserts first, last and between siblings with gapped values', function () {
    $plan = makePlan();
    [$day, $a, $c] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'A'], id: $a)
        ->create('place', $day, $a, ['name' => 'C'], id: $c)
        ->create('place', $day, $a, ['name' => 'B'])
        ->create('place', $day, payload: ['name' => 'Start'])
        ->run();

    expect(orderOf($day))->toBe(['Start', 'A', 'B', 'C'])
        ->and(block($a)->order_column)->toBe(Ordering::GAP);
});

it('rebalances siblings when the gap runs out', function () {
    $plan = makePlan();
    [$day, $a, $b] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'A'], id: $a)
        ->create('place', $day, $a, ['name' => 'B'], id: $b)
        ->run();

    Block::query()->whereKey(block($b)->id)->update(['order_column' => block($a)->order_column + 1]);

    $result = $plan->commands()->create('place', $day, $a, ['name' => 'Mid'])->run();

    expect(orderOf($day))->toBe(['A', 'Mid', 'B'])
        ->and(collect($result->blocks)->pluck('id'))->toContain($b);
});

it('moves a block to another day and updates both days', function () {
    $plan = makePlan();
    [$d1, $d2, $place] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $d1)
        ->create('timeline', after: $d1, id: $d2)
        ->create('place', $d1, payload: ['name' => 'Museum'], id: $place)
        ->check($place)
        ->run();

    $result = $plan->commands()->move($place, $d2)->run();

    expect(block($place)->parent_id)->toBe(block($d2)->id)
        ->and(collect($result->blocks)->pluck('id')->all())->toContain($d1, $d2, $place)
        ->and(state($plan, $d1)['progress']['total'])->toBe(0)
        ->and(state($plan, $d2)['done'])->toBeTrue();
});

it('reorders within the same parent when parent is omitted', function () {
    $plan = makePlan();
    [$day, $a, $b] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'A'], id: $a)
        ->create('place', $day, $a, ['name' => 'B'], id: $b)
        ->reorder($a, $b)
        ->run();

    expect(orderOf($day))->toBe(['B', 'A']);
});

it('bumps the plan version per command', function () {
    $plan = makePlan();

    $result = $plan->commands()->create('timeline')->create('pool')->run();

    expect($result->version)->toBe(2)->and($plan->fresh()->version)->toBe(2);
});
