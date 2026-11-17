<?php

use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Models\Plan;

it('requires authentication', function () {
    $plan = makePlan();

    $this->getJson("/plan-block/plans/{$plan->ulid}")->assertUnauthorized();
});

it('lets the plan owner view and edit by default', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip to JB', '2026-12-01');
    $day = id();

    $this->actingAs($owner)
        ->postJson("/plan-block/plans/{$plan->ulid}/commands", [
            'base_version' => 0,
            'commands' => [['id' => 'c1', 'type' => 'create', 'block' => $day, 'args' => ['type' => 'timeline']]],
        ])
        ->assertOk()
        ->assertJson(['ok' => true, 'version' => 1, 'full' => false])
        ->assertJsonPath('blocks.0.id', $day)
        ->assertJsonPath('blocks.0.day', ['number' => 1, 'date' => '2026-12-01']);

    $this->actingAs($owner)
        ->getJson("/plan-block/plans/{$plan->ulid}")
        ->assertOk()
        ->assertJsonPath('plan.version', 1)
        ->assertJsonCount(1, 'blocks');
});

it('forbids other users unless the host gate allows them', function () {
    $plan = makeUser()->createPlan('Trip');
    $stranger = makeUser();

    $this->actingAs($stranger)->getJson("/plan-block/plans/{$plan->ulid}")->assertForbidden();

    Gate::define('plan-block.view', fn ($user, Plan $plan) => true);

    $this->actingAs($stranger)->getJson("/plan-block/plans/{$plan->ulid}")->assertOk();
});

it('returns the full plan when base_version is stale', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip');
    $plan->commands()->create('timeline')->create('pool')->run();

    $this->actingAs($owner)
        ->postJson("/plan-block/plans/{$plan->ulid}/commands", [
            'base_version' => 0,
            'commands' => [['type' => 'create', 'block' => id(), 'args' => ['type' => 'timeline']]],
        ])
        ->assertOk()
        ->assertJson(['full' => true, 'version' => 3])
        ->assertJsonCount(3, 'blocks');
});

it('returns 422 with the failing command', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip');

    $this->actingAs($owner)
        ->postJson("/plan-block/plans/{$plan->ulid}/commands", [
            'commands' => [
                ['id' => 'a', 'type' => 'create', 'block' => id(), 'args' => ['type' => 'timeline']],
                ['id' => 'b', 'type' => 'create', 'block' => id(), 'args' => ['type' => 'place', 'payload' => ['name' => 'x']]],
            ],
        ])
        ->assertStatus(422)
        ->assertJson(['ok' => false, 'error' => ['command' => 'b', 'reason' => 'invalid_parent']]);

    expect($plan->blocks()->count())->toBe(0);
});

it('rejects malformed commands', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip');

    $this->actingAs($owner)
        ->postJson("/plan-block/plans/{$plan->ulid}/commands", [
            'commands' => [['id' => 'x', 'type' => 'explode', 'block' => 'nope']],
        ])
        ->assertStatus(422)
        ->assertJsonPath('error.reason', 'invalid_command')
        ->assertJsonPath('error.command', 'x');
});

it('serves the manifest', function () {
    $this->actingAs(makeUser())
        ->getJson('/plan-block/manifest')
        ->assertOk()
        ->assertJsonPath('version', 1)
        ->assertJsonPath('types.timeline.structural', true)
        ->assertJsonPath('types.place.rule', 'any')
        ->assertJsonPath('types.place.children.max.backup', 3);
});

it('reports what a delete would also remove', function () {
    $owner = makeUser();
    $plan = $owner->createPlan('Trip', '2026-12-01');
    [$day1, $pool, $place, $day2] = [id(), id(), id(), id()];

    $plan->commands()
        ->create('timeline', id: $day1)
        ->create('pool', after: $day1, id: $pool)
        ->create('place', $pool, payload: ['name' => 'Cafe'], id: $place)
        ->create('backup', $place, payload: ['name' => 'Other'])
        ->create('timeline', after: $pool, id: $day2)
        ->link($place, $day2)
        ->run();

    $this->actingAs($owner)
        ->getJson("/plan-block/plans/{$plan->ulid}/blocks/{$place}/delete-impact")
        ->assertOk()
        ->assertJson([
            'block' => $place,
            'descendants' => 1,
            'links' => [['source' => $place, 'parent' => $day2, 'parent_type' => 'timeline', 'day' => ['number' => 2, 'date' => '2026-12-02']]],
        ]);
});
