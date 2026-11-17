<?php

namespace Tohawk89\PlanBlock;

use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\HtmlString;
use Tohawk89\PlanBlock\Commands\CommandBus;
use Tohawk89\PlanBlock\Commands\PendingCommands;
use Tohawk89\PlanBlock\Events\PlanUpdated;
use Tohawk89\PlanBlock\Models\Plan;
use Tohawk89\PlanBlock\Support\PlanTree;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

/**
 * Entry point behind the PlanBlock facade.
 */
class PlanBlockManager
{
    public const MANIFEST_VERSION = 1;

    public function __construct(
        protected BlockTypeRegistry $types,
        protected CommandBus $bus,
    ) {}

    /**
     * Register one or more custom content block type classes.
     *
     * @param  class-string<BlockType>|BlockType|array<int, class-string<BlockType>|BlockType>  $types
     */
    public function register(string|BlockType|array $types): void
    {
        $this->types->register($types);
    }

    /**
     * Modify a registered block type, e.g. add a field or swap a renderer.
     */
    public function extend(string $key, Closure $callback): void
    {
        $this->types->extend($key, $callback);
    }

    public function types(): BlockTypeRegistry
    {
        return $this->types;
    }

    /**
     * The manifest every frontend adapter reads.
     */
    public function manifest(): array
    {
        return [
            'version' => self::MANIFEST_VERSION,
            'types' => $this->types->manifest(),
            'realtime' => [
                'enabled' => (bool) config('plan-block.broadcasting.enabled', false),
                'channel_prefix' => PlanUpdated::CHANNEL_PREFIX,
                'event' => PlanUpdated::EVENT,
            ],
        ];
    }

    /**
     * Start a batch of commands against a plan, run with ->run().
     */
    public function commands(Plan $plan, ?Authenticatable $user = null): PendingCommands
    {
        return new PendingCommands($this->bus, $plan, $user);
    }

    public function tree(Plan $plan): PlanTree
    {
        return PlanTree::load($plan);
    }

    /**
     * Plan, blocks and manifest in the shape the JS client starts from.
     * Pass it as a prop (e.g. Inertia) to show the editor without requests:
     *
     *   Gate::authorize('plan-block.view', $plan);
     *   return Inertia::render('Trip', ['planBlock' => PlanBlock::initialData($plan)]);
     *
     * Does not check permissions: authorize before exposing it.
     */
    public function initialData(Plan $plan, ?PlanTree $tree = null): array
    {
        $tree ??= PlanTree::load($plan);

        return [
            'plan' => $tree->serializePlan(),
            'blocks' => $tree->serializeAll(),
            'manifest' => $this->manifest(),
        ];
    }

    // ---- Assets ------------------------------------------------------------

    /** @var array<string, string> */
    protected array $assetHashes = [];

    public function assetPath(string $file): string
    {
        return dirname(__DIR__).'/resources/dist/'.$file;
    }

    /**
     * Short content hash, used as a cache-busting query string.
     */
    public function assetHash(string $file): string
    {
        return $this->assetHashes[$file] ??= substr((string) @md5_file($this->assetPath($file)), 0, 12);
    }

    public function assetUrl(string $file): string
    {
        return route('plan-block.assets', ['file' => $file, 'id' => $this->assetHash($file)]);
    }

    /**
     * The <script> tag for @planBlockAssets. The component injects its own
     * styles; pass ['css' => true] to also add a <link> (for no-styles setups
     * that want the default sheet as a file).
     *
     * @param  array{nonce?: string|null, css?: bool}  $options
     */
    public function assets(array $options = []): HtmlString
    {
        // Reuse the app's CSP nonce when it uses Vite::useCspNonce().
        $nonce = $options['nonce'] ?? (class_exists(\Illuminate\Foundation\Vite::class) ? Vite::cspNonce() : null);
        $nonceAttr = $nonce ? ' nonce="'.e($nonce).'"' : '';

        $html = '<script src="'.e($this->assetUrl('plan-block.js')).'" defer data-navigate-once'.$nonceAttr.'></script>';

        if ($options['css'] ?? false) {
            $html = '<link rel="stylesheet" href="'.e($this->assetUrl('plan-block.css')).'"'.$nonceAttr.'>'.$html;
        }

        return new HtmlString($html);
    }
}
