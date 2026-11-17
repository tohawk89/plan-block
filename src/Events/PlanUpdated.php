<?php

namespace Tohawk89\PlanBlock\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tohawk89\PlanBlock\Commands\CommandResult;
use Tohawk89\PlanBlock\Models\Plan;

/**
 * Broadcast to everyone viewing a plan after a batch is saved, so other
 * tabs and devices update live. Only sent when
 * plan-block.broadcasting.enabled is true.
 *
 * Clients apply the changed blocks when they are exactly one batch behind
 * (previous_version matches) and reload otherwise. Large batches are sent
 * without blocks, which makes clients reload.
 */
class PlanUpdated implements ShouldBroadcast
{
    use InteractsWithSockets;

    public const EVENT = 'plan-block.changed';

    public const CHANNEL_PREFIX = 'plan-block.plans.';

    /** Queue connection for the broadcast job ("sync" sends during the request). */
    public ?string $connection;

    public function __construct(
        public readonly string $planUlid,
        public readonly CommandResult $result,
    ) {
        $this->connection = config('plan-block.broadcasting.connection');
    }

    public static function for(Plan $plan, CommandResult $result): self
    {
        return new self($plan->ulid, $result);
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(self::CHANNEL_PREFIX.$this->planUlid);
    }

    public function broadcastAs(): string
    {
        return self::EVENT;
    }

    /**
     * @return array{plan: string, version: int, previous_version: int|null, blocks?: array, deleted?: array}
     */
    public function broadcastWith(): array
    {
        $payload = [
            'plan' => $this->planUlid,
            'version' => $this->result->version,
            'previous_version' => $this->result->previousVersion,
            'blocks' => $this->result->changedBlocks ?? $this->result->blocks,
            'deleted' => $this->result->deleted,
        ];

        // Pusher-compatible services limit message size (10 KB by default).
        $max = (int) config('plan-block.broadcasting.max_payload', 8000);
        if (strlen((string) json_encode($payload)) > $max) {
            unset($payload['blocks'], $payload['deleted']);
        }

        return $payload;
    }
}
