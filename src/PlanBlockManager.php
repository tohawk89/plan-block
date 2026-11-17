<?php

namespace Tohawk89\PlanBlock;

use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Commands\PendingCommands;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\PlanTree;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

/**
 * Entry point behind the PlanBlock facade.
 */
class PlanBlockManager
{
    public const MANIFEST_VERSION = 1;

    public function __construct(
        protected BlockTypeRegistry $types,
        protected CommandBus $bus,
    ) {}

    /**
     * Register one or more custom content block type classes.
     *
     * @param  class-string<BlockType>|BlockType|array<int, class-string<BlockType>|BlockType>  $types
     */
    public function register(string|BlockType|array $types): void
    {
        $this->types->register($types);
    }

    /**
     * Modify a registered block type, e.g. add a field or swap a renderer.
     */
    public function extend(string $key, Closure $callback): void
    {
        $this->types->extend($key, $callback);
    }

    public function types(): BlockTypeRegistry
    {
        return $this->types;
    }

    /**
     * The manifest every frontend adapter reads.
     */
    public function manifest(): array
    {
        return [
            'version' => self::MANIFEST_VERSION,
            'types' => $this->types->manifest(),
        ];
    }

    /**
     * Start a batch of commands against a plan, run with ->run().
     */
    public function commands(Plan $plan, ?Authenticatable $user = null): PendingCommands
    {
        return new PendingCommands($this->bus, $plan, $user);
    }

    public function tree(Plan $plan): PlanTree
    {
        return PlanTree::load($plan);
    }
}
