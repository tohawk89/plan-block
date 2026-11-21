<?php

namespace Tohawk89\PlanBlock\Support;

/**
 * Colours a day or ideas list can have. Stored by name in the block's
 * "color" field; the stylesheet maps each name to its shades.
 *
 * Without a stored colour, days take turns through DAY_ROTATION by day
 * number and ideas lists are gray. The web component uses the same rule.
 */
final class Palette
{
    /** @var array<string, string> name => label */
    public const COLORS = [
        'coral' => 'Coral',
        'amber' => 'Amber',
        'green' => 'Green',
        'teal' => 'Teal',
        'blue' => 'Blue',
        'purple' => 'Purple',
        'pink' => 'Pink',
        'gray' => 'Gray',
    ];

    /** @var list<string> */
    public const DAY_ROTATION = ['coral', 'teal', 'purple', 'amber', 'blue', 'pink', 'green'];

    public const POOL_DEFAULT = 'gray';

    /**
     * The colour to show: the stored one if valid, else the default for
     * the block type (by day number for days).
     */
    public static function resolve(string $type, mixed $stored, ?int $dayNumber = null): ?string
    {
        if (is_string($stored) && isset(self::COLORS[$stored])) {
            return $stored;
        }

        return match ($type) {
            'timeline' => self::DAY_ROTATION[(max(1, $dayNumber ?? 1) - 1) % count(self::DAY_ROTATION)],
            'pool' => self::POOL_DEFAULT,
            default => null,
        };
    }
}
