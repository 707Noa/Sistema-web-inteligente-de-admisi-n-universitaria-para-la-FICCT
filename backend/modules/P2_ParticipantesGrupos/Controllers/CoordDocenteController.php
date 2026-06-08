<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Materia;
use App\Models\DocenteEspecialidad;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Postulante;
use App\Models\Grupo;
use App\Models\GrupoHorario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoordDocenteController extends Controller
{
    private const MATERIAS_VALIDAS = ['ComputaciÃ³n', 'FÃ­sica', 'InglÃ©s', 'MatemÃ¡ticas'];

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'ci' => $user->ci,
            'email' => $user->email,
            'codigo' => $user->codigo,
            'role' => $user->role->name ?? 'coordinador',
            'estado' => $user->estado,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $totalInscritos = Postulante::where('estado_tramite', 'INSCRITO')->count();
        $totalGrupos = Grupo::where('estado', 'activo')->count();

        $totalDocentes = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->count();

        $totalAsignaciones = DocenteGrupoAsignacion::where('estado', 'activo')->count();

        $gruposSinDocente = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->count();

        $totalHorarios = GrupoHorario::count();

        // Grupos recientes
        $gruposRecientes = Grupo::with(['carrera'])
            ->where('estado', 'activo')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get()
            ->map(fn($g) => [
                'id' => $g->id,
                'codigo' => $g->codigo ?? $g->nombre_grupo,
                'turno' => $g->turno,
                'cupo_maximo' => $g->cupo_maximo ?? 70,
                'carrera_nombre' => $g->carrera?->nombre ?? 'Sin carrera',
                'ocupacion' => $g->ocupacion(),
            ]);

        // Docentes con mÃ¡s carga asignada (unique groups)
        $docentesCarga = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->get()
            ->map(function($u) {
                $uniqueGroupsCount = DocenteGrupoAsignacion::where('docente_user_id', $u->id)
                    ->where('estado', 'activo')
                    ->distinct('grupo_id')
                    ->count('grupo_id');
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'carga_grupos' => $uniqueGroupsCount,
                ];
            })
            ->sortByDesc('carga_grupos')
            ->take(5)
            ->values();

        // Alertas acadÃ©micas
        $alertas = [];

        // 1. Grupos sin docente
        $gruposSinDocenteList = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->get();
        foreach ($gruposSinDocenteList as $g) {
            $alertas[] = [
                'tipo' => 'grupo_sin_docente',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " no tiene ningÃºn docente asignado.",
                'target_id' => $g->id,
            ];
        }

        // 2. Docentes con 4 o mÃ¡s grupos
        $docentesCon4Grupos = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->get()
            ->filter(function($u) {
                return DocenteGrupoAsignacion::where('docente_user_id', $u->id)
                    ->where('estado', 'activo')
                    ->distinct('grupo_id')
                    ->count('grupo_id') >= 4;
            });
        foreach ($docentesCon4Grupos as $u) {
            $alertas[] = [
                'tipo' => 'docente_limite',
                'mensaje' => "El docente {$u->name} ha alcanzado el lÃ­mite mÃ¡ximo de 4 grupos asignados.",
                'target_id' => $u->id,
            ];
        }

        // 3. Grupos llenos o cerca de 70 (cupo >= 65 estudiantes)
        $gruposLlenos = Grupo::where('estado', 'activo')
            ->get()
            ->filter(function($g) {
                return $g->ocupacion() >= 65;
            });
        foreach ($gruposLlenos as $g) {
            $alertas[] = [
                'tipo' => 'grupo_lleno',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " estÃ¡ cerca del lÃ­mite de 70 estudiantes (" . $g->ocupacion() . "/70).",
                'target_id' => $g->id,
            ];
        }

        return response()->json([
            'resumen' => [
                'total_inscritos' => $totalInscritos,
                'total_grupos_habilitados' => $totalGrupos,
                'total_docentes_activos' => $totalDocentes,
                'total_asignaciones_academicas' => $totalAsignaciones,
                'grupos_sin_docente' => $gruposSinDocente,
                'horarios_registrados' => $totalHorarios,
            ],
            'grupos_recientes' => $gruposRecientes,
            'docentes_carga' => $docentesCarga,
            'alertas' => $alertas,
        ]);
    }

    public function cargaHoraria(int $id): JsonResponse
    {
        $docente = User::whereHas('role', fn($q) => $q->where('name', 'docente'))->findOrFail($id);

        $asignaciones = DocenteGrupoAsignacion::where('docente_user_id', $docente->id)
            ->where('estado', 'activo')
            ->with(['grupo.carrera', 'materia'])
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'grupo_id' => $a->grupo_id,
                'grupo_codigo' => $a->grupo?->codigo ?? $a->grupo?->nombre_grupo,
                'carrera' => $a->grupo?->carrera?->nombre ?? 'Sin carrera',
                'materia_id' => $a->materia_id,
                'materia_nombre' => $a->materia?->nombre,
                'dia' => $a->dia,
                'turno' => $a->turno,
                'hora_inicio' => substr($a->hora_inicio, 0, 5),
                'hora_fin' => substr($a->hora_fin, 0, 5),
            ]);

        return response()->json([
            'docente_id' => $docente->id,
            'docente_name' => $docente->name,
            'carga' => $asignaciones,
            'total_grupos' => $asignaciones->pluck('grupo_id')->unique()->count(),
        ]);
    }

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'ci' => $user->ci,
            'email' => $user->email,
            'codigo' => $user->codigo,
            'role' => $user->role->name ?? 'coordinador',
            'estado' => $user->estado,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        // ── Conteos principales ──
        $totalInscritos = Postulante::count();
        $totalPreinscritos = Postulante::where('estado_tramite', 'PREINSCRITO')->count();
        $totalConCuenta = Postulante::whereNotNull('user_id')->count();
        $totalAsignadosGrupo = \DB::table('grupo_postulante')->distinct('postulante_id')->count('postulante_id');

        $totalGrupos = Grupo::where('estado', 'activo')->count();
        
        $totalDocentes = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->count();

        $totalAsignaciones = DocenteGrupoAsignacion::where('estado', 'activo')->count();
        
        $gruposSinDocente = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->count();

        $totalHorarios = GrupoHorario::count();

        // Grupos sin aula
        $gruposSinAula = Grupo::where('estado', 'activo')
            ->where(function($q) {
                $q->whereNull('aula')->orWhere('aula', '');
            })
            ->count();

        // Aulas asignadas (únicas)
        $aulasAsignadas = Grupo::where('estado', 'activo')
            ->whereNotNull('aula')
            ->where('aula', '!=', '')
            ->distinct('aula')
            ->count('aula');

        // Notas pendientes (exámenes sin todas las notas)
        $notasPendientes = \App\Models\Examen::where(function($q) {
            $q->whereNull('nota_1')->orWhereNull('nota_2')->orWhereNull('nota_3');
        })->count();

        // Resultados de admisión
        $totalAprobados = \App\Models\Examen::where('estado', 'aprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalReprobados = \App\Models\Examen::where('estado', 'reprobado')
            ->distinct('postulante_id')->count('postulante_id');
        $totalAdmitidos = \App\Models\AdmisionResultado::where('estado_admision', 'admitido')->count();
        $aprobadosSinCupo = \App\Models\AdmisionResultado::where('estado_admision', 'aprobado_sin_cupo')->count();

        // Cupos configurados
        $cuposConfigurados = \App\Models\CupoCarrera::where('estado', 'activo')
            ->sum('cupo_maximo');

        // Postulantes sin grupo
        $postulantesSinGrupo = Postulante::whereDoesntHave('grupos')->count();

        // ── Grupos recientes ──
        $gruposRecientes = Grupo::with(['carrera'])
            ->where('estado', 'activo')
            ->orderBy('id', 'desc')
            ->take(10)
            ->get()
            ->map(fn($g) => [
                'id' => $g->id,
                'codigo' => $g->codigo ?? $g->nombre_grupo,
                'turno' => $g->turno,
                'cupo_maximo' => $g->cupo_maximo ?? $g->capacidad_maxima ?? 70,
                'carrera_nombre' => $g->carrera?->nombre ?? 'Sin carrera',
                'ocupacion' => $g->ocupacion(),
                'aula' => $g->aula ?? 'Sin asignar',
                'estado' => $g->estado,
            ]);

        // ── Docentes con más carga ──
        $docentesCarga = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->get()
            ->map(function($u) {
                $asignaciones = DocenteGrupoAsignacion::where('docente_user_id', $u->id)
                    ->where('estado', 'activo');
                $uniqueGroupsCount = (clone $asignaciones)->distinct('grupo_id')->count('grupo_id');
                $materiasCount = (clone $asignaciones)->distinct('materia_id')->count('materia_id');
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'carga_grupos' => $uniqueGroupsCount,
                    'materias' => $materiasCount,
                ];
            })
            ->sortByDesc('carga_grupos')
            ->take(10)
            ->values();

        // ── Alertas académicas ──
        $alertas = [];

        // 1. Grupos sin docente
        $gruposSinDocenteList = Grupo::where('estado', 'activo')
            ->whereDoesntHave('asignaciones', fn($q) => $q->where('estado', 'activo'))
            ->get();
        foreach ($gruposSinDocenteList as $g) {
            $alertas[] = [
                'tipo' => 'grupo_sin_docente',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " no tiene ningún docente asignado.",
                'target_id' => $g->id,
            ];
        }

        // 2. Grupos sin aula
        $gruposSinAulaList = Grupo::where('estado', 'activo')
            ->where(function($q) {
                $q->whereNull('aula')->orWhere('aula', '');
            })
            ->get();
        foreach ($gruposSinAulaList as $g) {
            $alertas[] = [
                'tipo' => 'grupo_sin_aula',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " no tiene aula asignada.",
                'target_id' => $g->id,
            ];
        }

        // 3. Docentes con 4 o más grupos
        $docentesCon4Grupos = User::whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->where('estado', 'activo')
            ->get()
            ->filter(function($u) {
                return DocenteGrupoAsignacion::where('docente_user_id', $u->id)
                    ->where('estado', 'activo')
                    ->distinct('grupo_id')
                    ->count('grupo_id') >= 4;
            });
        foreach ($docentesCon4Grupos as $u) {
            $alertas[] = [
                'tipo' => 'docente_limite',
                'mensaje' => "El docente {$u->name} ha alcanzado el límite máximo de 4 grupos asignados.",
                'target_id' => $u->id,
            ];
        }

        // 4. Grupos llenos o cerca del límite (>= 90% de capacidad)
        $gruposLlenos = Grupo::where('estado', 'activo')
            ->get()
            ->filter(function($g) {
                $cupo = $g->cupo_maximo ?? $g->capacidad_maxima ?? 70;
                return $cupo > 0 && $g->ocupacion() >= ($cupo * 0.9);
            });
        foreach ($gruposLlenos as $g) {
            $cupo = $g->cupo_maximo ?? $g->capacidad_maxima ?? 70;
            $alertas[] = [
                'tipo' => 'grupo_lleno',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " está cerca del límite de capacidad (" . $g->ocupacion() . "/{$cupo}).",
                'target_id' => $g->id,
            ];
        }

        // 5. Postulantes sin grupo
        if ($postulantesSinGrupo > 0) {
            $alertas[] = [
                'tipo' => 'postulantes_sin_grupo',
                'mensaje' => "{$postulantesSinGrupo} postulante(s) no tienen grupo asignado.",
                'target_id' => null,
            ];
        }

        // 6. Notas pendientes
        if ($notasPendientes > 0) {
            $alertas[] = [
                'tipo' => 'notas_pendientes',
                'mensaje' => "Hay {$notasPendientes} examen(es) con calificaciones pendientes.",
                'target_id' => null,
            ];
        }

        // 7. Cupos no configurados
        $carrerasConCupo = \App\Models\CupoCarrera::where('estado', 'activo')->count();
        if ($carrerasConCupo === 0) {
            $alertas[] = [
                'tipo' => 'cupos_no_configurados',
                'mensaje' => "No se han configurado cupos por carrera para esta gestión.",
                'target_id' => null,
            ];
        }

        return response()->json([
            'resumen' => [
                'total_inscritos' => $totalInscritos,
                'postulantes_preinscritos' => $totalPreinscritos,
                'postulantes_con_cuenta' => $totalConCuenta,
                'postulantes_asignados' => $totalAsignadosGrupo,
                'total_grupos_habilitados' => $totalGrupos,
                'total_docentes_activos' => $totalDocentes,
                'total_asignaciones_academicas' => $totalAsignaciones,
                'grupos_sin_docente' => $gruposSinDocente,
                'horarios_registrados' => $totalHorarios,
                'grupos_sin_aula' => $gruposSinAula,
                'aulas_asignadas' => $aulasAsignadas,
                'notas_pendientes' => $notasPendientes,
                'aprobados' => $totalAprobados,
                'reprobados' => $totalReprobados,
                'admitidos' => $totalAdmitidos,
                'aprobados_sin_cupo' => $aprobadosSinCupo,
                'cupos_configurados' => $cuposConfigurados,
                'postulantes_sin_grupo' => $postulantesSinGrupo,
            ],
            'grupos_recientes' => $gruposRecientes,
            'docentes_carga' => $docentesCarga,
            'alertas' => $alertas,
        ]);
    }

    public function cargaHoraria(int $id): JsonResponse
    {
        $docente = User::whereHas('role', fn($q) => $q->where('name', 'docente'))->findOrFail($id);

        $asignaciones = DocenteGrupoAsignacion::where('docente_user_id', $docente->id)
            ->where('estado', 'activo')
            ->with(['grupo.carrera', 'materia'])
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'grupo_id' => $a->grupo_id,
                'grupo_codigo' => $a->grupo?->codigo ?? $a->grupo?->nombre_grupo,
                'carrera' => $a->grupo?->carrera?->nombre ?? 'Sin carrera',
                'materia_id' => $a->materia_id,
                'materia_nombre' => $a->materia?->nombre,
                'dia' => $a->dia,
                'turno' => $a->turno,
                'hora_inicio' => substr($a->hora_inicio, 0, 5),
                'hora_fin' => substr($a->hora_fin, 0, 5),
            ]);

        return response()->json([
            'docente_id' => $docente->id,
            'docente_name' => $docente->name,
            'carga' => $asignaciones,
            'total_grupos' => $asignaciones->pluck('grupo_id')->unique()->count(),
        ]);
    }

    /** Lista usuarios con rol=docente e incluye su especialidad. */
    public function index(Request $request): JsonResponse
    {
        $search = $request->input('search');

        $query = User::with(['role', 'especialidadDocente.materia'])
            ->whereHas('role', fn($q) => $q->where('name', 'docente'));

        if (!empty($search)) {
            $query->where(fn($q) => $q
                ->where('name', 'ilike', "%{$search}%")
                ->orWhere('ci', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%")
            );
        }

        $docentes = $query->orderBy('name')->get()->map(fn($u) => [
            'id'              => $u->id,
            'name'            => $u->name,
            'ci'              => $u->ci,
            'email'           => $u->email,
            'codigo'          => $u->codigo,
            'estado'          => $u->estado,
            'materia_id'      => $u->especialidadDocente?->materia_id,
            'materia_nombre'  => $u->especialidadDocente?->materia?->nombre,
        ]);

        return response()->json($docentes);
    }

    /** Ver detalle de un docente. */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['role', 'especialidadDocente.materia'])
            ->whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->findOrFail($id);

        return response()->json([
            'id'             => $user->id,
            'name'           => $user->name,
            'ci'             => $user->ci,
            'email'          => $user->email,
            'codigo'         => $user->codigo,
            'estado'         => $user->estado,
            'materia_id'     => $user->especialidadDocente?->materia_id,
            'materia_nombre' => $user->especialidadDocente?->materia?->nombre,
        ]);
    }

    /** Asignar o actualizar la materia principal de un docente. */
    public function asignarMateria(Request $request, int $id): JsonResponse
    {
        $user = User::whereHas('role', fn($q) => $q->where('name', 'docente'))->findOrFail($id);

        $request->validate([
            'materia_id' => 'required|exists:materias,id',
        ]);

        $materia = Materia::findOrFail($request->materia_id);

        if (!in_array($materia->nombre, self::MATERIAS_VALIDAS)) {
            return response()->json([
                'message' => 'La materia seleccionada no es vÃ¡lida. Solo se permiten: ' . implode(', ', self::MATERIAS_VALIDAS),
            ], 422);
        }

        DocenteEspecialidad::updateOrCreate(
            ['user_id'    => $user->id],
            ['materia_id' => $request->materia_id, 'estado' => 'activo']
        );

        return response()->json([
            'message'        => 'Materia asignada correctamente.',
            'materia_nombre' => $materia->nombre,
        ]);
    }

    /** Lista las materias disponibles para asignar. */
    public function materias(): JsonResponse
    {
        $materias = Materia::whereIn('nombre', self::MATERIAS_VALIDAS)
            ->where('estado', 'activo')
            ->get(['id', 'nombre', 'codigo']);

        return response()->json($materias);
    }
}
