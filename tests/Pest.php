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
