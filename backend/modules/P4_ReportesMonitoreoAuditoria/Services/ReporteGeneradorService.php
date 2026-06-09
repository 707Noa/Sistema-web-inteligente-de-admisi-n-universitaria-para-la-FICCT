<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Services;

use App\Models\Postulante;
use App\Models\Examen;
use App\Models\Grupo;
use App\Models\DocenteGrupoAsignacion;
use App\Models\GrupoHorario;
use App\Models\AdmisionResultado;
use Illuminate\Support\Facades\DB;

class ReporteGeneradorService
{
    /**
     * Returns report data as array: ['titulo', 'columnas', 'filas', 'total']
     * All data comes from real database queries — no hardcoded values.
     */
    public function obtenerDatos(string $tipoReporte, array $filtros = []): array
    {
        $metodo = 'generar' . str_replace('_', '', ucwords($tipoReporte, '_'));

        if (!method_exists($this, $metodo)) {
            throw new \RuntimeException("Tipo de reporte no implementado: {$tipoReporte}");
        }

        $catalogo = ReporteCatalogoService::get($tipoReporte);
        $filas = $this->$metodo($filtros);

        return [
            'titulo' => $catalogo['titulo'],
            'columnas' => $catalogo['columnas'],
            'filas' => $filas,
            'total' => count($filas),
            'generado_en' => now()->format('d/m/Y H:i'),
        ];
    }

    // ─── Postulantes Inscritos ────────────────────────────────────────────────

    private function generarPostulantesInscritos(array $filtros): array
    {
        $query = Postulante::with(['grupos'])
            ->orderBy('apellidos');

        if (!empty($filtros['grupo'])) {
            $query->whereHas('grupos', fn($q) => $q->where('codigo', 'ilike', "%{$filtros['grupo']}%")
                ->orWhere('nombre_grupo', 'ilike', "%{$filtros['grupo']}%"));
        }
        if (!empty($filtros['carrera'])) {
            $query->where('carrera_postulada', 'ilike', "%{$filtros['carrera']}%");
        }

        return $query->get()->map(fn($p) => [
            $p->ci ?? '-',
            $p->apellidos ?? '-',
            $p->nombres ?? '-',
            $p->carrera_postulada ?? 'Sin especificar',
            $p->estado_tramite ?? $p->estado ?? '-',
            $p->grupos->first()?->codigo ?? $p->grupos->first()?->nombre_grupo ?? 'Sin grupo',
        ])->toArray();
    }

    // ─── Aprobados ───────────────────────────────────────────────────────────

    private function generarAprobados(array $filtros): array
    {
        $query = Examen::with(['postulante', 'materia'])
            ->where('estado', 'aprobado');

        if (!empty($filtros['grupo'])) {
            $query->whereHas('postulante.grupos', fn($q) => $q->where('codigo', 'ilike', "%{$filtros['grupo']}%")
                ->orWhere('nombre_grupo', 'ilike', "%{$filtros['grupo']}%"));
        }
        if (!empty($filtros['materia'])) {
            $query->whereHas('materia', fn($q) => $q->where('nombre', 'ilike', "%{$filtros['materia']}%"));
        }

        return $query->orderBy('created_at')->get()->map(fn($e) => [
            $e->postulante?->ci ?? '-',
            $e->postulante?->apellidos ?? '-',
            $e->postulante?->nombres ?? '-',
            $e->materia?->nombre ?? '-',
            $e->promedio ?? '-',
        ])->toArray();
    }

    // ─── Reprobados ──────────────────────────────────────────────────────────

    private function generarReprobados(array $filtros): array
    {
        $query = Examen::with(['postulante', 'materia'])
            ->where('estado', 'reprobado');

        if (!empty($filtros['grupo'])) {
            $query->whereHas('postulante.grupos', fn($q) => $q->where('codigo', 'ilike', "%{$filtros['grupo']}%")
                ->orWhere('nombre_grupo', 'ilike', "%{$filtros['grupo']}%"));
        }
        if (!empty($filtros['materia'])) {
            $query->whereHas('materia', fn($q) => $q->where('nombre', 'ilike', "%{$filtros['materia']}%"));
        }

        return $query->orderBy('created_at')->get()->map(fn($e) => [
            $e->postulante?->ci ?? '-',
            $e->postulante?->apellidos ?? '-',
            $e->postulante?->nombres ?? '-',
            $e->materia?->nombre ?? '-',
            $e->promedio ?? '-',
        ])->toArray();
    }

