<?php

namespace Tohawk89\PlanBlock\Types;

use Closure;
use InvalidArgumentException;
use Tohawk89\PlanBlock\Exceptions\LockedBlockType;
use Tohawk89\PlanBlock\Exceptions\UnknownBlockType;
use Tohawk89\PlanBlock\Types\BuiltIn\BackupType;
use Tohawk89\PlanBlock\Types\BuiltIn\LinkType;
use Tohawk89\PlanBlock\Types\BuiltIn\NoteType;
use Tohawk89\PlanBlock\Types\BuiltIn\PlaceType;
use Tohawk89\PlanBlock\Types\BuiltIn\PoolType;
use Tohawk89\PlanBlock\Types\BuiltIn\TimelineType;

class BlockTypeRegistry
{
    public const LOCKED = ['timeline', 'pool', 'link'];

    /** @var array<string, BlockType> */
    protected array $types = [];

    public static function withBuiltIns(): self
    {
        $registry = new self;

        foreach ([TimelineType::class, PoolType::class, LinkType::class, PlaceType::class, BackupType::class, NoteType::class] as $class) {
            $registry->put(new $class);
        }

        return $registry;
    }

    /**
     * Register custom content types. Registering a type with an existing
     * content key replaces it; structural keys cannot be replaced.
     *
     * @param  class-string<BlockType>|BlockType|array<int, class-string<BlockType>|BlockType>  $types
     */
    public function register(string|BlockType|array $types): void
    {
        foreach (is_array($types) ? $types : [$types] as $type) {
            $instance = is_string($type) ? app($type) : $type;

            if (! $instance instanceof BlockType) {
                throw new InvalidArgumentException(sprintf('[%s] must extend %s.', is_string($type) ? $type : $type::class, BlockType::class));
            }

            if (in_array($instance->key(), self::LOCKED, true) || $instance->structural()) {
                throw LockedBlockType::replace($instance->key());
            }

            $this->put($instance);
        }
    }

    /**
     * Modify a registered type in place, e.g. ->addField() or ->renderer().
     */
    public function extend(string $key, Closure $callback): void
    {
        $callback($this->get($key));
    }

    public function get(string $key): BlockType
    {
        return $this->types[$key] ?? throw UnknownBlockType::make($key);
    }

    public function has(string $key): bool
    {
        return isset($this->types[$key]);
    }

    /**
     * @return array<string, BlockType>
     */
    public function all(): array
    {
        return $this->types;
    }

    public function manifest(): array
    {
        return array_map(fn (BlockType $type) => $type->toManifest(), $this->types);
    }

    protected function put(BlockType $type): void
    {
        $this->types[$type->key()] = $type;
    }
}
