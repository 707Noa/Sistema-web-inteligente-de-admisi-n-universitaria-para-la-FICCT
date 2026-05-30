<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Services;

use App\Models\Auditoria;
use Illuminate\Http\Request;

class AuditoriaService
{
    public static function registrar(
        ?int $userId,
        string $accion,
        string $modulo,
        ?Request $request = null,
        ?string $detalles = null
    ): Auditoria {
        return Auditoria::create([
            'user_id' => $userId,
            'accion' => $accion,
            'modulo' => $modulo,
            'fecha' => now()->toDateString(),
            'hora' => now()->toTimeString(),
            'ip' => $request ? $request->ip() : '0.0.0.0',
            'detalles' => $detalles,
        ]);
    }
}