    // ─── Promedios Generales ─────────────────────────────────────────────────

    private function generarPromediosGenerales(array $filtros): array
    {
        $query = Examen::with(['postulante', 'materia'])->whereNotNull('promedio');

        if (!empty($filtros['grupo'])) {
            $query->whereHas('postulante.grupos', fn($q) => $q->where('codigo', 'ilike', "%{$filtros['grupo']}%")
                ->orWhere('nombre_grupo', 'ilike', "%{$filtros['grupo']}%"));
        }

        return $query->orderBy('promedio', 'desc')->get()->map(fn($e) => [
            $e->postulante?->ci ?? '-',
            $e->postulante?->apellidos ?? '-',
            $e->postulante?->nombres ?? '-',
            $e->materia?->nombre ?? '-',
            $e->promedio ?? '-',
            $e->estado ?? '-',
        ])->toArray();
    }

    // ─── Promedios por Materia ───────────────────────────────────────────────

    private function generarPromediosPorMateria(array $filtros): array
    {
        return Examen::whereNotNull('promedio')
            ->with('materia')
            ->get()
            ->groupBy('materia_id')
            ->map(function($examenes) {
                $first = $examenes->first();
                return [
                    $first->materia?->nombre ?? 'Sin materia',
                    $examenes->count(),
                    round($examenes->avg('promedio'), 2),
                    $examenes->where('estado', 'aprobado')->count(),
                    $examenes->where('estado', 'reprobado')->count(),
                ];
            })
            ->values()
            ->toArray();
    }

    // ─── Promedios por Grupo ─────────────────────────────────────────────────

    private function generarPromediosPorGrupo(array $filtros): array
    {
        return Grupo::with(['postulantes.examenes'])
            ->where('estado', 'activo')
            ->get()
            ->map(function($grupo) {
                $examenes = $grupo->postulantes->flatMap(fn($p) => $p->examenes)->filter(fn($e) => $e->promedio !== null);
                $total = $grupo->postulantes->count();
                $aprobados = $examenes->where('estado', 'aprobado')->count();
                $reprobados = $examenes->where('estado', 'reprobado')->count();
                $promedio = $examenes->count() > 0 ? round($examenes->avg('promedio'), 2) : '-';
                return [
                    $grupo->codigo ?? $grupo->nombre_grupo,
                    $total,
                    $promedio,
                    $aprobados,
                    $reprobados,
                ];
            })
            ->toArray();
    }

    // ─── Docentes Asignados ──────────────────────────────────────────────────

    private function generarDocentesAsignados(array $filtros): array
    {
        $query = DocenteGrupoAsignacion::with(['docente', 'grupo', 'materia'])
            ->where('estado', 'activo');

        if (!empty($filtros['grupo'])) {
            $query->whereHas('grupo', fn($q) => $q->where('codigo', 'ilike', "%{$filtros['grupo']}%")
                ->orWhere('nombre_grupo', 'ilike', "%{$filtros['grupo']}%"));
        }
        if (!empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }

        return $query->get()
            ->groupBy(fn($a) => $a->docente_user_id . '|' . $a->materia_id . '|' . $a->grupo_id)
            ->map(function($asignaciones) {
                $first = $asignaciones->first();
                return [
                    $first->docente?->name ?? '-',
                    $first->docente?->ci ?? '-',
                    $first->materia?->nombre ?? '-',
                    $first->grupo?->codigo ?? $first->grupo?->nombre_grupo ?? '-',
                    $first->turno ?? '-',
                    substr($first->hora_inicio ?? '', 0, 5) . ' - ' . substr($first->hora_fin ?? '', 0, 5),
                ];
            })
            ->values()
            ->toArray();
    }

    // ─── Grupos Habilitados ──────────────────────────────────────────────────

