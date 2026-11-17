<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Models\Plan;

class CommandController
{
    public function __invoke(Request $request, Plan $plan, CommandBus $bus): JsonResponse
    {
        Gate::authorize('plan-block.edit', $plan);

        $data = $request->validate([
            'base_version' => ['nullable', 'integer'],
            'commands' => ['required', 'array'],
        ]);

        try {
            $result = $bus->run($plan, $data['commands'], $data['base_version'] ?? null, $request->user());
        } catch (CommandRejected $e) {
            return response()->json(['ok' => false, 'error' => $e->toArray()], 422);
        }

        return response()->json(['ok' => true, ...$result->toArray()]);
    }
}
