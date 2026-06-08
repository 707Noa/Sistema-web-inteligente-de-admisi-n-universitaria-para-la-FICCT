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

        // Resultados acadÃ©micos
        $totalAprobados = \App\Models\Examen::where('estado', 'aprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalReprobados = \App\Models\Examen::where('estado', 'reprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalAdmitidos = \App\Models\AdmisionResultado::where('estado_admision', 'admitido')->count();

        // Postulantes sin grupo
        $postulantesSinGrupo = Postulante::whereDoesntHave('grupos')->count();

        // Asignaciones acadÃ©micas
        $totalAsignaciones = DocenteGrupoAsignacion::where('estado', 'activo')->count();

        // Postulantes por carrera
        $postulantesPorCarrera = Postulante::selectRaw('carrera_postulada as carrera, COUNT(*) as total')
            ->whereNotNull('carrera_postulada')
            ->groupBy('carrera_postulada')
            ->orderBy('total', 'desc')
            ->get();

        // Grupos recientes con ocupaciÃ³n
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
        $grupos = Grupo::with(['carrera', 'postulantes'])
            ->get()
            ->map(function($g) {
                return [
                    'id' => $g->id,
                    'codigo' => $g->codigo ?? $g->nombre_grupo,
                    'carrera' => $g->carrera?->nombre ?? 'Sin carrera',
                    'gestion' => $g->gestion ?? 'I-2026',
                    'turno' => $g->turno ?? 'Sin turno',
                    'aula' => $g->aula ?? 'Sin aula',
                    'cupo_maximo' => $g->cupo_maximo ?? 70,
                    'ocupacion' => $g->postulantes->count(),
                    'estado' => $g->estado,
                ];
            });

        return response()->json($grupos);
    }

    public function docentesAsignados(Request $request): JsonResponse
    {
        $asignaciones = DocenteGrupoAsignacion::with(['docente', 'grupo.carrera', 'materia'])
            ->where('estado', 'activo')
            ->get()
            ->map(function($a) {
                return [
                    'id' => $a->id,
                    'docente_name' => $a->docente?->name ?? 'Sin nombre',
                    'docente_ci' => $a->docente?->ci ?? '-',
                    'docente_codigo' => $a->docente?->codigo ?? '-',
                    'materia_nombre' => $a->materia?->nombre ?? 'Sin materia',
                    'grupo_codigo' => $a->grupo?->codigo ?? $a->grupo?->nombre_grupo,
                    'carrera' => $a->grupo?->carrera?->nombre ?? 'Sin carrera',
                    'turno' => $a->turno,
                    'dia' => $a->dia,
                    'hora_inicio' => substr($a->hora_inicio, 0, 5),
                    'hora_fin' => substr($a->hora_fin, 0, 5),
                    'aula' => $a->grupo?->aula ?? 'Sin aula',
                ];
            });

        return response()->json($asignaciones);
    }

    public function horarios(Request $request): JsonResponse
    {
        $horarios = GrupoHorario::with(['grupo.carrera', 'materia'])
            ->get()
            ->map(function($h) {
                // Find teacher assigned to this slot
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
        // 1. Grupos por carrera
        $gruposPorCarrera = Grupo::join('carreras', 'grupos.carrera_id', '=', 'carreras.id')
            ->select('carreras.nombre as carrera', DB::raw('count(grupos.id) as cantidad'))
            ->groupBy('carreras.nombre')
            ->get();

        // 2. Estudiantes por carrera
        $estudiantesPorCarrera = Postulante::select('carrera_postulada as carrera', DB::raw('count(id) as cantidad'))
            ->where('estado_tramite', 'INSCRITO')
            ->groupBy('carrera_postulada')
            ->get();

        // 3. Docentes por materia (especialidad)
        $docentesPorMateria = DB::table('docente_especialidades')
            ->join('materias', 'docente_especialidades.materia_id', '=', 'materias.id')
            ->select('materias.nombre as materia', DB::raw('count(docente_especialidades.user_id) as cantidad'))
            ->where('docente_especialidades.estado', 'activo')
            ->groupBy('materias.nombre')
            ->get();

        // 4. Cupos ocupados por grupo
        $cuposPorGrupo = Grupo::withCount('postulantes')
            ->get()
            ->map(fn($g) => [
                'grupo' => $g->codigo ?? $g->nombre_grupo,
                'ocupacion' => $g->postulantes_count,
                'cupo_maximo' => $g->cupo_maximo ?? 70,
            ]);

        return response()->json([
            'grupos_carrera' => $gruposPorCarrera,
            'estudiantes_carrera' => $estudiantesPorCarrera,
            'docentes_materia' => $docentesPorMateria,
            'cupos_grupo' => $cuposPorGrupo,
        ]);
    }
}
