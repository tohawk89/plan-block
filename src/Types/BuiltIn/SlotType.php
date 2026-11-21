<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\Children;
use Tohawk89\PlanBlock\Types\GroupRule;

/**
 * A plan within a day ("Breakfast at 8:00") holding ranked place options:
 * the first is the main choice, the rest are backups. Ticking one option
 * unticks the others; the plan is done once an option is ticked.
 */
class SlotType extends BlockType
{
    public static string $key = 'slot';

    /** @var array<string, string> */
    public const CATEGORIES = [
        'breakfast' => 'Breakfast',
        'lunch' => 'Lunch',
        'dinner' => 'Dinner',
        'activity' => 'Activity',
        'stay' => 'Stay',
        'travel' => 'Travel',
        'other' => 'Other',
    ];

    public const MAX_OPTIONS = 5;

    public function label(): string
    {
        return 'Plan';
    }

    public function icon(): ?string
    {
        return 'list-check';
    }

    public function fields(): array
    {
        return [
            Field::select('category', self::CATEGORIES)->default('other'),
            Field::text('title')->max(120),
            Field::time('time'),
            Field::textarea('notes')->max(5000),
        ];
    }

    public function parents(): ?array
    {
        return ['timeline', 'pool'];
    }

    public function children(): Children
    {
        return Children::allow(['place', 'note'])->max('place', self::MAX_OPTIONS);
    }

    /** Ticked through its options, not on its own. */
    public function checkable(): bool
    {
        return false;
    }

    public function groupRule(): GroupRule
    {
        return GroupRule::One;
    }
}
