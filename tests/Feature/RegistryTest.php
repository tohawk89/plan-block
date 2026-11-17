<?php

use Tohawk89\PlanBlock\Exceptions\CommandRejected;
use Tohawk89\PlanBlock\Exceptions\LockedBlockType;
use Tohawk89\PlanBlock\Facades\PlanBlock;
use Tohawk89\PlanBlock\Fields\Field;
use Tohawk89\PlanBlock\Guards\CheckGuard;
use Tohawk89\PlanBlock\Models\Block;
use Tohawk89\PlanBlock\Types\BlockType;
use Tohawk89\PlanBlock\Types\BuiltIn\TimelineType;

class HotelBlock extends BlockType
{
    public static string $key = 'hotel';

    public function label(): string
    {
        return 'Hotel';
    }

    public function fields(): array
    {
        return [
            Field::text('name')->required(),
            Field::select('status', ['booked' => 'Booked', 'pending' => 'Pending'])->default('pending'),
        ];
    }

    public function checkGuards(): array
    {
        return [MustBeBooked::class];
    }
}

class MustBeBooked implements CheckGuard
{
    public function check(Block $block, $user): void
    {
        if ($block->payload('status') !== 'booked') {
            throw CommandRejected::because('not_booked', 'Book the hotel first.');
        }
    }
}

it('registers custom content types that work inside days', function () {
    PlanBlock::register(HotelBlock::class);
    $plan = makePlan();
    [$day, $hotel] = [id(), id()];

    $plan->commands()
        ->create('timeline', id: $day)
        ->create('hotel', $day, payload: ['name' => 'Seaview'], id: $hotel)
        ->run();

    expect(state($plan, $hotel)['payload'])->toBe(['name' => 'Seaview', 'status' => 'pending'])
        ->and(state($plan, $day)['progress']['total'])->toBe(1);
});

it('runs check guards from the type definition', function () {
    PlanBlock::register(HotelBlock::class);
    $plan = makePlan();
    [$day, $hotel] = [id(), id()];
    $plan->commands()
        ->create('timeline', id: $day)
        ->create('hotel', $day, payload: ['name' => 'Seaview'], id: $hotel)
        ->run();

    expect(rejected(fn () => $plan->commands()->check($hotel)->run())->reason)->toBe('not_booked');

    $plan->commands()->update($hotel, ['status' => 'booked'])->check($hotel)->run();
    expect(block($hotel)->checked_at)->not->toBeNull();
});

it('extends a built-in content type with a field and renderer', function () {
    PlanBlock::extend('place', fn ($type) => $type
        ->addField(Field::number('budget')->min(0))
        ->renderer('blade', 'app.place'));

    $manifest = PlanBlock::manifest()['types']['place'];

    expect(collect($manifest['fields'])->pluck('name')->all())->toContain('budget')
        ->and($manifest['renderers']['blade'])->toBe('app.place');
});

it('locks structural types', function () {
    expect(fn () => PlanBlock::register(new class extends BlockType
    {
        public static string $key = 'timeline';

        public function label(): string
        {
            return 'Fake day';
        }
    }))->toThrow(LockedBlockType::class);

    expect(fn () => PlanBlock::extend('timeline', fn ($type) => $type->addField(Field::text('x'))))
        ->toThrow(LockedBlockType::class);

    PlanBlock::extend('timeline', fn ($type) => $type->renderer('js', 'my-day'));
    expect(PlanBlock::types()->get('timeline'))->toBeInstanceOf(TimelineType::class);
});
