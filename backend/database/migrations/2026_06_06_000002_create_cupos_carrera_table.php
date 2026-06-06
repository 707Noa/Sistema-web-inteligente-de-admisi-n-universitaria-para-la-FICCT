<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupos_carrera', function (Blueprint $table) {
            $table->id();
            $table->string('carrera', 191);
            $table->string('gestion', 20);          // e.g. "2026-I"
            $table->unsignedInteger('cupo_maximo');
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
            $table->unique(['carrera', 'gestion']);  // una sola definición por carrera/gestión
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupos_carrera');
    }
};
