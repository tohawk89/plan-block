<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $plans = config('plan-block.tables.plans', 'plan_block_plans');
        $blocks = config('plan-block.tables.blocks', 'plan_block_blocks');

        Schema::create($plans, function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26)->unique();
            // String morph columns so hosts with int, UUID or ULID keys all work.
            $table->string('owner_type')->nullable();
            $table->string('owner_id')->nullable();
            $table->string('title');
            $table->date('start_date')->nullable();
            $table->unsignedInteger('version')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['owner_type', 'owner_id']);
        });

        Schema::create($blocks, function (Blueprint $table) use ($plans, $blocks) {
            $table->id();
            $table->char('ulid', 26)->unique();
            $table->foreignId('plan_id')->constrained($plans)->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained($blocks)->cascadeOnDelete();
            $table->string('block_type', 64);
            $table->integer('order_column')->default(0);
            $table->foreignId('source_block_id')->nullable()->constrained($blocks)->cascadeOnDelete();
            $table->string('attachable_type')->nullable();
            $table->string('attachable_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->string('checked_by', 64)->nullable();
            $table->timestamp('excluded_at')->nullable();
            // Groups blocks soft-deleted together so they restore together.
            $table->char('delete_batch', 26)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['plan_id', 'parent_id', 'order_column']);
            $table->index(['attachable_type', 'attachable_id']);
            $table->index('delete_batch');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config('plan-block.tables.blocks', 'plan_block_blocks'));
        Schema::dropIfExists(config('plan-block.tables.plans', 'plan_block_plans'));
    }
};
