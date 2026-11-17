<?php

namespace Tohawk89\PlanBlock\Types\BuiltIn;

use Tohawk89\PlanBlock\Types\Children;
use Tohawk89\PlanBlock\Types\GroupRule;

class BackupType extends PlaceType
{
    public static string $key = 'backup';

    public function label(): string
    {
        return 'Backup';
    }

    public function icon(): ?string
    {
        return 'life-buoy';
    }

    public function parents(): ?array
    {
        return ['place'];
    }

    public function children(): Children
    {
        return Children::allow(['note']);
    }

    public function groupRule(): GroupRule
    {
        return GroupRule::None;
    }
}
