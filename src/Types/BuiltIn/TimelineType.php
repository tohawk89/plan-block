<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\Children;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * A day. Structural and locked.
 */
final class TimelineType extends BlockType
{
    public static string $key = 'timeline';

    public function label(): string
    {
        return 'Day';
    }

    public function icon(): ?string
    {
        return 'calendar';
    }

    public function fields(): array
    {
        return [Field::text('label')->max(80)];
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

    public function groupRule(): GroupRule
    {
        return GroupRule::All;
    }
}
