<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tohawk89\PlanBlock\Commands\PendingCommands;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Tests\Fixtures\User;
use Tohawk89\PlanBlock\Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

function makeUser(): User
{
    return User::create(['name' => 'Traveller', 'email' => uniqid().'@example.test', 'password' => 'secret']);
}

function makePlan(array $attributes = []): Plan
{
    return Plan::create(['title' => 'Trip to JB', ...$attributes]);
}

function id(): string
{
    return PendingCommands::newId();
}

function block(string $ulid): Block
{
    return Block::withTrashed()->where('ulid', $ulid)->firstOrFail();
}

/**
 * Serialized state of one block from a fresh tree.
 */
function state(Plan $plan, string $ulid): array
{
    $tree = $plan->fresh()->tree();

    return $tree->serialize($tree->find(block($ulid)->id));
}

function rejected(callable $callback): CommandRejected
{
    try {
        $callback();
    } catch (CommandRejected $e) {
        return $e;
    }

    throw new RuntimeException('Expected CommandRejected was not thrown.');
}

/**
 * A plan with Day 1 (Breakfast with a checked backup), a pool (Museum) and
 * Day 2 linking to Museum.
 *
 * @return array{0: User, 1: Plan, 2: array<string, string>}
 */
function samplePlan(): array
{
    $owner = makeUser();
    $plan = $owner->createPlan('Trip to JB', '2026-12-01');
    $ids = ['day' => id(), 'breakfast' => id(), 'backup' => id(), 'pool' => id(), 'museum' => id(), 'day2' => id()];

    $plan->commands()
        ->create('timeline', id: $ids['day'])
        ->create('place', $ids['day'], payload: ['name' => 'Breakfast <b>', 'time' => '08:00'], id: $ids['breakfast'])
        ->create('backup', $ids['breakfast'], payload: ['name' => 'Backup cafe'], id: $ids['backup'])
        ->create('pool', after: $ids['day'], id: $ids['pool'])
        ->create('place', $ids['pool'], payload: ['name' => 'Museum'], id: $ids['museum'])
        ->create('timeline', after: $ids['pool'], id: $ids['day2'])
        ->link($ids['museum'], $ids['day2'])
        ->check($ids['backup'])
        ->run();

    return [$owner, $plan->fresh(), $ids];
}
