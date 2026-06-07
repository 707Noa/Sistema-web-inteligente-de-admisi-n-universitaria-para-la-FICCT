<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('cascade');
            $table->foreignId('docente_id')->constrained('users')->onDelete('cascade');
            $table->decimal('nota_1', 5, 2)->nullable();
            $table->decimal('nota_2', 5, 2)->nullable();
            $table->decimal('nota_3', 5, 2)->nullable();
            $table->decimal('promedio', 5, 2)->nullable();
            $table->timestamps();

            // Un postulante solo puede tener una entrada de notas por grupo y materia
            $table->unique(['postulante_id', 'grupo_id', 'materia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas');
    }
};
