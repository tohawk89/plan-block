<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\Children;
use Tohawk89\PlanBlock\Types\GroupRule;

class PlaceType extends BlockType
{
    public static string $key = 'place';

    public function label(): string
    {
        return 'Place';
    }

    public function icon(): ?string
    {
        return 'map-pin';
    }

    public function fields(): array
    {
        return [
            Field::text('name')->required()->max(120),
            Field::url('maps_url')->max(2048),
            Field::time('time'),
            Field::textarea('notes')->max(5000),
        ];
    }

    public function parents(): ?array
    {
        return ['timeline', 'pool', 'slot'];
    }

    public function children(): Children
    {
        return Children::allow(['backup', 'note'])->max('backup', 3);
    }

    /** Done when the place itself or any backup is checked. */
    public function groupRule(): GroupRule
    {
        return GroupRule::Any;
    }
}
