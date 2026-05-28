<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('cascade');
            $table->decimal('nota_1', 5, 2)->nullable();
            $table->decimal('nota_2', 5, 2)->nullable();
            $table->decimal('nota_3', 5, 2)->nullable();
            $table->decimal('promedio', 5, 2)->nullable();
            $table->enum('estado', ['aprobado', 'reprobado', 'pendiente'])->default('pendiente');
            $table->string('carrera_adjudicada')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
