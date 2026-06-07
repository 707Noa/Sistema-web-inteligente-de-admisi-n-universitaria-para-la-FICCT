<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (!Schema::hasColumn('postulantes', 'fotografia_path')) {
                $table->string('fotografia_path')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (Schema::hasColumn('postulantes', 'fotografia_path')) {
                $table->dropColumn('fotografia_path');
            }
        });
    }
};
