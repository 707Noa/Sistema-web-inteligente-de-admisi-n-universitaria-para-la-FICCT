<?php

namespace App\Packages\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use App\Models\Examen;
use App\Models\Grupo;
use App\Models\Docente;
use App\Models\Preinscripcion;
use App\Models\Auditoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $stats = [
            'total_inscritos' => Postulante::count(),
            'total_aprobados' => Examen::where('estado', 'aprobado')->distinct('postulante_id')->count('postulante_id'),
            'total_reprobados' => Examen::where('estado', 'reprobado')->distinct('postulante_id')->count('postulante_id'),
            'total_grupos' => Grupo::where('estado', 'activo')->count(),
            'total_docentes' => Docente::where('estado', 'activo')->count(),
            'total_pendientes' => Postulante::where('estado', 'pendiente')->count(),
            'total_preinscripciones' => Preinscripcion::count(),
        ];

        // Postulantes por carrera
        $porCarrera = Postulante::selectRaw('carrera_postulada, COUNT(*) as total')
            ->whereNotNull('carrera_postulada')
            ->groupBy('carrera_postulada')
            ->orderBy('total', 'desc')
            ->get();

        // Aprobados vs reprobados
        $aprobadosVsReprobados = [
            'aprobados' => Examen::where('estado', 'aprobado')->count(),
            'reprobados' => Examen::where('estado', 'reprobado')->count(),
            'pendientes' => Examen::where('estado', 'pendiente')->count(),
        ];

        // Ocupación de grupos
        $gruposOcupacion = Grupo::with('postulantes')
            ->where('estado', 'activo')
            ->withCount('postulantes')
            ->get()
            ->map(function ($g) {
                return [
                    'nombre' => $g->nombre_grupo,
                    'ocupacion' => $g->postulantes_count,
                    'capacidad' => $g->capacidad_maxima,
                    'porcentaje' => $g->capacidad_maxima > 0 ? round(($g->postulantes_count / $g->capacidad_maxima) * 100) : 0,
                ];
            });

        // Promedios por materia
        $promediosPorMateria = Examen::selectRaw('materia_id, AVG(promedio) as promedio_avg')
            ->whereNotNull('promedio')
            ->groupBy('materia_id')
            ->with('materia')
            ->get();

        // Inscripciones por fecha (últimos 30 días)
        $inscripcionesPorFecha = Postulante::selectRaw("DATE(created_at) as fecha, COUNT(*) as total")
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('fecha')
            ->orderBy('fecha')
            ->get();

        // Auditoría reciente
        $auditoriaReciente = Auditoria::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => $stats,
            'porCarrera' => $porCarrera,
            'aprobadosVsReprobados' => $aprobadosVsReprobados,
            'gruposOcupacion' => $gruposOcupacion,
            'promediosPorMateria' => $promediosPorMateria,
            'inscripcionesPorFecha' => $inscripcionesPorFecha,
            'auditoriaReciente' => $auditoriaReciente,
        ]);
    }
}
