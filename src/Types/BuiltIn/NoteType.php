<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Types\BlockType;

class NoteType extends BlockType
{
    public static string $key = 'note';

    public function label(): string
    {
        return 'Note';
    }

    public function icon(): ?string
    {
        return 'sticky-note';
    }

    public function fields(): array
    {
        return [Field::textarea('text')->required()->max(5000)];
    }

    public function checkable(): bool
    {
        return false;
    }

    public function countable(): bool
    {
        return false;
    }
}
