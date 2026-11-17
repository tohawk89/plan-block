<?php

use Illuminate\Contracts\Broadcasting\Factory as BroadcastFactory;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Events\PlanUpdated;
use Tohawk89\PlanBlock\Facades\PlanBlock;

it('broadcasts nothing unless enabled', function () {
    Event::fake([PlanUpdated::class]);
    [, $plan, $ids] = samplePlan();

    $plan->commands()->check($ids['museum'])->run();

    Event::assertNotDispatched(PlanUpdated::class);
    expect(PlanBlock::manifest()['realtime']['enabled'])->toBeFalse();
});

it('broadcasts each saved batch on the plan channel with the changed blocks', function () {
    [, $plan, $ids] = samplePlan();
    config()->set('plan-block.broadcasting.enabled', true);
    Event::fake([PlanUpdated::class]);

    $result = $plan->commands()->check($ids['museum'])->exclude($ids['breakfast'])->run();

    Event::assertDispatched(PlanUpdated::class, function (PlanUpdated $event) use ($plan, $ids, $result) {
        $payload = $event->broadcastWith();

        expect($event->broadcastOn()->name)->toBe('private-plan-block.plans.'.$plan->ulid)
            ->and($event->broadcastAs())->toBe('plan-block.changed')
            ->and($payload['plan'])->toBe($plan->ulid)
            ->and($payload['version'])->toBe($result->version)
            ->and($payload['previous_version'])->toBe($result->version - 2)
            ->and(collect($payload['blocks'])->pluck('id'))->toContain($ids['museum'], $ids['pool'], $ids['day2'], $ids['breakfast'])
            ->and($payload['deleted'])->toBe([]);

        return true;
    });

    expect(PlanBlock::manifest()['realtime'])->toBe([
        'enabled' => true,
        'channel_prefix' => 'plan-block.plans.',
        'event' => 'plan-block.changed',
    ]);
});

it('sends only the changed blocks even when the sender was stale', function () {
    [, $plan, $ids] = samplePlan();
    config()->set('plan-block.broadcasting.enabled', true);
    Event::fake([PlanUpdated::class]);

    $result = $plan->commands()->baseVersion(0)->check($ids['museum'])->run();

    expect($result->full)->toBeTrue()->and($result->blocks)->toHaveCount(7);
    // Museum, its pool, the link to it on Day 2, and Day 2: not the whole plan.
    Event::assertDispatched(PlanUpdated::class, fn (PlanUpdated $e) => collect($e->broadcastWith()['blocks'])->pluck('id')->sort()->values()->all()
        === collect([$ids['museum'], $ids['pool'], $ids['day2'], block($ids['museum'])->links()->value('ulid')])->sort()->values()->all());
});

it('drops blocks from messages that are too large, so clients reload', function () {
    config()->set('plan-block.broadcasting.enabled', true);
    config()->set('plan-block.broadcasting.max_payload', 200);
    Event::fake([PlanUpdated::class]);
    [, $plan, $ids] = samplePlan();

    $plan->commands()->check($ids['museum'])->run();

    Event::assertDispatched(PlanUpdated::class, function (PlanUpdated $event) {
        expect($event->broadcastWith())->toHaveKeys(['plan', 'version', 'previous_version'])
            ->not->toHaveKey('blocks');

        return true;
    });
});

it('uses the configured queue connection for the broadcast', function () {
    config()->set('plan-block.broadcasting.enabled', true);
    config()->set('plan-block.broadcasting.connection', 'sync');
    Event::fake([PlanUpdated::class]);
    [, $plan, $ids] = samplePlan();

    $plan->commands()->check($ids['museum'])->run();

    Event::assertDispatched(PlanUpdated::class, fn (PlanUpdated $e) => $e->connection === 'sync');
});

it('never fails a save when the broadcaster is down', function () {
    [, $plan, $ids] = samplePlan();
    config()->set('plan-block.broadcasting.enabled', true);
    config()->set('plan-block.broadcasting.connection', 'sync');
    config()->set('broadcasting.connections.failing', ['driver' => 'failing']);
    config()->set('broadcasting.default', 'failing');
    app(BroadcastFactory::class)->extend('failing', fn () => new class extends \Illuminate\Broadcasting\Broadcasters\Broadcaster
    {
        public function auth($request) {}

        public function validAuthenticationResponse($request, $result) {}

        public function broadcast(array $channels, $event, array $payload = []): void
        {
            throw new \Illuminate\Broadcasting\BroadcastException('Reverb is down');
        }
    });
    $reported = [];
    app(\Illuminate\Contracts\Debug\ExceptionHandler::class)->reportable(function (\Throwable $e) use (&$reported) {
        $reported[] = $e->getMessage();
    });

    $result = $plan->commands()->check($ids['museum'])->run();

    expect($result->version)->toBe($plan->version + 1)
        ->and(block($ids['museum'])->checked_at)->not->toBeNull()
        ->and($reported)->toBe(['Reverb is down']);
});

it('authorizes the plan channel with the plan-block.view gate', function () {
    [$owner, $plan] = samplePlan();
    $channels = app(BroadcastFactory::class)->connection()->getChannels();
    $authorize = $channels['plan-block.plans.{plan}'];

    expect($authorize($owner, $plan->ulid))->toBeTrue()
        ->and($authorize(makeUser(), $plan->ulid))->toBeFalse()
        ->and($authorize($owner, '01jd0000000000000000000000'))->toBeFalse();

    Gate::define('plan-block.view', fn () => true);
    expect($authorize(makeUser(), $plan->ulid))->toBeTrue();
});
