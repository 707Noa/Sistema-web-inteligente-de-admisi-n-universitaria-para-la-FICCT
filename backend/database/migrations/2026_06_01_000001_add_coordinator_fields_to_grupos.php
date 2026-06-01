<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            if (!Schema::hasColumn('grupos', 'codigo')) {
                $table->string('codigo', 10)->unique()->nullable();
            }
            if (!Schema::hasColumn('grupos', 'turno')) {
                $table->enum('turno', ['mañana', 'tarde', 'noche'])->nullable();
            }
            if (!Schema::hasColumn('grupos', 'dias')) {
                $table->json('dias')->nullable(); // ['lunes','miercoles','viernes']
            }
            if (!Schema::hasColumn('grupos', 'cupo_maximo')) {
                $table->unsignedSmallInteger('cupo_maximo')->default(40);
            }
        });
    }

    public function down(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            foreach (['codigo', 'turno', 'dias', 'cupo_maximo'] as $col) {
                if (Schema::hasColumn('grupos', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
