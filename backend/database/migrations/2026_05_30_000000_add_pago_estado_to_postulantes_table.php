<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            if (!Schema::hasColumn('postulantes', 'pago_estado')) {
                $table->string('pago_estado')->default('PENDIENTE');
            }
            if (!Schema::hasColumn('postulantes', 'pago_metodo')) {
                $table->string('pago_metodo')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'pago_referencia')) {
                $table->string('pago_referencia')->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'pago_monto')) {
                $table->decimal('pago_monto', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'pago_moneda')) {
                $table->string('pago_moneda', 10)->nullable();
            }
            if (!Schema::hasColumn('postulantes', 'pago_fecha')) {
                $table->timestamp('pago_fecha')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('postulantes', function (Blueprint $table) {
            $columns = [
                'pago_estado', 'pago_metodo', 'pago_referencia', 'pago_monto', 'pago_moneda', 'pago_fecha'
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('postulantes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
