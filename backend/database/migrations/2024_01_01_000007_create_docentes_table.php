<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docentes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('ci', 20)->unique();
            $table->string('email')->nullable();
            $table->string('celular', 20)->nullable();
            $table->string('profesion')->nullable();
            $table->boolean('tiene_maestria')->default(false);
            $table->boolean('tiene_diplomado')->default(false);
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docentes');
    }
};
