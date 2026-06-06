<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar duplicados en email (conservar el registro más antiguo)
        DB::statement("
            DELETE FROM postulantes
            WHERE id NOT IN (
                SELECT MIN(id) FROM postulantes
                WHERE email IS NOT NULL
                GROUP BY email
            )
            AND email IS NOT NULL
        ");

        // Eliminar duplicados en celular (conservar el registro más antiguo)
        DB::statement("
            DELETE FROM postulantes
            WHERE id NOT IN (
                SELECT MIN(id) FROM postulantes
                WHERE celular IS NOT NULL
                GROUP BY celular
            )
            AND celular IS NOT NULL
        ");

        Schema::table('postulantes', function (Blueprint $table) {
            // PostgreSQL permite múltiples NULLs en columnas unique, por lo que es seguro aquí
            $table->unique('email');
            $table->unique('celular');
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->dropUnique(['celular']);
        });
    }
};
