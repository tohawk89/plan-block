<?php

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Livewire\Livewire;
use Tohawk89\PlanBlock\Events\PlanChanged;
use Tohawk89\PlanBlock\Livewire\PlanBlockEditor;

/** The value a Livewire action returned (works on Livewire 3 and 4). */
function returned($component): mixed
{
    return data_get($component->effects, 'returns.0');
}

it('registers <livewire:plan-block> and renders the editor wired to Livewire', function () {
    [$owner, $plan] = samplePlan();
    $this->actingAs($owner);

    $html = Blade::render('<livewire:plan-block :plan="$plan" />', ['plan' => $plan]);

    expect($html)
        ->toContain('wire:ignore')
        ->toContain('<plan-block plan="'.$plan->ulid.'"')
        ->toContain('transport="livewire"')
        ->toContain('data-pb-initial')
        ->toContain('data-pb-fallback');
});

it('runs commands through the component and announces the change', function () {
    [$owner, $plan, $ids] = samplePlan();
    $this->actingAs($owner);
    Event::fake([PlanChanged::class]);

    $component = Livewire::test(PlanBlockEditor::class, ['plan' => $plan])
        ->call('runCommands', [['id' => 'c1', 'type' => 'check', 'block' => $ids['museum']]], $plan->version);

    $result = returned($component);

    expect($result['ok'])->toBeTrue()
        ->and($result['version'])->toBe($plan->version + 1)
        ->and(collect($result['blocks'])->pluck('id'))->toContain($ids['museum'], $ids['pool'], $ids['day2'])
        ->and(block($ids['museum'])->checked_by)->toBe((string) $owner->id);

    $component->assertDispatched('plan-block-changed', plan: $plan->ulid, version: $plan->version + 1);
    Event::assertDispatched(PlanChanged::class);
});

it('returns rejections as data, without changing anything', function () {
    [$owner, $plan, $ids] = samplePlan();
    $this->actingAs($owner);

    $component = Livewire::test(PlanBlockEditor::class, ['plan' => $plan])
        ->call('runCommands', [['id' => 'bad', 'type' => 'check', 'block' => $ids['day']]]);

    expect(returned($component))->toMatchArray([
        'ok' => false,
        'error' => ['command' => 'bad', 'reason' => 'not_checkable', 'message' => 'Use check_all / uncheck_all for a whole day.'],
    ]);
    $component->assertNotDispatched('plan-block-changed');
});

it('reports what a delete would also remove', function () {
    [$owner, $plan, $ids] = samplePlan();
    $this->actingAs($owner);

    $impact = returned(Livewire::test(PlanBlockEditor::class, ['plan' => $plan])->call('deleteImpact', $ids['museum']));

    expect($impact['links'])->toHaveCount(1)
        ->and($impact['links'][0]['parent'])->toBe($ids['day2']);
});

it('serves plan data for reloads', function () {
    [$owner, $plan] = samplePlan();
    $this->actingAs($owner);

    $data = returned(Livewire::test(PlanBlockEditor::class, ['plan' => $plan])->call('planData'));

    expect($data['plan']['id'])->toBe($plan->ulid)
        ->and($data['blocks'])->toHaveCount(7)
        ->and($data['manifest']['types'])->toHaveKey('place');
});

it('refuses users who may not view the plan', function () {
    [, $plan] = samplePlan();
    $this->actingAs(makeUser());

    Livewire::test(PlanBlockEditor::class, ['plan' => $plan])->assertForbidden();
});

it('refuses commands from users who may only view', function () {
    [, $plan, $ids] = samplePlan();
    $viewer = makeUser();
    $this->actingAs($viewer);
    Gate::define('plan-block.view', fn () => true);

    Livewire::test(PlanBlockEditor::class, ['plan' => $plan])
        ->call('runCommands', [['type' => 'check', 'block' => $ids['museum']]])
        ->assertForbidden();

    expect(block($ids['museum'])->checked_at)->toBeNull();
});

it('rejects commands when mounted read-only, even for editors', function () {
    [$owner, $plan, $ids] = samplePlan();
    $this->actingAs($owner);

    $component = Livewire::test(PlanBlockEditor::class, ['plan' => $plan, 'readonly' => true])
        ->call('runCommands', [['type' => 'check', 'block' => $ids['museum']]]);

    expect(returned($component)['error']['reason'])->toBe('forbidden')
        ->and(block($ids['museum'])->checked_at)->toBeNull();
});
