<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $postulantes = DB::table('postulantes')->select('id', 'ci', 'codigo_usuario')->get();

        foreach ($postulantes as $p) {
            $expected = '2026' . strrev(trim($p->ci));
            if ($p->codigo_usuario !== $expected) {
                DB::table('postulantes')
                    ->where('id', $p->id)
                    ->update(['codigo_usuario' => $expected]);
            }
        }
    }

    public function down(): void
    {
        // No hay forma de revertir un recálculo sin conocer los valores originales
    }
};
