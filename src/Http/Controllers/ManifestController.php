<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Tohawk89\PlanBlock\PlanBlockManager;

class ManifestController
{
    public function __invoke(PlanBlockManager $planBlock): JsonResponse
    {
        return response()->json($planBlock->manifest());
    }
}
