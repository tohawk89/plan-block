<?php

use Illuminate\Support\Carbon;
use Tohawk89\PlanBlock\Facades\PlanBlock;
use Tohawk89\PlanBlock\Models\Plan;

/*
 * The JSON contract shared with the JS client. The fixtures in /contract are
 * generated from a real plan here and loaded by the JS tests, so the two
 * sides cannot drift. After an intentional change, regenerate with:
 *
 *   UPDATE_CONTRACT=1 vendor/bin/pest --filter=contract
 */

function contractPath(string $file): string
{
    return dirname(__DIR__, 2).'/contract/'.$file;
}

/**
 * @param  string  $json  raw JSON as sent to the client ({} stays {})
 */
function assertContract(string $file, string $json): void
{
    $path = contractPath($file);

    if (getenv('UPDATE_CONTRACT')) {
        @mkdir(dirname($path), 0777, true);
        file_put_contents($path, json_encode(json_decode($json), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
    }

    expect(file_exists($path))->toBeTrue("Missing {$file}. Run with UPDATE_CONTRACT=1.")
        ->and(json_decode($json, true))->toEqual(json_decode(file_get_contents($path), true));
}

/**
 * Day 1: Breakfast (backup checked), Lunch (excluded), a note.
 * Pool: Museum (checked). Day 2: link to Museum.
 */
function contractPlan(): Plan
{
    $id = fn (string $n) => '01jd00000000000000000000'.$n;

    $plan = makeUser()->createPlan('Trip to JB', '2026-12-01');
    $plan->forceFill(['ulid' => $id('p1')])->save();

    $plan->commands()
        ->create('timeline', id: $id('01'))
        ->create('place', $id('01'), payload: ['name' => 'Breakfast', 'time' => '08:00'], id: $id('02'))
        ->create('backup', $id('02'), payload: ['name' => 'Backup cafe'], id: $id('03'))
        ->create('place', $id('01'), $id('02'), ['name' => 'Lunch', 'time' => '12:30'], id: $id('04'))
        ->create('note', $id('01'), $id('04'), ['text' => 'Bring cash'], id: $id('05'))
        ->create('pool', after: $id('01'), id: $id('06'))
        ->create('place', $id('06'), payload: ['name' => 'Museum', 'maps_url' => 'https://maps.example.test/museum'], id: $id('07'))
        ->create('timeline', after: $id('06'), id: $id('08'))
        ->link($id('07'), $id('08'), id: $id('09'))
        ->check($id('03'))
        ->exclude($id('04'))
        ->check($id('07'))
        ->run();

    return $plan->fresh();
}

it('matches the shared plan contract fixture', function () {
    Carbon::setTestNow('2026-11-17 10:00:00');
    $plan = contractPlan();

    $this->actingAs($plan->owner)
        ->getJson("/plan-block/plans/{$plan->ulid}")
        ->assertOk()
        ->tap(fn ($response) => assertContract('plan-response.json', $response->getContent()));
});

it('matches the shared manifest contract fixture', function () {
    assertContract('manifest.json', json_encode(PlanBlock::manifest()));
});
