<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Modificaciones a la tabla 'postulantes'
        Schema::table('postulantes', function (Blueprint $table) {
            if (!Schema::hasColumn('postulantes', 'codigo_usuario')) {
                $table->string('codigo_usuario')->nullable()->index();
            }
            if (!Schema::hasColumn('postulantes', 'estado_tramite')) {
                $table->string('estado_tramite')->default('PREINSCRITO');
            }
            if (!Schema::hasColumn('postulantes', 'cuenta_creada_at')) {
                $table->timestamp('cuenta_creada_at')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'correo_enviado_at')) {
                $table->timestamp('correo_enviado_at')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'segundo_telefono')) {
                $table->string('segundo_telefono')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'sexo')) {
                $table->string('sexo')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'colegio_procedencia')) {
                $table->string('colegio_procedencia')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'ciudad')) {
                $table->string('ciudad')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'carrera')) {
                $table->string('carrera')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'titulo_bachiller')) {
                $table->boolean('titulo_bachiller')->default(false);
            }
            if (!Schema::hasColumn('postulantes', 'otros')) {
                $table->text('otros')->nullable();
            }
        });

        // 2. Modificaciones a la tabla 'users'
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'codigo')) {
                $table->string('codigo')->nullable()->unique();
            }
            if (!Schema::hasColumn('users', 'must_change_password')) {
                $table->boolean('must_change_password')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            $columns = [
                'codigo_usuario', 'estado_tramite', 'cuenta_creada_at', 'correo_enviado_at',
                'segundo_telefono', 'sexo', 'colegio_procedencia', 'ciudad', 'carrera',
                'titulo_bachiller', 'otros'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('postulantes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'codigo')) {
                $table->dropColumn('codigo');
            }
            if (Schema::hasColumn('users', 'must_change_password')) {
                $table->dropColumn('must_change_password');
            }
        });
    }
};
