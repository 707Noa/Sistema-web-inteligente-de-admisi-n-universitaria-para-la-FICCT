<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('preinscripciones_temporales', function (Blueprint $table) {
            $table->id();
            $table->string('ci');
            $table->json('datos_formulario');
            $table->json('documentos_temporales');
            $table->string('stripe_session_id')->nullable()->index();
            $table->string('estado_pago')->default('pendiente'); // pendiente, pagado, cancelado, expirado
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('preinscripciones_temporales');
    }
};
