<?php

namespace Tohawk89\PlanBlock\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BlockTypeRegistry;

/**
 * Blocks are only changed through commands (see CommandBus), never directly,
 * so linked copies, group progress and the plan version stay consistent.
 *
 * @property int $id
 * @property string $ulid
 * @property int $plan_id
 * @property int|null $parent_id
 * @property string $block_type
 * @property int $order_column
 * @property int|null $source_block_id
 * @property array|null $payload
 * @property \Illuminate\Support\Carbon|null $checked_at
 * @property string|null $checked_by
 * @property \Illuminate\Support\Carbon|null $excluded_at
 * @property string|null $delete_batch
 */
class Block extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'payload' => 'array',
        'order_column' => 'integer',
        'checked_at' => 'datetime',
        'excluded_at' => 'datetime',
    ];

    public function getTable(): string
    {
        return config('plan-block.tables.blocks', 'plan_block_blocks');
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('order_column')->orderBy('id');
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_block_id');
    }

    public function links(): HasMany
    {
        return $this->hasMany(self::class, 'source_block_id');
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function type(): BlockType
    {
        return app(BlockTypeRegistry::class)->get($this->block_type);
    }

    public function isLink(): bool
    {
        return $this->block_type === 'link';
    }

    public function isChecked(): bool
    {
        return $this->checked_at !== null;
    }

    public function isExcluded(): bool
    {
        return $this->excluded_at !== null;
    }

    /**
     * Read a payload value, falling back to the field's declared default.
     */
    public function payload(string $key, mixed $default = null): mixed
    {
        $payload = $this->payload ?? [];

        if (array_key_exists($key, $payload)) {
            return $payload[$key];
        }

        foreach ($this->type()->resolvedFields() as $field) {
            if ($field->name === $key && $field->getDefault() !== null) {
                return $field->getDefault();
            }
        }

        return $default;
    }
}
