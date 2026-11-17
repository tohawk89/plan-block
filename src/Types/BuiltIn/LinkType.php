<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Types\BlockType;

/**
 * A reference to another block or group. Its state is always its source's.
 * Structural and locked.
 */
final class LinkType extends BlockType
{
    public static string $key = 'link';

    public function label(): string
    {
        return 'Link';
    }

    public function icon(): ?string
    {
        return 'link';
    }

    public function parents(): ?array
    {
        return ['timeline', 'pool'];
    }

    public function structural(): bool
    {
        return true;
    }
}
