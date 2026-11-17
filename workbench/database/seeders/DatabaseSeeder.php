<?php

namespace Workbench\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Workbench\App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->create([
            'name' => 'Demo traveller',
            'email' => 'demo@example.test',
            'password' => Hash::make('password'),
        ]);

        $plan = $user->createPlan('Trip to JB', now()->addWeek()->toDateString());
        $c = $plan->commands();

        $day1 = $c->create('timeline')->lastId();
        $breakfast = $c->create('place', $day1, payload: ['name' => 'Breakfast at Hiap Joo', 'time' => '08:00'])->lastId();
        $c->create('backup', $breakfast, payload: ['name' => 'Kopitiam next door']);
        $lunch = $c->create('place', $day1, $breakfast, ['name' => 'Lunch', 'time' => '12:30'])->lastId();
        $c->create('note', $day1, $lunch, ['text' => 'Bring cash for parking']);

        $pool = $c->create('pool', after: $day1, payload: ['label' => 'Places to visit'])->lastId();
        $museum = $c->create('place', $pool, payload: ['name' => 'Sultan Abu Bakar Museum', 'maps_url' => 'https://maps.google.com/?q=Sultan+Abu+Bakar+Museum'])->lastId();
        $c->create('place', $pool, $museum, ['name' => 'Danga Bay']);

        $day2 = $c->create('timeline', after: $pool)->lastId();
        $c->link($museum, $day2);

        $c->run();
    }
}
