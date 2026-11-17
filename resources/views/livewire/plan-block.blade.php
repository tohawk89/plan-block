<div wire:ignore>
    {{-- The editor manages its own DOM; Livewire only carries its commands. --}}
    <x-plan-block :plan="$model" :readonly="$readonly" :shadow="$shadow" :no-styles="$noStyles" transport="livewire" />
</div>
