<?php

use Illuminate\Support\Facades\Blade;
use Tohawk89\PlanBlock\Support\Palette;

it('stores a colour on days and ideas lists', function () {
    $plan = makePlan();
    [$day, $pool] = [id(), id()];
    $plan->commands()
        ->create('timeline', id: $day)
        ->create('pool', after: $day, id: $pool)
        ->run();

    $plan->commands()->update($day, ['color' => 'blue'])->update($pool, ['color' => 'amber'])->run();

    expect(block($day)->payload['color'])->toBe('blue')
        ->and(block($pool)->payload['color'])->toBe('amber');
});

it('rejects colours outside the palette', function () {
    $plan = makePlan();
    $day = id();
    $plan->commands()->create('timeline', id: $day)->run();

    rejected(fn () => $plan->commands()->update($day, ['color' => 'url(evil)'])->run());

    expect(block($day)->payload)->not->toHaveKey('color');
});

it('rotates day colours by day number and keeps ideas lists gray', function () {
    expect(Palette::resolve('timeline', null, 1))->toBe('coral')
        ->and(Palette::resolve('timeline', null, 2))->toBe('teal')
        ->and(Palette::resolve('timeline', null, 8))->toBe('coral')
        ->and(Palette::resolve('timeline', 'pink', 1))->toBe('pink')
        ->and(Palette::resolve('timeline', 'not-a-colour', 2))->toBe('teal')
        ->and(Palette::resolve('pool', null))->toBe('gray')
        ->and(Palette::resolve('place', null))->toBeNull();
});

it('colours days and ideas lists in the server-rendered copy', function () {
    [$owner, $plan, $ids] = samplePlan();
    $this->actingAs($owner);
    $plan->commands()->update($ids['day2'], ['color' => 'green'])->run();

    $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

    expect($html)
        ->toMatch('/data-pb-key="'.$ids['day'].'"[^>]*data-pb-color="coral"|data-pb-color="coral"[^>]*data-pb-key="'.$ids['day'].'"/')
        ->toMatch('/data-pb-key="'.$ids['pool'].'"[^>]*data-pb-color="gray"|data-pb-color="gray"[^>]*data-pb-key="'.$ids['pool'].'"/')
        ->toMatch('/data-pb-key="'.$ids['day2'].'"[^>]*data-pb-color="green"|data-pb-color="green"[^>]*data-pb-key="'.$ids['day2'].'"/');
});