    private function generarGruposHabilitados(array $filtros): array
    {
        $query = Grupo::withCount('postulantes')->where('estado', 'activo');

        if (!empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }
        if (!empty($filtros['gestion'])) {
            $query->where('gestion', 'ilike', "%{$filtros['gestion']}%");
        }

        return $query->orderBy('codigo')->get()->map(fn($g) => [
            $g->codigo ?? $g->nombre_grupo,
            $g->gestion ?? '-',
            $g->turno ?? '-',
            $g->aula ?? 'Sin aula',
            $g->postulantes_count,
            $g->cupo_maximo ?? 70,
            $g->estado,
        ])->toArray();
    }

    // ─── Ocupación por Grupo ─────────────────────────────────────────────────

    private function generarOcupacionPorGrupo(array $filtros): array
    {
        $query = Grupo::withCount('postulantes')->where('estado', 'activo');

        if (!empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }

        return $query->orderBy('codigo')->get()->map(function($g) {
            $cupo = $g->cupo_maximo ?? 70;
            $ocupacion = $g->postulantes_count;
            $disponible = max(0, $cupo - $ocupacion);
            $pct = $cupo > 0 ? round(($ocupacion / $cupo) * 100) . '%' : '0%';
            return [
                $g->codigo ?? $g->nombre_grupo,
                $g->turno ?? '-',
                $ocupacion,
                $cupo,
                $disponible,
                $pct,
            ];
        })->toArray();
    }

    // ─── Cupos por Carrera ───────────────────────────────────────────────────

    private function generarCuposPorCarrera(array $filtros): array
    {
        $postulantes = Postulante::selectRaw('carrera_postulada, count(*) as total')
            ->whereNotNull('carrera_postulada')
            ->groupBy('carrera_postulada')
            ->orderBy('total', 'desc')
            ->get();

        return $postulantes->map(function($row) {
            $grupos = Grupo::where('estado', 'activo')
                ->whereHas('postulantes', fn($q) => $q->where('carrera_postulada', $row->carrera_postulada))
                ->count();
            $promPorGrupo = $grupos > 0 ? round($row->total / $grupos) : '-';
            return [
                $row->carrera_postulada,
                $row->total,
                $grupos,
                $promPorGrupo,
            ];
        })->toArray();
    }

    // ─── Admitidos Primera Carrera ───────────────────────────────────────────

    private function generarAdmitidosPrimeraCarrera(array $filtros): array
    {
        $query = AdmisionResultado::with('postulante')
            ->where('estado_admision', 'admitido');

        if (method_exists(AdmisionResultado::class, 'scopePrimeraCarrera') ||
            DB::getSchemaBuilder()->hasColumn('admision_resultados', 'tipo_carrera')) {
            $query->where('tipo_carrera', 'primera');
        }

        return $query->get()->map(fn($r) => [
            $r->postulante?->ci ?? '-',
            $r->postulante?->apellidos ?? '-',
            $r->postulante?->nombres ?? '-',
            $r->postulante?->carrera_postulada ?? $r->carrera ?? '-',
            $r->estado_admision ?? '-',
        ])->toArray();
    }

    // ─── Admitidos Segunda Carrera ───────────────────────────────────────────

    private function generarAdmitidosSegundaCarrera(array $filtros): array
    {
        $query = AdmisionResultado::with('postulante')
            ->where('estado_admision', 'admitido');

        if (DB::getSchemaBuilder()->hasColumn('admision_resultados', 'tipo_carrera')) {
            $query->where('tipo_carrera', 'segunda');
        } elseif (DB::getSchemaBuilder()->hasColumn('admision_resultados', 'segunda_carrera')) {
            $query->whereNotNull('segunda_carrera');
        }

        return $query->get()->map(fn($r) => [
            $r->postulante?->ci ?? '-',
            $r->postulante?->apellidos ?? '-',
            $r->postulante?->nombres ?? '-',
            $r->segunda_carrera ?? $r->postulante?->carrera_postulada ?? '-',
            $r->estado_admision ?? '-',
        ])->toArray();
    }

    // ─── Grupos sin Docente ──────────────────────────────────────────────────

    private function generarGruposSinDocente(array $filtros): array
    {
        return Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->withCount('postulantes')
            ->orderBy('codigo')
            ->get()
            ->map(fn($g) => [
                $g->codigo ?? $g->nombre_grupo,
                $g->turno ?? '-',
                $g->gestion ?? '-',
                $g->aula ?? 'Sin aula',
                $g->postulantes_count,
            ])->toArray();
    }

