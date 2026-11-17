<?php

namespace Tohawk89\PlanBlock\Exceptions;

use InvalidArgumentException;

class UnknownBlockType extends InvalidArgumentException
{
    public static function make(string $key): self
    {
        return new self("Block type [{$key}] is not registered.");
    }
}
