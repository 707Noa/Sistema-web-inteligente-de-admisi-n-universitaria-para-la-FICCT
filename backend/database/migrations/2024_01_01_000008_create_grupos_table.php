<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_grupo');
            $table->integer('capacidad_maxima')->default(70);
            $table->foreignId('docente_id')->nullable()->constrained('docentes')->onDelete('set null');
            $table->foreignId('materia_id')->nullable()->constrained('materias')->onDelete('set null');
            $table->string('aula')->nullable();
            $table->string('horario')->nullable();
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};
