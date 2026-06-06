<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admision_resultados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->string('gestion', 20);

            // Promedios por materia obligatoria
            $table->decimal('promedio_computacion', 5, 2)->nullable();
            $table->decimal('promedio_matematicas', 5, 2)->nullable();
            $table->decimal('promedio_ingles', 5, 2)->nullable();
            $table->decimal('promedio_fisica', 5, 2)->nullable();

            // Resultado global
            $table->decimal('promedio_final', 5, 2)->nullable();
            $table->string('estado_academico', 20)->default('pendiente'); // aprobado | reprobado | pendiente

            // Carreras del postulante (copiadas al momento de procesar)
            $table->string('primera_carrera', 191)->nullable();
            $table->string('segunda_carrera', 191)->nullable();

            // Resultado de admisión
            $table->string('carrera_admitida', 191)->nullable();
            $table->string('estado_admision', 30)->default('pendiente');
            // admitido_primera | admitido_segunda | aprobado_sin_cupo | reprobado | pendiente

            $table->text('motivo')->nullable();
            $table->timestamps();

            // Un resultado por postulante por gestión
            $table->unique(['postulante_id', 'gestion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admision_resultados');
    }
};
