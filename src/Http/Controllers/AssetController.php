<?php

namespace Tohawk89\PlanBlock\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tohawk89\PlanBlock\PlanBlockManager;

/**
 * Serves the prebuilt script and stylesheet, so Blade and Livewire apps
 * need no npm build. URLs carry a content hash (?id=...), so they can be
 * cached forever and change when the package is updated.
 */
class AssetController
{
    private const TYPES = [
        'plan-block.js' => 'application/javascript; charset=utf-8',
        'plan-block.css' => 'text/css; charset=utf-8',
    ];

    public function __invoke(Request $request, string $file, PlanBlockManager $planBlock): BinaryFileResponse
    {
        abort_unless(isset(self::TYPES[$file]), 404);

        $path = $planBlock->assetPath($file);
        abort_unless(is_file($path), 404);

        $versioned = $request->query('id') === $planBlock->assetHash($file);

        $response = new BinaryFileResponse($path, 200, [
            'Content-Type' => self::TYPES[$file],
            'Cache-Control' => $versioned ? 'public, max-age=31536000, immutable' : 'public, no-cache',
        ], public: true, autoEtag: true, autoLastModified: true);

        $response->isNotModified($request);

        return $response;
    }
}
