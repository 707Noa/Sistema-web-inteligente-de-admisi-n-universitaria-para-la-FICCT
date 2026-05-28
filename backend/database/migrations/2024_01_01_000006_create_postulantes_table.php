<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postulantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('ci', 20)->unique();
            $table->enum('genero', ['masculino', 'femenino', 'otro'])->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('celular', 20)->nullable();
            $table->string('segundo_celular', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('direccion')->nullable();
            $table->string('carrera_postulada')->nullable();
            $table->string('foto')->nullable();
            $table->string('codigo_qr')->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'aprobado', 'reprobado', 'pendiente'])->default('pendiente');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postulantes');
    }
};
