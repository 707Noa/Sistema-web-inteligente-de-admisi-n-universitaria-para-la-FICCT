<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('docente_grupo_asignaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('docente_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('cascade');
            $table->string('dia', 20);
            $table->enum('turno', ['mañana', 'tarde', 'noche']);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
            // Un docente no puede tener dos asignaciones para la misma materia en el mismo grupo
            $table->unique(['grupo_id', 'materia_id', 'dia']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('docente_grupo_asignaciones');
    }
};
