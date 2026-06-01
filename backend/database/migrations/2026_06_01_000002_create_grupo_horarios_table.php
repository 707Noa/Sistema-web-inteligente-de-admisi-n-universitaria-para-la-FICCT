<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupo_horarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('cascade');
            $table->string('dia', 20); // lunes, martes, miercoles, jueves, viernes, sabado
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();
            $table->unique(['grupo_id', 'materia_id', 'dia']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupo_horarios');
    }
};
