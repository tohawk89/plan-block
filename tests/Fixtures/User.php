<?php

namespace Tohawk89\PlanBlock\Tests\Fixtures;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tohawk89\PlanBlock\Concerns\HasPlans;

class User extends Authenticatable
{
    use HasPlans;

    protected $table = 'users';

    protected $guarded = [];
}
