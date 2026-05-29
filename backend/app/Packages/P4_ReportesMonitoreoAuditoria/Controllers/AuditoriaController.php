<?php

namespace App\Packages\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Auditoria::with('user');

        if ($request->has('modulo')) {
            $query->where('modulo', $request->modulo);
        }
        if ($request->has('accion')) {
            $query->where('accion', 'ilike', "%{$request->accion}%");
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->fecha_desde);
        }
        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->fecha_hasta);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Auditoria::with('user')->findOrFail($id));
    }
}
