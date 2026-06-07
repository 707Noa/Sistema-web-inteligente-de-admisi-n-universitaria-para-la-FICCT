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
    private const MATERIAS_VALIDAS = ['Computación', 'Física', 'Inglés', 'Matemáticas'];

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

        // Docentes con más carga asignada (unique groups)
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

        // Alertas académicas
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

        // 2. Docentes con 4 o más grupos
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

        // 3. Grupos llenos o cerca de 70 (cupo >= 65 estudiantes)
        $gruposLlenos = Grupo::where('estado', 'activo')
            ->get()
            ->filter(function($g) {
                return $g->ocupacion() >= 65;
            });
        foreach ($gruposLlenos as $g) {
            $alertas[] = [
                'tipo' => 'grupo_lleno',
                'mensaje' => "El grupo " . ($g->codigo ?? $g->nombre_grupo) . " está cerca del límite de 70 estudiantes (" . $g->ocupacion() . "/70).",
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
                'message' => 'La materia seleccionada no es válida. Solo se permiten: ' . implode(', ', self::MATERIAS_VALIDAS),
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
