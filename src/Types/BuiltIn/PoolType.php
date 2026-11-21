<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Support\Palette;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\Children;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * The sandbox: blocks to pull from when needed. Structural and locked.
 */
final class PoolType extends BlockType
{
    public static string $key = 'pool';

    public function label(): string
    {
        return 'Pool';
    }

    public function icon(): ?string
    {
        return 'inbox';
    }

    public function fields(): array
    {
        return [
            Field::text('label')->max(80),
            Field::select('color', Palette::COLORS)->label('Colour'),
        ];
    }

    public function parents(): ?array
    {
        return [];
    }

    public function children(): Children
    {
        return Children::anyContent()->also(['link']);
    }

    public function structural(): bool
    {
        return true;
    }

    public function allowedAtRoot(): bool
    {
        return true;
    }

    public function checkable(): bool
    {
        return false;
    }

    /** A linked pool never blocks a day from being done. */
    public function countable(): bool
    {
        return false;
    }

    public function groupRule(): GroupRule
    {
        return GroupRule::Count;
    }
}
