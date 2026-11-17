<?php

namespace Tohawk89\PlanBlock\Commands;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tohawk89\PlanBlock\Actions;
use Tohawk89\PlanBlock\Events\PlanChanged;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\ChangeSet;
use Tohawk89\PlanBlock\Support\Context;
use Tohawk89\PlanBlock\Support\Ordering;
use Tohawk89\PlanBlock\Support\PlanTree;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

/**
 * Runs a batch of commands in one transaction. All succeed or none do.
 */
class CommandBus
{
    /** @var array<string, class-string<Actions\Action>> */
    public const ACTIONS = [
        'create' => Actions\CreateBlock::class,
        'update' => Actions\UpdateBlock::class,
        'move' => Actions\MoveBlock::class,
        'check' => Actions\CheckBlock::class,
        'uncheck' => Actions\UncheckBlock::class,
        'check_all' => Actions\CheckAll::class,
        'uncheck_all' => Actions\UncheckAll::class,
        'exclude' => Actions\ExcludeBlock::class,
        'include' => Actions\IncludeBlock::class,
        'link' => Actions\LinkBlock::class,
        'delete' => Actions\DeleteBlock::class,
        'restore' => Actions\RestoreBlock::class,
    ];

    public function __construct(
        protected Container $container,
        protected BlockTypeRegistry $types,
        protected Ordering $ordering,
    ) {}

    /**
     * @param  array<int, array{id?: string, type: string, block: string, args?: array<string, mixed>}>  $commands
     * @param  int|null  $baseVersion  the plan version the client last saw; if stale, the full plan is returned
     *
     * @throws CommandRejected
     */
    public function run(Plan $plan, array $commands, ?int $baseVersion = null, ?Authenticatable $user = null): CommandResult
    {
        $this->validateShape($commands);

        $changes = new ChangeSet;

        [$plan, $stale] = DB::connection($plan->getConnectionName())->transaction(function () use ($plan, $commands, $baseVersion, $user, $changes) {
            $locked = Plan::query()->whereKey($plan->getKey())->lockForUpdate()->firstOrFail();
            $stale = $baseVersion !== null && $baseVersion !== (int) $locked->version;
            $ctx = new Context($locked, $user, $changes, $this->types, $this->ordering);

            foreach ($commands as $index => $command) {
                try {
                    $this->container->make(self::ACTIONS[$command['type']])
                        ->handle($ctx, $command['block'], $command['args'] ?? []);
                } catch (CommandRejected $e) {
                    throw $e->forCommand((string) ($command['id'] ?? $index));
                }
            }

            $locked->version = (int) $locked->version + count($commands);
            $locked->save();

            return [$locked, $stale];
        });

        foreach ($changes->events() as $event) {
            event($event);
        }

        $tree = PlanTree::load($plan);

        $result = new CommandResult(
            version: (int) $plan->version,
            blocks: $stale ? $tree->serializeAll() : $tree->serializeMany($this->affected($tree, $changes)),
            deleted: $changes->deletedIds(),
            full: $stale,
        );

        event(new PlanChanged($plan, $result, $user));

        return $result;
    }

    /**
     * Touched blocks plus everything whose derived state may have changed:
     * ancestors (group progress) and links to them (mirrored state).
     *
     * @return array<int, \Tohawk89\PlanBlock\Models\Block>
     */
    protected function affected(PlanTree $tree, ChangeSet $changes): array
    {
        $queue = $changes->touchedIds();
        $found = [];

        while ($queue) {
            $id = array_pop($queue);

            if (isset($found[$id]) || ! ($block = $tree->find($id))) {
                continue;
            }

            $found[$id] = $block;

            if ($block->parent_id !== null) {
                $queue[] = $block->parent_id;
            }

            foreach ($tree->linksTo($block) as $link) {
                $queue[] = $link->id;
            }
        }

        return array_values($found);
    }

    protected function validateShape(array $commands): void
    {
        $max = (int) config('plan-block.max_commands_per_request', 100);

        if ($commands === [] || ! array_is_list($commands)) {
            throw CommandRejected::because('invalid_command', 'Send a non-empty list of commands.');
        }

        if (count($commands) > $max) {
            throw CommandRejected::because('invalid_command', "Send at most {$max} commands per request.");
        }

        foreach ($commands as $index => $command) {
            $id = is_array($command) && isset($command['id']) && is_scalar($command['id']) ? (string) $command['id'] : (string) $index;

            $valid = is_array($command)
                && is_string($command['type'] ?? null)
                && isset(self::ACTIONS[$command['type']])
                && is_string($command['block'] ?? null)
                && Str::isUlid($command['block'])
                && (! isset($command['args']) || is_array($command['args']));

            if (! $valid) {
                throw (CommandRejected::because('invalid_command', 'Each command needs a known "type", a ULID "block" and optional "args" object.'))->forCommand($id);
            }
        }
    }
}
