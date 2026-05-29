<?php

namespace App\Packages\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use App\Models\Examen;
use App\Models\Grupo;
use App\Models\Docente;
use App\Models\Auditoria;
use App\Packages\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    public function postulantes(Request $request): JsonResponse
    {
        $query = Postulante::with(['grupos', 'examenes.materia']);

        if ($request->has('carrera')) {
            $query->where('carrera_postulada', 'ilike', "%{$request->carrera}%");
        }
        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->has('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }
        if ($request->has('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        AuditoriaService::registrar($request->user()->id, 'Generó reporte de postulantes', 'Reportes', $request);

        return response()->json($query->orderBy('apellidos')->get());
    }

    public function aprobados(Request $request): JsonResponse
    {
        $query = Examen::with(['postulante', 'materia'])->where('estado', 'aprobado');

        if ($request->has('materia_id')) {
            $query->where('materia_id', $request->materia_id);
        }

        AuditoriaService::registrar($request->user()->id, 'Generó reporte de aprobados', 'Reportes', $request);

        return response()->json($query->get());
    }

    public function reprobados(Request $request): JsonResponse
    {
        $query = Examen::with(['postulante', 'materia'])->where('estado', 'reprobado');

        if ($request->has('materia_id')) {
            $query->where('materia_id', $request->materia_id);
        }

        AuditoriaService::registrar($request->user()->id, 'Generó reporte de reprobados', 'Reportes', $request);

        return response()->json($query->get());
    }

    public function promedios(Request $request): JsonResponse
    {
        $data = Examen::with(['postulante', 'materia'])
            ->whereNotNull('promedio')
            ->orderBy('promedio', 'desc')
            ->get();

        return response()->json($data);
    }

    public function grupos(Request $request): JsonResponse
    {
        $data = Grupo::with(['docente', 'materia'])
            ->withCount('postulantes')
            ->orderBy('nombre_grupo')
            ->get();

        return response()->json($data);
    }

    public function docentesPorGrupo(Request $request): JsonResponse
    {
        $data = Docente::with(['grupos.materia'])
            ->where('estado', 'activo')
            ->orderBy('apellidos')
            ->get();

        return response()->json($data);
    }

    public function auditorias(Request $request): JsonResponse
    {
        $query = Auditoria::with('user');

        if ($request->has('modulo')) {
            $query->where('modulo', $request->modulo);
        }
        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->fecha_desde);
        }
        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->fecha_hasta);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }
}
