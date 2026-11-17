<?php

namespace Tohawk89\PlanBlock\Exceptions;

use RuntimeException;

/**
 * A command broke a rule. The whole batch is rolled back.
 */
class CommandRejected extends RuntimeException
{
    /**
     * @param  array<string, array<int, string>>  $errors
     */
    public function __construct(
        public readonly string $reason,
        string $message,
        public readonly ?string $commandId = null,
        public readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    public static function because(string $reason, string $message, array $errors = []): self
    {
        return new self($reason, $message, null, $errors);
    }

    public function forCommand(string $commandId): self
    {
        return new self($this->reason, $this->getMessage(), $commandId, $this->errors);
    }

    public function toArray(): array
    {
        return array_filter([
            'command' => $this->commandId,
            'reason' => $this->reason,
            'message' => $this->getMessage(),
            'errors' => $this->errors ?: null,
        ], fn ($value) => $value !== null);
    }
}
