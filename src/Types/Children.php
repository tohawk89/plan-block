<?php

namespace Tohawk89\PlanBlock\Types;

/**
 * Which block types may be placed inside a block, and how many.
 */
final class Children
{
    /** @var array<int, string> */
    private array $allowed = [];

    private bool $anyContent = false;

    /** @var array<string, int> */
    private array $max = [];

    public static function none(): self
    {
        return new self;
    }

    /**
     * @param  array<int, string>  $types
     */
    public static function allow(array $types): self
    {
        $children = new self;
        $children->allowed = array_values($types);

        return $children;
    }

    /**
     * Any non-structural (content) type, including custom registered types.
     */
    public static function anyContent(): self
    {
        $children = new self;
        $children->anyContent = true;

        return $children;
    }

    /**
     * @param  array<int, string>  $types
     */
    public function also(array $types): self
    {
        $this->allowed = array_values(array_unique([...$this->allowed, ...$types]));

        return $this;
    }

    public function max(string $type, int $max): self
    {
        $this->max[$type] = $max;

        return $this;
    }

    public function permits(BlockType $child): bool
    {
        return in_array($child->key(), $this->allowed, true)
            || ($this->anyContent && ! $child->structural());
    }

    public function maxFor(string $type): ?int
    {
        return $this->max[$type] ?? null;
    }

    public function toArray(): array
    {
        return [
            'allow' => $this->allowed,
            'any_content' => $this->anyContent,
            'max' => (object) $this->max,
        ];
    }
}
