<?php

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\View;
use Tohawk89\PlanBlock\Facades\PlanBlock;
use Tohawk89\PlanBlock\PlanBlockManager;

/** The JSON embedded in the rendered component. */
function embedded(string $html): array
{
    preg_match('#<script type="application/json" data-pb-initial>(.*?)</script>#s', $html, $match);

    return json_decode($match[1] ?? 'null', true);
}

describe('assets', function () {
    it('serves the prebuilt script with long caching when versioned', function () {
        $hash = app(PlanBlockManager::class)->assetHash('plan-block.js');

        $this->get("/plan-block/assets/plan-block.js?id={$hash}")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/javascript; charset=utf-8')
            ->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');

        $this->get('/plan-block/assets/plan-block.css')
            ->assertOk()
            ->assertHeader('Content-Type', 'text/css; charset=utf-8')
            ->assertHeader('Cache-Control', 'no-cache, public');
    });

    it('serves assets to guests and nothing else', function () {
        $this->get('/plan-block/assets/plan-block.js')->assertOk();
        $this->get('/plan-block/assets/composer.json')->assertNotFound();
        $this->get('/plan-block/assets/..%2Fcomposer.json')->assertNotFound();
    });

    it('answers conditional requests with 304', function () {
        $etag = $this->get('/plan-block/assets/plan-block.js')->headers->get('ETag');

        $this->get('/plan-block/assets/plan-block.js', ['If-None-Match' => $etag])->assertStatus(304);
    });

    it('renders @planBlockAssets with a hashed URL and an optional nonce and stylesheet', function () {
        $hash = app(PlanBlockManager::class)->assetHash('plan-block.js');

        expect(Blade::render('@planBlockAssets'))
            ->toContain('<script src="'.url('/plan-block/assets/plan-block.js').'?id='.$hash.'" defer data-navigate-once></script>')
            ->and(Blade::render("@planBlockAssets(['nonce' => 'abc123', 'css' => true])"))
            ->toContain('nonce="abc123"')
            ->toContain('rel="stylesheet" href="'.url('/plan-block/assets/plan-block.css').'?id=');
    });
});

describe('<x-plan-block>', function () {
    it('outputs the element with the plan data embedded', function () {
        [$owner, $plan, $ids] = samplePlan();
        $this->actingAs($owner);

        $html = Blade::render('<x-plan-block :plan="$plan" class="my-plan" />', ['plan' => $plan]);
        $data = embedded($html);

        expect($html)
            ->toContain('<plan-block plan="'.$plan->ulid.'" endpoint="'.url('/plan-block').'" class="my-plan">')
            ->and($data['plan']['id'])->toBe($plan->ulid)
            ->and(collect($data['blocks'])->pluck('id'))->toContain($ids['breakfast'], $ids['museum'])
            ->and($data['manifest']['types'])->toHaveKeys(['timeline', 'place'])
            ->and($data)->toEqual(json_decode(json_encode([
                'plan' => $plan->tree()->serializePlan(),
                'blocks' => $plan->tree()->serializeAll(),
                'manifest' => PlanBlock::manifest(),
            ]), true));
    });

    it('embeds the same data PlanBlock::initialData() gives (e.g. for Inertia props)', function () {
        [$owner, $plan] = samplePlan();
        $this->actingAs($owner);

        $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

        expect(embedded($html))->toEqual(json_decode(json_encode(PlanBlock::initialData($plan)), true));
    });

    it('escapes embedded JSON so it cannot close the script tag', function () {
        [$owner, $plan, $ids] = samplePlan();
        $plan->commands()->update($ids['breakfast'], ['notes' => '</script><script>alert(1)</script>'])->run();
        $this->actingAs($owner);

        $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

        expect($html)->not->toContain('</script><script>alert(1)');
        expect(collect(embedded($html)['blocks'])->firstWhere('id', $ids['breakfast'])['payload']['notes'])
            ->toBe('</script><script>alert(1)</script>');
    });

    it('renders a read-only server copy with days, items, backups and links', function () {
        [$owner, $plan, $ids] = samplePlan();
        $this->actingAs($owner);

        $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

        expect($html)
            ->toContain('data-pb-fallback')
            ->toContain('Day 1')
            ->toContain('Tue 1 Dec')
            ->toContain('Breakfast &lt;b&gt;')
            ->toContain('done via backup')
            ->toContain('data-pb-key="'.$ids['museum'].'"')
            ->toContain('↗ linked')
            ->toContain('0 of 1 done')
            ->toContain('1/1');

        // The pool item and its linked copy on Day 2.
        expect(substr_count($html, 'class="pb-title">Museum<'))->toBe(2);
    });

    it('accepts a plan ULID and the readonly, shadow and no-styles options', function () {
        [$owner, $plan] = samplePlan();
        $this->actingAs($owner);

        $html = Blade::render('<x-plan-block plan="'.$plan->ulid.'" readonly shadow no-styles :fallback="false" />');

        expect($html)
            ->toContain('readonly="readonly"')
            ->toContain('shadow="shadow"')
            ->toContain('no-styles="no-styles"')
            ->not->toContain('data-pb-fallback')
            ->not->toContain('rel="stylesheet"');
    });

    it('embeds nothing for users who may not view the plan', function () {
        [, $plan] = samplePlan();
        $this->actingAs(makeUser());

        $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

        expect($html)->toContain('<plan-block')
            ->not->toContain('data-pb-initial')
            ->not->toContain('Breakfast');
    });

    it('uses a custom Blade view registered for a type', function () {
        [$owner, $plan] = samplePlan();
        $this->actingAs($owner);
        View::addNamespace('app', __DIR__.'/../Fixtures/views');

        PlanBlock::extend('place', fn ($type) => $type->renderer('blade', 'app::custom-place'));

        $html = Blade::render('<x-plan-block :plan="$plan" />', ['plan' => $plan]);

        expect($html)->toContain('<article class="custom-place">Breakfast &lt;b&gt;</article>')
            ->toContain('<article class="custom-place">Museum</article>');
    });
});
