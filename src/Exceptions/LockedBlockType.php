<?php

namespace Tohawk89\PlanBlock\Exceptions;

use LogicException;

class LockedBlockType extends LogicException
{
    public static function replace(string $key): self
    {
        return new self("Block type [{$key}] is structural and cannot be registered or replaced. Only its renderers can be changed.");
    }

    public static function fields(string $key): self
    {
        return new self("Block type [{$key}] is structural; its fields cannot be changed. Only its renderers can be changed.");
    }
}
