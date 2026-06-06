<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asistencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('materia_id')->constrained('materias')->onDelete('cascade');
            $table->foreignId('docente_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->date('fecha');
            $table->enum('estado', ['presente', 'ausente', 'licencia'])->default('presente');
            $table->timestamps();
            // Un solo registro por estudiante, materia, grupo y fecha
            $table->unique(['grupo_id', 'materia_id', 'postulante_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asistencias');
    }
};
