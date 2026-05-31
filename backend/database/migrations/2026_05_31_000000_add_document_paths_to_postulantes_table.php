<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (!Schema::hasColumn('postulantes', 'imagen_ci_path')) {
                $table->string('imagen_ci_path')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'imagen_titulo_bachiller_path')) {
                $table->string('imagen_titulo_bachiller_path')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (Schema::hasColumn('postulantes', 'imagen_ci_path')) {
                $table->dropColumn('imagen_ci_path');
            }
            if (Schema::hasColumn('postulantes', 'imagen_titulo_bachiller_path')) {
                $table->dropColumn('imagen_titulo_bachiller_path');
            }
        });
    }
};
