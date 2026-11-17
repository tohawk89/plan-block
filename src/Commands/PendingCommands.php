<?php

namespace Tohawk89\PlanBlock\Commands;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Str;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * Fluent PHP API over the command bus, used by Livewire and host code:
 *
 *   $plan->commands($user)->check($block)->move($other, $day)->run();
 */
final class PendingCommands
{
    /** @var array<int, array<string, mixed>> */
    private array $commands = [];

    private ?int $baseVersion = null;

    private ?string $lastId = null;

    public function __construct(
        private readonly CommandBus $bus,
        private readonly Plan $plan,
        private readonly ?Authenticatable $user = null,
    ) {}

    public static function newId(): string
    {
        return strtolower((string) Str::ulid());
    }

    public function create(string $type, Block|string|null $parent = null, Block|string|null $after = null, array $payload = [], ?array $attachable = null, ?string $id = null): self
    {
        return $this->push('create', $id ?? self::newId(), array_filter([
            'type' => $type,
            'parent' => self::ref($parent),
            'after' => self::ref($after),
            'payload' => $payload,
            'attachable' => $attachable,
        ], fn ($value) => $value !== null));
    }

    public function link(Block|string $source, Block|string $parent, Block|string|null $after = null, ?string $id = null): self
    {
        return $this->push('link', $id ?? self::newId(), [
            'source' => self::ref($source),
            'parent' => self::ref($parent),
            'after' => self::ref($after),
        ]);
    }

    public function update(Block|string $block, array $payload): self
    {
        return $this->push('update', self::ref($block), ['payload' => $payload]);
    }

    /**
     * @param  Block|string|null  $parent  null moves to the top level
     */
    public function move(Block|string $block, Block|string|null $parent, Block|string|null $after = null): self
    {
        return $this->push('move', self::ref($block), ['parent' => self::ref($parent), 'after' => self::ref($after)]);
    }

    public function reorder(Block|string $block, Block|string|null $after): self
    {
        return $this->push('move', self::ref($block), ['after' => self::ref($after)]);
    }

    public function check(Block|string $block): self
    {
        return $this->push('check', self::ref($block));
    }

    public function uncheck(Block|string $block): self
    {
        return $this->push('uncheck', self::ref($block));
    }

    public function checkAll(Block|string $day): self
    {
        return $this->push('check_all', self::ref($day));
    }

    public function uncheckAll(Block|string $day): self
    {
        return $this->push('uncheck_all', self::ref($day));
    }

    public function exclude(Block|string $block): self
    {
        return $this->push('exclude', self::ref($block));
    }

    public function include(Block|string $block): self
    {
        return $this->push('include', self::ref($block));
    }

    public function delete(Block|string $block): self
    {
        return $this->push('delete', self::ref($block));
    }

    public function restore(Block|string $block): self
    {
        return $this->push('restore', self::ref($block));
    }

    public function baseVersion(int $version): self
    {
        $this->baseVersion = $version;

        return $this;
    }

    /**
     * ULID of the block targeted by the most recent command.
     */
    public function lastId(): ?string
    {
        return $this->lastId;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function toArray(): array
    {
        return $this->commands;
    }

    public function run(): CommandResult
    {
        return $this->bus->run($this->plan, $this->commands, $this->baseVersion, $this->user);
    }

    private function push(string $type, string $block, array $args = []): self
    {
        $this->commands[] = [
            'id' => (string) count($this->commands),
            'type' => $type,
            'block' => $block,
            'args' => $args,
        ];
        $this->lastId = $block;

        return $this;
    }

    private static function ref(Block|string|null $block): ?string
    {
        return $block instanceof Block ? $block->ulid : $block;
    }
}
