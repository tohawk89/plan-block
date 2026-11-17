<?php

namespace Tohawk89\PlanBlock\Listeners;

use Throwable;
use Tohawk89\PlanBlock\Events\PlanChanged;
use Tohawk89\PlanBlock\Events\PlanUpdated;

class BroadcastPlanChanges
{
    public function handle(PlanChanged $event): void
    {
        if (! config('plan-block.broadcasting.enabled', false)) {
            return;
        }

        // The change is already saved. A broadcaster that is down must not
        // turn that into a failed request: report it and carry on (clients
        // catch up on their next message or reconnect).
        try {
            $pending = broadcast(PlanUpdated::for($event->plan, $event->result));

            // Skip the sender's own socket when the request carried
            // X-Socket-ID (the JS client sends it when Echo is on the page).
            if (request()->hasHeader('X-Socket-ID')) {
                $pending->toOthers();
            }

            // PendingBroadcast sends when destroyed: do it inside the try.
            unset($pending);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
