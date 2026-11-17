<?php

namespace Workbench\App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tohawk89\PlanBlock\Concerns\HasPlans;

class User extends Authenticatable
{
    use HasPlans;

    protected $guarded = [];

    protected $hidden = ['password', 'remember_token'];
}
