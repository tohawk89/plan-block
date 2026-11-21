<?php

use Illuminate\Support\Facades\Blade;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * Day 1 with a Breakfast plan: Kedai A (main), Kedai B and Kedai C (backups).
 *
 * @return array{day: string, slot: string, a: string, b: string, c: string}
 */
function breakfastPlan(Plan $plan): array
{
    $ids = ['day' => id(), 'slot' => id(), 'a' => id(), 'b' => id(), 'c' => id()];

    $plan->commands()
        ->create('timeline', id: $ids['day'])
        ->create('slot', $ids['day'], payload: ['category' => 'breakfast', 'time' => '08:00'], id: $ids['slot'])
        ->create('place', $ids['slot'], payload: ['name' => 'Kedai A'], id: $ids['a'])
        ->create('place', $ids['slot'], $ids['a'], ['name' => 'Kedai B'], id: $ids['b'])
        ->create('place', $ids['slot'], $ids['b'], ['name' => 'Kedai C'], id: $ids['c'])
        ->run();

    return $ids;
}

it('counts a plan as one item, done once an option is ticked', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);

    expect(state($plan, $ids['day'])['progress'])->toBe(['state' => 'none', 'done' => 0, 'total' => 1])
        ->and(state($plan, $ids['slot'])['done'])->toBeFalse();

    $plan->commands()->check($ids['b'])->run();

    expect(state($plan, $ids['slot']))->done->toBeTrue()->checked->toBeFalse();
    expect(state($plan, $ids['day']))->done->toBeTrue();
});

it('keeps one choice per plan: ticking an option unticks the others', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);

    $plan->commands()->check($ids['a'])->run();
    $plan->commands()->check($ids['c'])->run();

    expect(block($ids['a'])->checked_at)->toBeNull()
        ->and(block($ids['b'])->checked_at)->toBeNull()
        ->and(block($ids['c'])->checked_at)->not->toBeNull();
});

it('rejects ticking a plan directly', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);

    expect(rejected(fn () => $plan->commands()->check($ids['slot'])->run())->reason)->toBe('not_checkable');
});

it('check_all ticks each plan\'s main option, keeping a choice already made', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);
    $lunch = [id(), id(), id()];
    $plan->commands()
        ->create('slot', $ids['day'], $ids['slot'], ['category' => 'lunch'], id: $lunch[0])
        ->create('place', $lunch[0], payload: ['name' => 'Nasi A'], id: $lunch[1])
        ->create('place', $lunch[0], $lunch[1], ['name' => 'Nasi B'], id: $lunch[2])
        ->check($lunch[2])
        ->run();

    $plan->commands()->checkAll($ids['day'])->run();

    expect(block($ids['a'])->checked_at)->not->toBeNull()
        ->and(block($ids['b'])->checked_at)->toBeNull()
        ->and(block($lunch[1])->checked_at)->toBeNull()
        ->and(block($lunch[2])->checked_at)->not->toBeNull()
        ->and(state($plan, $ids['day'])['done'])->toBeTrue();

    $plan->commands()->uncheckAll($ids['day'])->run();

    expect(block($ids['a'])->checked_at)->toBeNull()
        ->and(block($lunch[2])->checked_at)->toBeNull();
});

it('allows up to five options per plan', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);
    $plan->commands()
        ->create('place', $ids['slot'], payload: ['name' => 'Kedai D'])
        ->create('place', $ids['slot'], payload: ['name' => 'Kedai E'])
        ->run();

    expect(rejected(fn () => $plan->commands()->create('place', $ids['slot'], payload: ['name' => 'Kedai F'])->run())->reason)
        ->toBe('limit_reached');
});

it('only goes in days and ideas lists', function () {
    $plan = makePlan();
    $ids = breakfastPlan($plan);

    expect(rejected(fn () => $plan->commands()->create('slot', $ids['slot'], payload: [])->run())->reason)->toBe('invalid_parent');
});

it('shows ranks and the chosen option in the server-rendered copy', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip');
    $ids = breakfastPlan($plan);
    $plan->commands()->check($ids['b'])->run();
    $this->actingAs($owner);

    $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

    expect($html)
        ->toContain('data-pb-category="breakfast"')
        ->toContain('>Breakfast<')
        ->toContain('★ Main')
        ->toContain('Backup 1')
        ->toContain('Backup 2')
        ->toContain('Went to Kedai B');
});
