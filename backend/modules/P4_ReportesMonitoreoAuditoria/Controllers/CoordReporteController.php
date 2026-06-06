<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CoordReporteController extends Controller
{
    public function horarios(Request $request): JsonResponse
    {
        $data = $this->buildGruposData($request);
        return response()->json(array_values($data));
    }

    public function exportarCsv(Request $request): StreamedResponse
    {
        $data = $this->buildGruposData($request);

        $headers = [
            'Content-type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=reporte_horarios_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8

            fputcsv($file, [
                'Grupo', 'Turno', 'Horario General', 'Aula', 'Días',
                'Cupo', 'Inscritos', 'Materia', 'Horario', 'Docente', 'Estado',
            ], ';');

            foreach ($data as $grupo) {
                if (empty($grupo['materias'])) {
                    fputcsv($file, [
                        $grupo['codigo'],
                        ucfirst($grupo['turno'] ?? ''),
                        $grupo['horario_general'],
                        $grupo['aula'] ?? '',
                        $grupo['dias'],
                        $grupo['cupo_maximo'],
                        $grupo['ocupacion'],
                        '', '', '', '',
                    ], ';');
                    continue;
                }

                foreach ($grupo['materias'] as $mat) {
                    fputcsv($file, [
                        $grupo['codigo'],
                        ucfirst($grupo['turno'] ?? ''),
                        $grupo['horario_general'],
                        $grupo['aula'] ?? '',
                        $grupo['dias'],
                        $grupo['cupo_maximo'],
                        $grupo['ocupacion'],
                        $mat['materia_nombre'],
                        $mat['hora_inicio'] . ' - ' . $mat['hora_fin'],
                        $mat['docente_name'] ?? 'Sin docente',
                        $mat['estado'],
                    ], ';');
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    // ── Private helper ────────────────────────────────────────────────────────

    private function buildGruposData(Request $request): array
    {
        $query = Grupo::with([
            'horarios.materia',
            'asignaciones' => fn($q) => $q->where('estado', 'activo')->with(['docente', 'materia']),
            'postulantes',
        ]);

        if ($request->filled('grupo_id')) {
            $query->where('id', $request->grupo_id);
        }
        if ($request->filled('turno')) {
            $query->where('turno', $request->turno);
        }

        $grupos = $query->orderBy('codigo')->get();

        $hasExtraFilter = $request->filled('docente_user_id') || $request->filled('materia_nombre');

        $result = $grupos->map(function ($grupo) use ($request, $hasExtraFilter) {
            $horarios     = $grupo->horarios;
            $asignaciones = $grupo->asignaciones;

            // Unique materia+hora_inicio pairs ordered by time
            $slots = $horarios
                ->unique(fn($h) => $h->materia_id . '|' . $h->hora_inicio)
                ->sortBy('hora_inicio')
                ->values();

            if ($slots->isNotEmpty()) {
                $materias = $slots->map(function ($horario) use ($asignaciones, $request) {
                    $asignacion  = $asignaciones->first(fn($a) => $a->materia_id == $horario->materia_id);
                    $docenteName = $asignacion?->docente?->name;
                    $docenteId   = $asignacion?->docente_user_id;

                    if ($request->filled('docente_user_id') && $docenteId != $request->docente_user_id) {
                        return null;
                    }
                    if ($request->filled('materia_nombre') && ($horario->materia?->nombre ?? '') !== $request->materia_nombre) {
                        return null;
                    }

                    return [
                        'materia_nombre' => $horario->materia?->nombre ?? '-',
                        'hora_inicio'    => substr($horario->hora_inicio, 0, 5),
                        'hora_fin'       => substr($horario->hora_fin, 0, 5),
                        'docente_name'   => $docenteName,
                        'estado'         => $docenteName ? 'Asignado' : 'Pendiente',
                    ];
                })->filter()->values()->all();
            } else {
                // Fallback: build from asignaciones when no GrupoHorario records exist
                $materias = $asignaciones->map(function ($asignacion) use ($request) {
                    $docenteName = $asignacion->docente?->name;
                    $docenteId   = $asignacion->docente_user_id;

                    if ($request->filled('docente_user_id') && $docenteId != $request->docente_user_id) {
                        return null;
                    }
                    if ($request->filled('materia_nombre') && ($asignacion->materia?->nombre ?? '') !== $request->materia_nombre) {
                        return null;
                    }

                    return [
                        'materia_nombre' => $asignacion->materia?->nombre ?? '-',
                        'hora_inicio'    => substr($asignacion->hora_inicio, 0, 5),
                        'hora_fin'       => substr($asignacion->hora_fin, 0, 5),
                        'docente_name'   => $docenteName,
                        'estado'         => 'Asignado',
                    ];
                })->filter()->values()->all();
            }

            // Skip grupo if docente/materia filters are active and nothing matches
            if ($hasExtraFilter && empty($materias)) {
                return null;
            }

            // Horario general from min/max of GrupoHorario (fallback to asignaciones)
            $minInicio = $horarios->min('hora_inicio') ?? $asignaciones->min('hora_inicio');
            $maxFin    = $horarios->max('hora_fin')    ?? $asignaciones->max('hora_fin');
            $horarioGeneral = ($minInicio && $maxFin)
                ? substr($minInicio, 0, 5) . ' - ' . substr($maxFin, 0, 5)
                : '-';

            $dias    = is_array($grupo->dias) ? $grupo->dias : [];
            $diasStr = count($dias) > 0
                ? collect($dias)->map(fn($d) => ucfirst($d))->implode(', ')
                : 'Lunes a viernes';

            $cupo = (int) ($grupo->cupo_maximo ?? $grupo->capacidad_maxima ?? 0);

            return [
                'id'              => $grupo->id,
                'codigo'          => $grupo->codigo,
                'turno'           => $grupo->turno,
                'horario_general' => $horarioGeneral,
                'aula'            => $grupo->aula,
                'dias'            => $diasStr,
                'cupo_maximo'     => $cupo,
                'ocupacion'       => $grupo->postulantes->count(),
                'materias'        => $materias,
            ];
        })->filter()->values()->all();

        return $result;
    }
}
