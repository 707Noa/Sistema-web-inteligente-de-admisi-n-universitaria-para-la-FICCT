<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupo_postulante', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grupo_id')->constrained('grupos')->onDelete('cascade');
            $table->foreignId('postulante_id')->constrained('postulantes')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['grupo_id', 'postulante_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupo_postulante');
    }
};
