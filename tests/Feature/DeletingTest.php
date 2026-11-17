<?php

use Tohawk89\PlanBlock\Models\Block;

it('deleting a source deletes its children and every link to it', function () {
    $plan = makePlan();
    [$pool, $place, $backup, $day, $link] = [id(), id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Cafe'], id: $place)
        ->create('backup', $place, payload: ['name' => 'Other cafe'], id: $backup)
        ->create('timeline', after: $pool, id: $day)
        ->link($place, $day, id: $link)
        ->run();

    $result = $plan->commands()->delete($place)->run();

    expect(collect($result->deleted)->sort()->values()->all())
        ->toBe(collect([$place, $backup, $link])->sort()->values()->all())
        ->and(Block::query()->pluck('ulid')->sort()->values()->all())
        ->toBe(collect([$pool, $day])->sort()->values()->all())
        ->and(collect($result->blocks)->pluck('id')->all())->toContain($pool, $day);
});

it('deleting a link removes only the link', function () {
    $plan = makePlan();
    [$pool, $place, $day, $link] = [id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Cafe'], id: $place)
        ->create('timeline', after: $pool, id: $day)
        ->link($place, $day, id: $link)
        ->delete($link)
        ->run();

    expect(block($place)->trashed())->toBeFalse()
        ->and(block($link)->trashed())->toBeTrue();
});

it('restores everything deleted in the same batch', function () {
    $plan = makePlan();
    [$pool, $place, $backup, $day, $link] = [id(), id(), id(), id(), id()];

    $plan->commands()
        ->create('pool', id: $pool)
        ->create('place', $pool, payload: ['name' => 'Cafe'], id: $place)
        ->create('backup', $place, payload: ['name' => 'Other cafe'], id: $backup)
        ->create('timeline', after: $pool, id: $day)
        ->link($place, $day, id: $link)
        ->delete($place)
        ->run();

    $result = $plan->commands()->restore($place)->run();

    expect(Block::query()->count())->toBe(5)
        ->and($result->deleted)->toBe([])
        ->and(collect($result->blocks)->pluck('id')->all())->toContain($place, $backup, $link);
});

it('refuses to restore a block whose parent is still deleted', function () {
    $plan = makePlan();
    [$day, $place, $note] = [id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('place', $day, payload: ['name' => 'Cafe'], id: $place)
        ->create('note', $place, payload: ['text' => 'Bring cash'], id: $note)
        ->delete($note)
        ->delete($place)
        ->run();

    expect(rejected(fn () => $plan->commands()->restore($note)->run())->reason)->toBe('parent_deleted');
});
