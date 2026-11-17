<?php

use Tohawk89\PlanBlock\Models\Plan;

/**
 * Day with Breakfast (with one backup) and Lunch.
 *
 * @return array{day: string, breakfast: string, backup: string, lunch: string}
 */
function dayWithMeals(Plan $plan): array
{
    $ids = ['day' => id(), 'breakfast' => id(), 'backup' => id(), 'lunch' => id()];

    $plan->commands()
        ->create('timeline', id: $ids['day'])
        ->create('place', $ids['day'], payload: ['name' => 'Breakfast'], id: $ids['breakfast'])
        ->create('backup', $ids['breakfast'], payload: ['name' => 'Backup cafe'], id: $ids['backup'])
        ->create('place', $ids['day'], $ids['breakfast'], ['name' => 'Lunch'], id: $ids['lunch'])
        ->run();

    return $ids;
}

it('derives day progress from its items', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);

    expect(state($plan, $ids['day'])['progress'])->toBe(['state' => 'none', 'done' => 0, 'total' => 2]);

    $plan->commands()->check($ids['lunch'])->run();
    expect(state($plan, $ids['day'])['progress'])->toBe(['state' => 'some', 'done' => 1, 'total' => 2]);

    $plan->commands()->check($ids['breakfast'])->run();
    expect(state($plan, $ids['day']))
        ->progress->toBe(['state' => 'all', 'done' => 2, 'total' => 2])
        ->done->toBeTrue();
});

it('marks a place done when any backup is checked', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);

    $plan->commands()->check($ids['backup'])->run();

    expect(state($plan, $ids['breakfast']))
        ->checked->toBeFalse()
        ->done->toBeTrue();
    expect(state($plan, $ids['day'])['progress']['done'])->toBe(1);
});

it('check_all checks primaries only, never backups', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);

    $plan->commands()->checkAll($ids['day'])->run();

    expect(block($ids['breakfast'])->checked_at)->not->toBeNull()
        ->and(block($ids['lunch'])->checked_at)->not->toBeNull()
        ->and(block($ids['backup'])->checked_at)->toBeNull()
        ->and(state($plan, $ids['day'])['done'])->toBeTrue();
});

it('uncheck_all clears primaries and backups', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);
    $plan->commands()->check($ids['backup'])->check($ids['lunch'])->run();

    $plan->commands()->uncheckAll($ids['day'])->run();

    expect(block($ids['backup'])->checked_at)->toBeNull()
        ->and(block($ids['lunch'])->checked_at)->toBeNull();
});

it('does not count excluded items, so a day can still finish', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);

    $plan->commands()->exclude($ids['lunch'])->check($ids['breakfast'])->run();

    expect(state($plan, $ids['day']))
        ->progress->toBe(['state' => 'all', 'done' => 1, 'total' => 1])
        ->done->toBeTrue();
    expect(state($plan, $ids['lunch'])['excluded'])->toBeTrue();
});

it('rejects checking a day directly', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);

    expect(rejected(fn () => $plan->commands()->check($ids['day'])->run())->reason)->toBe('not_checkable');
});

it('records who checked a block', function () {
    $plan = makePlan();
    $ids = dayWithMeals($plan);
    $user = makeUser();

    $plan->commands($user)->check($ids['lunch'])->run();

    expect(block($ids['lunch'])->checked_by)->toBe((string) $user->id);
});

it('keeps a pool as progress only, never done', function () {
    $plan = makePlan();
    [$pool, $a] = [id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Museum'], id: $a)
        ->check($a)
        ->run();

    expect(state($plan, $pool))
        ->progress->toBe(['state' => 'all', 'done' => 1, 'total' => 1])
        ->done->toBeFalse();
});

it('derives day numbers and dates from the plan start date', function () {
    $plan = makePlan(['start_date' => '2026-12-01']);
    [$d1, $pool, $d2] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $d1)
        ->create('pool', after: $d1, id: $pool)
        ->create('timeline', after: $pool, id: $d2)
        ->run();

    expect(state($plan, $d1)['day'])->toBe(['number' => 1, 'date' => '2026-12-01'])
        ->and(state($plan, $d2)['day'])->toBe(['number' => 2, 'date' => '2026-12-02'])
        ->and(state($plan, $pool)['day'])->toBeNull();
});