    // ─── Grupos sin Aula ─────────────────────────────────────────────────────

    private function generarGruposSinAula(array $filtros): array
    {
        return Grupo::where('estado', 'activo')
            ->where(fn($q) => $q->whereNull('aula')->orWhere('aula', ''))
            ->withCount('postulantes')
            ->orderBy('codigo')
            ->get()
            ->map(fn($g) => [
                $g->codigo ?? $g->nombre_grupo,
                $g->turno ?? '-',
                $g->gestion ?? '-',
                $g->postulantes_count,
            ])->toArray();
    }

    // ─── Inconsistencias de Horarios ─────────────────────────────────────────

    private function generarInconsistenciasHorarios(array $filtros): array
    {
        $grupos = Grupo::where('estado', 'activo')->with(['horarios', 'asignaciones'])->get();
        $inconsistencias = [];

        foreach ($grupos as $grupo) {
            $codigo = $grupo->codigo ?? $grupo->nombre_grupo;

            if ($grupo->horarios->isEmpty()) {
                $inconsistencias[] = [$codigo, 'Sin horarios', 'El grupo no tiene ningún horario registrado'];
                continue;
            }

            $materiasConHorario = $grupo->horarios->pluck('materia_id')->unique()->count();
            if ($materiasConHorario < 4) {
                $inconsistencias[] = [$codigo, 'Horario incompleto', "Solo {$materiasConHorario} de 4 materias tienen horario asignado"];
            }

            // Detect overlapping slots on same day
            $porDia = $grupo->horarios->groupBy('dia');
            foreach ($porDia as $dia => $slots) {
                $arr = $slots->toArray();
                for ($i = 0; $i < count($arr); $i++) {
                    for ($j = $i + 1; $j < count($arr); $j++) {
                        $a = $arr[$i]; $b = $arr[$j];
                        if ($a['hora_inicio'] < $b['hora_fin'] && $a['hora_fin'] > $b['hora_inicio']) {
                            $inconsistencias[] = [$codigo, 'Choque de horario', "El día {$dia} tiene bloques superpuestos"];
                        }
                    }
                }
            }
        }

        return $inconsistencias;
    }

    // ─── Materias con más Reprobados ─────────────────────────────────────────

    private function generarMateriasConMasReprobados(array $filtros): array
    {
        return Examen::with('materia')
            ->get()
            ->groupBy('materia_id')
            ->map(function($examenes) {
                $first = $examenes->first();
                $total = $examenes->count();
                $reprobados = $examenes->where('estado', 'reprobado')->count();
                $pct = $total > 0 ? round(($reprobados / $total) * 100) . '%' : '0%';
                return [
                    'materia' => $first->materia?->nombre ?? 'Sin materia',
                    'reprobados' => $reprobados,
                    'total' => $total,
                    'pct' => $pct,
                    '_sort' => $reprobados,
                ];
            })
            ->sortByDesc('_sort')
            ->values()
            ->map(fn($row) => [$row['materia'], $row['reprobados'], $row['total'], $row['pct']])
            ->toArray();
    }

    // ─── Grupos con más Aprobados ─────────────────────────────────────────────

    private function generarGruposConMasAprobados(array $filtros): array
    {
        return Grupo::with(['postulantes.examenes'])
            ->where('estado', 'activo')
            ->get()
            ->map(function($grupo) {
                $examenes = $grupo->postulantes->flatMap(fn($p) => $p->examenes);
                $total = $grupo->postulantes->count();
                $aprobados = $examenes->where('estado', 'aprobado')->pluck('postulante_id')->unique()->count();
                $pct = $total > 0 ? round(($aprobados / $total) * 100) . '%' : '0%';
                return [
                    'grupo' => $grupo->codigo ?? $grupo->nombre_grupo,
                    'aprobados' => $aprobados,
                    'total' => $total,
                    'pct' => $pct,
                    '_sort' => $aprobados,
                ];
            })
            ->sortByDesc('_sort')
            ->values()
            ->map(fn($row) => [$row['grupo'], $row['aprobados'], $row['total'], $row['pct']])
            ->toArray();
    }
}
