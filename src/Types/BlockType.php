<?php

namespace Tohawk89\PlanBlock\Types;

use Tohawk89\PlanBlock\Exceptions\LockedBlockType;
use Tohawk89\PlanBlock\Fields\Field;

/**
 * Defines what a block is, what it holds, where it may go and how it renders.
 * Behaviour (saving, checking, linking) always runs through package code.
 */
abstract class BlockType
{
    public static string $key;

    /** @var array<int, Field> */
    private array $extraFields = [];

    /** @var array<string, string> */
    private array $rendererOverrides = [];

    public function key(): string
    {
        return static::$key;
    }

    abstract public function label(): string;

    public function icon(): ?string
    {
        return null;
    }

    /**
     * Payload fields.
     *
     * @return array<int, Field>
     */
    public function fields(): array
    {
        return [];
    }

    /**
     * Parent types this block may be placed in. Null means any parent whose
     * children() rule permits it.
     *
     * @return array<int, string>|null
     */
    public function parents(): ?array
    {
        return null;
    }

    public function children(): Children
    {
        return Children::none();
    }

    /**
     * Host model classes this block may attach to.
     *
     * @return array<int, class-string>
     */
    public function attachable(): array
    {
        return [];
    }

    /**
     * Guard classes run before this block is checked.
     *
     * @return array<int, class-string<\Tohawk89\PlanBlock\Guards\CheckGuard>>
     */
    public function checkGuards(): array
    {
        return [];
    }

    /**
     * Renderer name per adapter. Defaults to the package's own renderers.
     *
     * @return array<string, string>
     */
    public function renderers(): array
    {
        return [
            'blade' => 'plan-block::blocks.'.$this->key(),
            'js' => $this->key(),
        ];
    }

    /** Structural types (day, pool, link) are locked: only renderers can change. */
    public function structural(): bool
    {
        return false;
    }

    /** May sit at the top level of a plan. */
    public function allowedAtRoot(): bool
    {
        return false;
    }

    /** Has its own checkbox. */
    public function checkable(): bool
    {
        return true;
    }

    /** Counts towards its parent group's progress. */
    public function countable(): bool
    {
        return true;
    }

    public function groupRule(): GroupRule
    {
        return GroupRule::None;
    }

    final public function addField(Field $field): static
    {
        if ($this->structural()) {
            throw LockedBlockType::fields($this->key());
        }

        $this->extraFields[] = $field;

        return $this;
    }

    final public function renderer(string $adapter, string $name): static
    {
        $this->rendererOverrides[$adapter] = $name;

        return $this;
    }

    /**
     * Declared fields plus fields added through extend(). Later fields with
     * the same name replace earlier ones.
     *
     * @return array<int, Field>
     */
    final public function resolvedFields(): array
    {
        $fields = [];

        foreach ([...$this->fields(), ...$this->extraFields] as $field) {
            $fields[$field->name] = $field;
        }

        return array_values($fields);
    }

    /**
     * @return array<string, string>
     */
    final public function resolvedRenderers(): array
    {
        return [...$this->renderers(), ...$this->rendererOverrides];
    }

    public function toManifest(): array
    {
        return [
            'key' => $this->key(),
            'label' => $this->label(),
            'icon' => $this->icon(),
            'structural' => $this->structural(),
            'root' => $this->allowedAtRoot(),
            'checkable' => $this->checkable(),
            'countable' => $this->countable(),
            'rule' => $this->groupRule()->value,
            'fields' => array_map(fn (Field $field) => $field->toManifest(), $this->resolvedFields()),
            'parents' => $this->parents(),
            'children' => $this->children()->toArray(),
            'renderers' => $this->resolvedRenderers(),
        ];
    }
}
