<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preinscripciones', function (Blueprint $table) {
            $table->id();
            $table->string('numero_formulario')->unique();
            // Datos personales
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('ci', 20)->unique();
            $table->enum('genero', ['masculino', 'femenino', 'otro'])->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('celular', 20)->nullable();
            $table->string('segundo_celular', 20)->nullable();
            $table->string('email');
            $table->text('direccion')->nullable();
            // Datos de unidad educativa
            $table->string('unidad_educativa')->nullable();
            $table->string('tipo_colegio')->nullable();
            $table->string('turno')->nullable();
            $table->string('provincia')->nullable();
            $table->string('anio_egreso', 4)->nullable();
            // QR y estado
            $table->string('codigo_qr')->nullable();
            $table->boolean('declaracion_jurada')->default(false);
            $table->enum('estado', ['pendiente', 'verificado', 'rechazado'])->default('pendiente');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preinscripciones');
    }
};
