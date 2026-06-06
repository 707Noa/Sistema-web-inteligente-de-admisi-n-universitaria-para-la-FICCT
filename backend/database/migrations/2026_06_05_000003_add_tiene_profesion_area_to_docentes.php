<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (!Schema::hasColumn('docentes', 'tiene_profesion_area')) {
                $table->boolean('tiene_profesion_area')->default(false)->after('tiene_diplomado');
            }
        });
    }

    public function down(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (Schema::hasColumn('docentes', 'tiene_profesion_area')) {
                $table->dropColumn('tiene_profesion_area');
            }
        });
    }
};
