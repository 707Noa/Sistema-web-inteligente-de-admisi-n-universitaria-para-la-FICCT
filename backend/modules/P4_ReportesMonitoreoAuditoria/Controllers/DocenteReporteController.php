<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Examen;
use App\Models\Grupo;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocenteReporteController extends Controller
{
    // ── Reporte calificaciones (CSV) ──────────────────────────────────────────

    public function reporteCalificaciones(Request $request): StreamedResponse
    {
        $userId = $request->user()->id;

        $grupoIds = DocenteGrupoAsignacion::where('docente_user_id', $userId)
            ->where('estado', 'activo')
            ->when($request->filled('grupo_id'), fn($q) => $q->where('grupo_id', $request->grupo_id))
            ->get();

        $headers = [
            'Content-type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=calificaciones_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $docenteName = $request->user()->name;

        $callback = function () use ($grupoIds, $docenteName, $request) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, ['Docente', 'Materia', 'Grupo', 'Estudiante', 'CI', 'Examen 1', 'Examen 2', 'Examen 3', 'Promedio', 'Estado'], ';');

            foreach ($grupoIds as $asignacion) {
                $grupo = Grupo::with('postulantes')->find($asignacion->grupo_id);
                if (!$grupo) continue;

                $materiaId     = $asignacion->materia_id;
                $materiaNombre = $asignacion->materia?->nombre ?? '-';
                if (!$materiaNombre || $materiaNombre === '-') {
                    $asignacion->load('materia');
                    $materiaNombre = $asignacion->materia?->nombre ?? '-';
                }

                foreach ($grupo->postulantes->sortBy('apellidos') as $p) {
                    $examen = Examen::where('postulante_id', $p->id)
                        ->where('materia_id', $materiaId)
                        ->first();

                    $promedio    = $examen?->promedio;
                    $estadoNota  = 'Sin notas';
                    if ($examen) {
                        $estadoNota = $promedio !== null ? ($promedio >= 60 ? 'APROBADO' : 'REPROBADO') : 'Pendiente';
                    }

                    if ($request->filled('estado') && strtolower($estadoNota) !== strtolower($request->estado)) {
                        continue;
                    }

                    fputcsv($file, [
                        $docenteName,
                        $materiaNombre,
                        $grupo->codigo,
                        trim($p->nombres . ' ' . $p->apellidos),
                        $p->ci,
                        $examen?->nota_1 ?? '',
                        $examen?->nota_2 ?? '',
                        $examen?->nota_3 ?? '',
                        $promedio ?? '',
                        $estadoNota,
                    ], ';');
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    // ── Reporte asistencia (CSV) ───────────────────────────────────────────────

    public function reporteAsistencia(Request $request): StreamedResponse
    {
        $userId = $request->user()->id;

        $query = Asistencia::with(['postulante', 'grupo', 'materia'])
            ->where('docente_user_id', $userId);

        if ($request->filled('grupo_id'))     $query->where('grupo_id', $request->grupo_id);
        if ($request->filled('fecha_inicio')) $query->where('fecha', '>=', $request->fecha_inicio);
        if ($request->filled('fecha_fin'))    $query->where('fecha', '<=', $request->fecha_fin);
        if ($request->filled('estado'))       $query->where('estado', $request->estado);

        $registros = $query->orderBy('fecha')->orderBy('postulante_id')->get();

        $docenteName = $request->user()->name;

        $headers = [
            'Content-type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=asistencia_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($registros, $docenteName) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, ['Docente', 'Materia', 'Grupo', 'Fecha', 'Estudiante', 'CI', 'Estado'], ';');

            foreach ($registros as $a) {
                fputcsv($file, [
                    $docenteName,
                    $a->materia?->nombre ?? '-',
                    $a->grupo?->codigo ?? '-',
                    $a->fecha?->format('Y-m-d') ?? '-',
                    trim(($a->postulante?->nombres ?? '') . ' ' . ($a->postulante?->apellidos ?? '')),
                    $a->postulante?->ci ?? '-',
                    ucfirst($a->estado),
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
