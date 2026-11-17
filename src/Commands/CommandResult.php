<?php

namespace Tohawk89\PlanBlock\Commands;

/**
 * What a batch changed, in the shape the client applies.
 */
final class CommandResult
{
    /**
     * @param  array<int, array<string, mixed>>  $blocks  changed blocks (all blocks when $full)
     * @param  array<int, string>  $deleted  ULIDs of soft-deleted blocks
     * @param  bool  $full  true when the client's base_version was stale
     * @param  int|null  $previousVersion  the plan version before this batch
     * @param  array<int, array<string, mixed>>|null  $changedBlocks  only the blocks this batch changed (even when $full)
     */
    public function __construct(
        public readonly int $version,
        public readonly array $blocks,
        public readonly array $deleted,
        public readonly bool $full,
        public readonly ?int $previousVersion = null,
        public readonly ?array $changedBlocks = null,
    ) {}

    public function toArray(): array
    {
        return [
            'version' => $this->version,
            'full' => $this->full,
            'blocks' => $this->blocks,
            'deleted' => $this->deleted,
        ];
    }
}
