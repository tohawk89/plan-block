<?php

namespace Tohawk89\PlanBlock\Fields;

use Illuminate\Validation\Rule;

/**
 * One payload field. A single definition produces both validation rules
 * and the description adapters use to build a default edit form.
 */
final class Field
{
    private bool $required = false;

    private int|float|null $min = null;

    private int|float|null $max = null;

    private mixed $default = null;

    private ?string $label = null;

    /** @var array<int|string, string> */
    private array $options = [];

    /** @var array<int, mixed> */
    private array $extraRules = [];

    private function __construct(
        public readonly string $type,
        public readonly string $name,
    ) {}

    public static function text(string $name): self
    {
        return new self('text', $name);
    }

    public static function textarea(string $name): self
    {
        return new self('textarea', $name);
    }

    public static function url(string $name): self
    {
        return new self('url', $name);
    }

    public static function number(string $name): self
    {
        return new self('number', $name);
    }

    /** Stored as Y-m-d. */
    public static function date(string $name): self
    {
        return new self('date', $name);
    }

    /** Stored as H:i (24-hour). */
    public static function time(string $name): self
    {
        return new self('time', $name);
    }

    /**
     * @param  array<int|string, string>  $options  list of values, or value => label
     */
    public static function select(string $name, array $options = []): self
    {
        return (new self('select', $name))->options($options);
    }

    public static function toggle(string $name): self
    {
        return new self('toggle', $name);
    }

    public function required(bool $required = true): self
    {
        $this->required = $required;

        return $this;
    }

    /** Minimum length for text fields, minimum value for numbers. */
    public function min(int|float $min): self
    {
        $this->min = $min;

        return $this;
    }

    /** Maximum length for text fields, maximum value for numbers. */
    public function max(int|float $max): self
    {
        $this->max = $max;

        return $this;
    }

    public function default(mixed $value): self
    {
        $this->default = $value;

        return $this;
    }

    public function label(string $label): self
    {
        $this->label = $label;

        return $this;
    }

    /**
     * @param  array<int|string, string>  $options
     */
    public function options(array $options): self
    {
        $this->options = $options;

        return $this;
    }

    /**
     * Escape hatch: any extra Laravel validation rules.
     *
     * @param  array<int, mixed>  $rules
     */
    public function rules(array $rules): self
    {
        $this->extraRules = [...$this->extraRules, ...$rules];

        return $this;
    }

    public function getDefault(): mixed
    {
        return $this->default;
    }

    public function isRequired(): bool
    {
        return $this->required;
    }

    /**
     * @param  bool  $partial  true for updates: only validate fields that are present
     * @return array<int, mixed>
     */
    public function toRules(bool $partial = false): array
    {
        $rules = $this->required
            ? ($partial ? ['sometimes', 'required'] : ['required'])
            : ['nullable'];

        $rules = [...$rules, ...match ($this->type) {
            'text', 'textarea' => ['string'],
            'url' => ['string', 'url'],
            'number' => ['numeric'],
            'date' => ['date_format:Y-m-d'],
            'time' => ['date_format:H:i'],
            'select' => [Rule::in($this->optionValues())],
            'toggle' => ['boolean'],
        }];

        if ($this->min !== null) {
            $rules[] = 'min:'.$this->min;
        }

        if ($this->max !== null) {
            $rules[] = 'max:'.$this->max;
        }

        return [...$rules, ...$this->extraRules];
    }

    public function toManifest(): array
    {
        return array_filter([
            'name' => $this->name,
            'type' => $this->type,
            'label' => $this->label ?? ucfirst(str_replace('_', ' ', $this->name)),
            'required' => $this->required,
            'default' => $this->default,
            'min' => $this->min,
            'max' => $this->max,
            'options' => $this->type === 'select' ? $this->optionList() : null,
        ], fn ($value) => $value !== null);
    }

    /**
     * @return array<int, int|string>
     */
    private function optionValues(): array
    {
        return array_is_list($this->options) ? $this->options : array_keys($this->options);
    }

    /**
     * @return array<int, array{value: int|string, label: string}>
     */
    private function optionList(): array
    {
        $list = [];

        foreach ($this->options as $value => $label) {
            $list[] = array_is_list($this->options)
                ? ['value' => $label, 'label' => (string) $label]
                : ['value' => $value, 'label' => $label];
        }

        return $list;
    }
}
