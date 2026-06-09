<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Materia;
use App\Models\Postulante;
use App\Models\User;
use App\Models\DocenteGrupoAsignacion;
use App\Models\GrupoHorario;
use App\Models\Carrera;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AutoridadPortalController extends Controller
{
    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'ci' => $user->ci,
            'email' => $user->email,
            'codigo' => $user->codigo,
            'role' => $user->role->name ?? 'autoridad',
            'estado' => $user->estado,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $totalInscritos = Postulante::count();
        $totalGrupos = Grupo::where('estado', 'activo')->count();

        $totalDocentes = DocenteGrupoAsignacion::where('estado', 'activo')
            ->distinct('docente_user_id')
            ->count('docente_user_id');

        $totalHorarios = GrupoHorario::count();

        $totalCarrerasConGrupo = Grupo::where('estado', 'activo')
            ->whereNotNull('carrera_id')
            ->distinct('carrera_id')
            ->count('carrera_id');

        $totalEstudiantesAsignados = DB::table('grupo_postulante')
            ->join('grupos', 'grupo_postulante.grupo_id', '=', 'grupos.id')
            ->where('grupos.estado', 'activo')
            ->count();

        $totalAprobados = \App\Models\Examen::where('estado', 'aprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalReprobados = \App\Models\Examen::where('estado', 'reprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalAdmitidos = \App\Models\AdmisionResultado::where('estado_admision', 'admitido')->count();

        $postulantesSinGrupo = Postulante::whereDoesntHave('grupos')->count();
        $totalAsignaciones = DocenteGrupoAsignacion::where('estado', 'activo')->count();

        $postulantesPorCarrera = Postulante::selectRaw('carrera_postulada as carrera, COUNT(*) as total')
            ->whereNotNull('carrera_postulada')
            ->groupBy('carrera_postulada')
            ->orderBy('total', 'desc')
            ->get();

        $gruposRecientes = Grupo::with(['carrera'])
            ->where('estado', 'activo')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get()
            ->map(fn($g) => [
                'id' => $g->id,
                'codigo' => $g->codigo ?? $g->nombre_grupo,
                'carrera' => $g->carrera?->nombre ?? 'Sin carrera',
                'turno' => $g->turno,
                'cupo_maximo' => $g->cupo_maximo ?? $g->capacidad_maxima ?? 70,
                'ocupacion' => $g->ocupacion(),
                'aula' => $g->aula ?? 'Sin asignar',
            ]);

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'total_grupos' => $totalGrupos,
            'total_docentes' => $totalDocentes,
            'total_horarios' => $totalHorarios,
            'total_carreras' => $totalCarrerasConGrupo,
            'total_asignados' => $totalEstudiantesAsignados,
            'total_aprobados' => $totalAprobados,
            'total_reprobados' => $totalReprobados,
            'total_admitidos' => $totalAdmitidos,
            'total_asignaciones' => $totalAsignaciones,
            'postulantes_sin_grupo' => $postulantesSinGrupo,
            'postulantes_por_carrera' => $postulantesPorCarrera,
            'grupos_recientes' => $gruposRecientes,
        ]);
    }

    public function grupos(Request $request): JsonResponse
    {
        $grupos = Grupo::with(['postulantes'])->get()
            ->map(function($g) {
                $materiasCount = GrupoHorario::where('grupo_id', $g->id)
                    ->distinct('materia_id')
                    ->count('materia_id');

                $docentesCount = DocenteGrupoAsignacion::where('grupo_id', $g->id)
                    ->where('estado', 'activo')
                    ->distinct('docente_user_id')
                    ->count('docente_user_id');

                $ocupacion = $g->postulantes->count();
                $cupoMaximo = $g->cupo_maximo ?? 70;
                $pctOcupacion = $cupoMaximo > 0 ? round(($ocupacion / $cupoMaximo) * 100) : 0;

                return [
                    'id' => $g->id,
                    'codigo' => $g->codigo ?? $g->nombre_grupo,
                    'gestion' => $g->gestion ?? 'I-2026',
                    'turno' => $g->turno ?? 'Sin turno',
                    'aula' => $g->aula ?: null,
                    'cupo_maximo' => $cupoMaximo,
                    'ocupacion' => $ocupacion,
                    'pct_ocupacion' => $pctOcupacion,
                    'materias_count' => $materiasCount,
                    'docentes_count' => $docentesCount,
                    'estado' => $g->estado,
                ];
            });

        return response()->json($grupos);
    }

    public function docentesAsignados(Request $request): JsonResponse
    {
        $dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

        $asignaciones = DocenteGrupoAsignacion::with(['docente', 'grupo', 'materia'])
            ->where('estado', 'activo')
            ->get()
            ->groupBy(function($a) {
                return implode('|', [
                    $a->docente_user_id,
                    $a->materia_id,
                    $a->grupo_id,
                    $a->hora_inicio,
                    $a->hora_fin,
                ]);
            })
            ->map(function($group) use ($dias) {
                $first = $group->first();
                $diasPresentes = $group->pluck('dia')->map(fn($d) => strtolower($d))->unique()->sort()->values()->toArray();
                $todosLosDias = count(array_diff($dias, $diasPresentes)) === 0;
                $diasTexto = $todosLosDias ? 'Lunes a viernes' : implode(', ', array_map('ucfirst', $diasPresentes));

                return [
                    'id' => $first->id,
                    'docente_name' => $first->docente?->name ?? 'Sin nombre',
                    'docente_ci' => $first->docente?->ci ?? '-',
                    'docente_codigo' => $first->docente?->codigo ?? '-',
                    'materia_nombre' => $first->materia?->nombre ?? 'Sin materia',
                    'grupo_codigo' => $first->grupo?->codigo ?? $first->grupo?->nombre_grupo,
                    'turno' => $first->turno,
                    'dias_texto' => $diasTexto,
                    'hora_inicio' => substr($first->hora_inicio, 0, 5),
                    'hora_fin' => substr($first->hora_fin, 0, 5),
                    'aula' => $first->grupo?->aula ?? null,
                    'estado' => $first->estado,
                ];
            })
            ->values();

        return response()->json($asignaciones);
    }

    public function horarios(Request $request): JsonResponse
    {
        $horarios = GrupoHorario::with(['grupo.carrera', 'materia'])
            ->get()
            ->map(function($h) {
                $asig = DocenteGrupoAsignacion::where('grupo_id', $h->grupo_id)
                    ->where('materia_id', $h->materia_id)
                    ->where('dia', $h->dia)
                    ->where('estado', 'activo')
                    ->with('docente')
                    ->first();

                return [
                    'id' => $h->id,
                    'grupo_codigo' => $h->grupo?->codigo ?? $h->grupo?->nombre_grupo,
                    'carrera' => $h->grupo?->carrera?->nombre ?? 'Sin carrera',
                    'materia_nombre' => $h->materia?->nombre,
                    'docente_name' => $asig?->docente?->name ?? 'Sin asignar',
                    'dia' => $h->dia,
                    'hora_inicio' => substr($h->hora_inicio, 0, 5),
                    'hora_fin' => substr($h->hora_fin, 0, 5),
                    'aula' => $h->grupo?->aula ?? 'Sin aula',
                ];
            });

        return response()->json($horarios);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        // Grupos por gestión (line chart data)
        $gruposPorGestion = Grupo::select('gestion', DB::raw('count(*) as cantidad'))
            ->whereNotNull('gestion')
            ->groupBy('gestion')
            ->orderBy('gestion')
            ->get();

        // Estudiantes por carrera
        $estudiantesPorCarrera = Postulante::select('carrera_postulada as carrera', DB::raw('count(id) as cantidad'))
            ->where('estado_tramite', 'INSCRITO')
            ->groupBy('carrera_postulada')
            ->get();

        // Docentes por materia (especialidad)
        $docentesPorMateria = DB::table('docente_especialidades')
            ->join('materias', 'docente_especialidades.materia_id', '=', 'materias.id')
            ->select('materias.nombre as materia', DB::raw('count(docente_especialidades.user_id) as cantidad'))
            ->where('docente_especialidades.estado', 'activo')
            ->groupBy('materias.nombre')
            ->get();

        // Cupos ocupados por grupo
        $cuposPorGrupo = Grupo::withCount('postulantes')
            ->get()
            ->map(fn($g) => [
                'grupo' => $g->codigo ?? $g->nombre_grupo,
                'ocupacion' => $g->postulantes_count,
                'cupo_maximo' => $g->cupo_maximo ?? 70,
            ]);

        // Supervisory metrics
        $totalGrupos = Grupo::where('estado', 'activo')->count();

        $gruposSinDocente = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->count();

        $gruposSinAula = Grupo::where('estado', 'activo')
            ->where(fn($q) => $q->whereNull('aula')->orWhere('aula', ''))
            ->count();

        $gruposSinHorario = Grupo::where('estado', 'activo')
            ->whereDoesntHave('horarios')
            ->count();

        $postulantesSinGrupo = Postulante::whereDoesntHave('grupos')->count();

        $gruposConCupoLleno = Grupo::where('estado', 'activo')
            ->withCount('postulantes')
            ->get()
            ->filter(fn($g) => ($g->cupo_maximo ?? 70) > 0 && $g->postulantes_count >= ($g->cupo_maximo ?? 70))
            ->count();

        return response()->json([
            'grupos_gestion' => $gruposPorGestion,
            'estudiantes_carrera' => $estudiantesPorCarrera,
            'docentes_materia' => $docentesPorMateria,
            'cupos_grupo' => $cuposPorGrupo,
            'total_grupos' => $totalGrupos,
            'grupos_sin_docente' => $gruposSinDocente,
            'grupos_sin_aula' => $gruposSinAula,
            'grupos_sin_horario' => $gruposSinHorario,
            'postulantes_sin_grupo' => $postulantesSinGrupo,
            'grupos_cupo_lleno' => $gruposConCupoLleno,
        ]);
    }

    public function alertas(Request $request): JsonResponse
    {
        $alertas = [];

        // Grupos sin docente asignado
        $gruposSinDocente = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->get(['id', 'codigo', 'nombre_grupo', 'turno']);

        foreach ($gruposSinDocente as $g) {
            $alertas[] = [
                'nivel' => 'danger',
                'tipo' => 'sin_docente',
                'mensaje' => 'Grupo ' . ($g->codigo ?? $g->nombre_grupo) . ' (' . $g->turno . ') no tiene docente asignado.',
            ];
        }

        // Grupos sin aula
        $gruposSinAula = Grupo::where('estado', 'activo')
            ->where(fn($q) => $q->whereNull('aula')->orWhere('aula', ''))
            ->get(['id', 'codigo', 'nombre_grupo', 'turno']);

        foreach ($gruposSinAula as $g) {
            $alertas[] = [
                'nivel' => 'warning',
                'tipo' => 'sin_aula',
                'mensaje' => 'Grupo ' . ($g->codigo ?? $g->nombre_grupo) . ' (' . $g->turno . ') no tiene aula asignada.',
            ];
        }

        // Grupos sin horario
        $gruposSinHorario = Grupo::where('estado', 'activo')
            ->whereDoesntHave('horarios')
            ->get(['id', 'codigo', 'nombre_grupo', 'turno']);

        foreach ($gruposSinHorario as $g) {
            $alertas[] = [
                'nivel' => 'warning',
                'tipo' => 'sin_horario',
                'mensaje' => 'Grupo ' . ($g->codigo ?? $g->nombre_grupo) . ' (' . $g->turno . ') no tiene horarios registrados.',
            ];
        }

        // Grupos con cupo lleno
        $gruposLlenos = Grupo::where('estado', 'activo')
            ->withCount('postulantes')
            ->get()
            ->filter(fn($g) => ($g->cupo_maximo ?? 70) > 0 && $g->postulantes_count >= ($g->cupo_maximo ?? 70));

        foreach ($gruposLlenos as $g) {
            $alertas[] = [
                'nivel' => 'info',
                'tipo' => 'cupo_lleno',
                'mensaje' => 'Grupo ' . ($g->codigo ?? $g->nombre_grupo) . ' tiene cupo lleno (' . $g->postulantes_count . '/' . ($g->cupo_maximo ?? 70) . ').',
            ];
        }

        // Grupos con baja ocupación (menos del 30%)
        $gruposBajaOcupacion = Grupo::where('estado', 'activo')
            ->withCount('postulantes')
            ->get()
            ->filter(function($g) {
                $cupo = $g->cupo_maximo ?? 70;
                return $cupo > 0 && $g->postulantes_count > 0 && ($g->postulantes_count / $cupo) < 0.30;
            });

        foreach ($gruposBajaOcupacion as $g) {
            $cupo = $g->cupo_maximo ?? 70;
            $pct = $cupo > 0 ? round(($g->postulantes_count / $cupo) * 100) : 0;
            $alertas[] = [
                'nivel' => 'warning',
                'tipo' => 'baja_ocupacion',
                'mensaje' => 'Grupo ' . ($g->codigo ?? $g->nombre_grupo) . ' tiene baja ocupación (' . $g->postulantes_count . '/' . $cupo . ' — ' . $pct . '%).',
            ];
        }

        // Postulantes sin grupo
        $sinGrupo = Postulante::whereDoesntHave('grupos')->count();
        if ($sinGrupo > 0) {
            $alertas[] = [
                'nivel' => 'info',
                'tipo' => 'postulantes_sin_grupo',
                'mensaje' => $sinGrupo . ' postulante(s) inscrito(s) sin grupo asignado.',
            ];
        }

        $resumen = [
            'danger' => count(array_filter($alertas, fn($a) => $a['nivel'] === 'danger')),
            'warning' => count(array_filter($alertas, fn($a) => $a['nivel'] === 'warning')),
            'info' => count(array_filter($alertas, fn($a) => $a['nivel'] === 'info')),
            'total' => count($alertas),
        ];

        return response()->json([
            'alertas' => $alertas,
            'resumen' => $resumen,
        ]);
    }
}
