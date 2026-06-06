<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Postulante;
use App\Models\User;
use App\Models\DocenteEspecialidad;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CoordAsignacionController extends Controller
{
    // ══════════════════════════════════════════════
    // 4.1  Asignación automática de postulantes
    // ══════════════════════════════════════════════

    public function asignarPostulantesAuto(): JsonResponse
    {
        $grupos = Grupo::whereNotNull('codigo')
            ->where('estado', 'activo')
            ->with('postulantes')
            ->get();

        if ($grupos->isEmpty()) {
            return response()->json(['message' => 'No existen grupos activos disponibles.'], 422);
        }

        // Postulantes INSCRITOS sin grupo activo asignado
        $yaAsignados = \DB::table('grupo_postulante')
            ->join('grupos', 'grupo_postulante.grupo_id', '=', 'grupos.id')
            ->where('grupos.estado', 'activo')
            ->pluck('grupo_postulante.postulante_id')
            ->toArray();

        $postulantes = Postulante::where('estado_tramite', 'INSCRITO')
            ->whereNotIn('id', $yaAsignados)
            ->get();

        if ($postulantes->isEmpty()) {
            return response()->json(['message' => 'No existen postulantes inscritos disponibles para asignar.'], 422);
        }

        $asignados  = 0;
        $sinGrupo   = 0;
        $postQueue  = $postulantes->values();
        $cursor     = 0;

        foreach ($grupos as $grupo) {
            $cupo    = $grupo->cupo_maximo ?? $grupo->capacidad_maxima ?? 40;
            $ocupados= $grupo->postulantes->count();
            $libres  = max(0, $cupo - $ocupados);

            while ($libres > 0 && $cursor < $postQueue->count()) {
                $postulante = $postQueue[$cursor];
                $grupo->postulantes()->syncWithoutDetaching([$postulante->id]);
                $asignados++;
                $libres--;
                $cursor++;
            }
        }

        $sinGrupo = $postQueue->count() - $cursor;

        $gruposLlenos    = $grupos->filter(fn($g) => $g->estaLleno())->count();
        $gruposDisponibles = $grupos->count() - $gruposLlenos;

        return response()->json([
            'message'           => "Asignación completada. Asignados: {$asignados}, Sin grupo: {$sinGrupo}.",
            'total_inscritos'   => $postQueue->count(),
            'total_grupos'      => $grupos->count(),
            'asignados'         => $asignados,
            'sin_grupo'         => $sinGrupo,
            'grupos_llenos'     => $gruposLlenos,
            'grupos_disponibles'=> $gruposDisponibles,
        ]);
    }

    /** Postulantes asignados a un grupo específico. */
    public function postulantesEnGrupo(int $grupoId): JsonResponse
    {
        $grupo = Grupo::with('postulantes')->findOrFail($grupoId);
        return response()->json([
            'grupo'      => $grupo->codigo ?? $grupo->nombre_grupo,
            'postulantes'=> $grupo->postulantes->map(fn($p) => [
                'id'             => $p->id,
                'nombres'        => $p->nombres,
                'apellidos'      => $p->apellidos,
                'ci'             => $p->ci,
                'email'          => $p->email,
                'codigo_usuario' => $p->codigo_usuario,
                'carrera'        => $p->carrera ?? $p->carrera_postulada,
            ]),
        ]);
    }

    // ══════════════════════════════════════════════
    // 4.2  Asignación de docentes a grupos/materias
    // ══════════════════════════════════════════════

    /** Docentes disponibles para una materia específica (sin conflictos). */
    public function docentesDisponibles(Request $request): JsonResponse
    {
        $request->validate([
            'materia_id' => 'required|exists:materias,id',
            'grupo_id'   => 'required|exists:grupos,id',
            'dia'        => 'required|string',
            'hora_inicio'=> 'required|string',
            'hora_fin'   => 'required|string',
        ]);

        $materia = Materia::findOrFail($request->materia_id);

        // IDs de usuarios docentes con esta materia y activos
        $docenteIds = DocenteEspecialidad::where('materia_id', $request->materia_id)
            ->where('estado', 'activo')
            ->pluck('user_id');

        if ($docenteIds->isEmpty()) {
            return response()->json(['message' => "No existen docentes activos para {$materia->nombre}.", 'docentes' => []]);
        }

        // Filtrar docentes con ≤4 grupos asignados
        $docenteIds = $docenteIds->filter(function ($uid) {
            $grupos = DocenteGrupoAsignacion::where('docente_user_id', $uid)
                ->where('estado', 'activo')
                ->distinct('grupo_id')
                ->count('grupo_id');
            return $grupos < 4;
        });

        // Filtrar sin superposición horaria
        $disponibles = User::whereIn('id', $docenteIds)
            ->where('estado', 'activo')
            ->get()
            ->filter(function ($user) use ($request) {
                return !$this->tieneConflicto(
                    $user->id,
                    $request->dia,
                    $request->hora_inicio,
                    $request->hora_fin,
                    null
                );
            })
            ->map(fn($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'ci'    => $u->ci,
                'email' => $u->email,
            ]);

        return response()->json(['docentes' => $disponibles->values()]);
    }

    /** Asignar docente a una materia+horario de un grupo. */
    public function asignarDocente(Request $request): JsonResponse
    {
        $request->validate([
            'docente_user_id' => 'required|exists:users,id',
            'grupo_id'        => 'required|exists:grupos,id',
            'materia_id'      => 'required|exists:materias,id',
            'dia'             => 'required_without:todos_los_dias|nullable|string',
            'hora_inicio'     => 'required|string',
            'hora_fin'        => 'required|string',
            'todos_los_dias'  => 'boolean',
        ]);

        $docente = User::findOrFail($request->docente_user_id);
        $grupo   = Grupo::findOrFail($request->grupo_id);
        $materia = Materia::findOrFail($request->materia_id);

        // Validaciones
        if ($docente->estado !== 'activo') {
            return response()->json(['message' => 'El docente se encuentra inactivo.'], 422);
        }
        if ($grupo->estado !== 'activo') {
            return response()->json(['message' => 'El grupo se encuentra inactivo.'], 422);
        }

        $especialidad = DocenteEspecialidad::where('user_id', $docente->id)->first();
        if (!$especialidad) {
            return response()->json(['message' => 'El docente no tiene materia asignada.'], 422);
        }
        if ($especialidad->materia_id !== $request->materia_id) {
            return response()->json(['message' => 'El docente no corresponde a la materia seleccionada.'], 422);
        }

        $totalGrupos = DocenteGrupoAsignacion::where('docente_user_id', $docente->id)
            ->where('estado', 'activo')
            ->distinct('grupo_id')
            ->count('grupo_id');
        if ($totalGrupos >= 4) {
            return response()->json(['message' => 'El docente ya tiene 4 grupos asignados.'], 422);
        }

        // Determinar días a asignar: todos los del grupo o solo el día indicado
        $todosLosDias = $request->boolean('todos_los_dias', false);
        $diasGrupo    = is_array($grupo->dias) ? $grupo->dias : ['lunes'];
        $dias         = $todosLosDias ? $diasGrupo : [$request->dia ?? $diasGrupo[0]];
        $diaConflicto = $dias[0];

        if ($this->tieneConflicto($docente->id, $diaConflicto, $request->hora_inicio, $request->hora_fin, null)) {
            return response()->json(['message' => 'El docente ya tiene una clase asignada en ese horario.'], 422);
        }

        foreach ($dias as $dia) {
            DocenteGrupoAsignacion::updateOrCreate(
                [
                    'grupo_id'   => $request->grupo_id,
                    'materia_id' => $request->materia_id,
                    'dia'        => $dia,
                ],
                [
                    'docente_user_id' => $request->docente_user_id,
                    'turno'           => $grupo->turno ?? 'mañana',
                    'hora_inicio'     => $request->hora_inicio,
                    'hora_fin'        => $request->hora_fin,
                    'estado'          => 'activo',
                ]
            );
        }

        $diasLabel = $todosLosDias ? 'todos los días' : $dias[0];
        return response()->json([
            'message' => "Docente {$docente->name} asignado a {$materia->nombre} en grupo {$grupo->codigo} ({$diasLabel}).",
        ]);
    }

    /** Lista todas las asignaciones de docentes. */
    public function getAsignaciones(Request $request): JsonResponse
    {
        $query = DocenteGrupoAsignacion::with(['docente', 'grupo', 'materia'])
            ->where('estado', 'activo');

        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }

        return response()->json($query->get()->map(fn($a) => [
            'id'             => $a->id,
            'docente_name'   => $a->docente?->name,
            'docente_ci'     => $a->docente?->ci,
            'grupo_codigo'   => $a->grupo?->codigo,
            'materia_nombre' => $a->materia?->nombre,
            'dia'            => $a->dia,
            'turno'          => $a->turno,
            'hora_inicio'    => substr($a->hora_inicio, 0, 5),
            'hora_fin'       => substr($a->hora_fin, 0, 5),
        ]));
    }

    // ══════════════════════════════════════════════
    // 4.0  Estadísticas de asignación
    // ══════════════════════════════════════════════

    /** Devuelve estadísticas globales: inscritos, grupos, asignados, sin grupo, ocupación por grupo. */
    public function statsAsignacion(): JsonResponse
    {
        $totalInscritos = Postulante::where('estado_tramite', 'INSCRITO')->count();

        $totalGrupos = Grupo::whereNotNull('codigo')->where('estado', 'activo')->count();

        $asignados = DB::table('grupo_postulante')
            ->join('grupos',     'grupo_postulante.grupo_id',     '=', 'grupos.id')
            ->join('postulantes','grupo_postulante.postulante_id','=', 'postulantes.id')
            ->where('grupos.estado',            'activo')
            ->where('postulantes.estado_tramite','INSCRITO')
            ->distinct()
            ->count('grupo_postulante.postulante_id');

        $sinGrupo = max(0, $totalInscritos - $asignados);

        $grupos = Grupo::whereNotNull('codigo')
            ->where('estado', 'activo')
            ->withCount('postulantes')
            ->orderBy('codigo')
            ->get()
            ->map(fn($g) => [
                'id'          => $g->id,
                'codigo'      => $g->codigo,
                'turno'       => $g->turno,
                'aula'        => $g->aula ?? '-',
                'ocupacion'   => $g->postulantes_count,
                'cupo_maximo' => $g->cupo_maximo ?? 70,
            ]);

        return response()->json([
            'total_inscritos' => $totalInscritos,
            'total_grupos'    => $totalGrupos,
            'asignados'       => $asignados,
            'sin_grupo'       => $sinGrupo,
            'grupos'          => $grupos,
        ]);
    }

    // ══════════════════════════════════════════════
    // 4.3  Asignación automática de docentes
    // ══════════════════════════════════════════════

    /**
     * Asigna docentes automáticamente a todas las materias de grupos activos.
     * Por cada (grupo, materia) sin docente asignado, busca el primer docente disponible:
     *   - Tiene la especialidad de la materia.
     *   - Está activo.
     *   - No supera 4 grupos.
     *   - No tiene conflicto de horario en el día representativo.
     */
    public function asignarDocentesAuto(): JsonResponse
    {
        $grupos = Grupo::whereNotNull('codigo')
            ->where('estado', 'activo')
            ->with(['horarios.materia'])
            ->orderBy('codigo')
            ->get();

        if ($grupos->isEmpty()) {
            return response()->json(['message' => 'No existen grupos activos disponibles.'], 422);
        }

        $totalMaterias   = 0;
        $asignadas       = 0;
        $sinDocente      = 0;
        $docentesUsados  = [];
        $detalle         = [];

        foreach ($grupos as $grupo) {
            $dias = is_array($grupo->dias) ? $grupo->dias : ['lunes'];

            // Obtener una única entrada por materia (día representativo = primero)
            $materiasPorId = [];
            foreach ($grupo->horarios as $h) {
                if (!isset($materiasPorId[$h->materia_id])) {
                    $materiasPorId[$h->materia_id] = $h;
                }
            }

            foreach ($materiasPorId as $materiaId => $horario) {
                $totalMaterias++;
                $materiaLabel  = $horario->materia?->nombre ?? "Materia #{$materiaId}";
                $horarioLabel  = substr($horario->hora_inicio, 0, 5) . ' - ' . substr($horario->hora_fin, 0, 5);
                $diaRepres     = $dias[0] ?? 'lunes';

                // ¿Ya tiene docente asignado en este grupo+materia?
                $asigExistente = DocenteGrupoAsignacion::where('grupo_id',   $grupo->id)
                    ->where('materia_id', $materiaId)
                    ->where('estado',     'activo')
                    ->with('docente')
                    ->first();

                if ($asigExistente) {
                    $asignadas++;
                    $detalle[] = [
                        'grupo'   => $grupo->codigo,
                        'materia' => $materiaLabel,
                        'horario' => $horarioLabel,
                        'docente' => $asigExistente->docente?->name ?? '-',
                        'estado'  => 'ya_asignado',
                    ];
                    continue;
                }

                // Buscar docente disponible
                $candidatos = DocenteEspecialidad::where('materia_id', $materiaId)
                    ->where('estado', 'activo')
                    ->pluck('user_id');

                $docente = User::whereIn('id', $candidatos)
                    ->where('estado', 'activo')
                    ->get()
                    ->first(function ($u) use ($diaRepres, $horario) {
                        $gruposAsignados = DocenteGrupoAsignacion::where('docente_user_id', $u->id)
                            ->where('estado', 'activo')
                            ->distinct('grupo_id')
                            ->count('grupo_id');
                        if ($gruposAsignados >= 4) return false;
                        return !$this->tieneConflicto(
                            $u->id, $diaRepres,
                            $horario->hora_inicio, $horario->hora_fin, null
                        );
                    });

                if (!$docente) {
                    $sinDocente++;
                    $detalle[] = [
                        'grupo'   => $grupo->codigo,
                        'materia' => $materiaLabel,
                        'horario' => $horarioLabel,
                        'docente' => null,
                        'estado'  => 'sin_docente',
                    ];
                    continue;
                }

                // Asignar para todos los días del grupo
                foreach ($dias as $dia) {
                    DocenteGrupoAsignacion::updateOrCreate(
                        ['grupo_id' => $grupo->id, 'materia_id' => $materiaId, 'dia' => $dia],
                        [
                            'docente_user_id' => $docente->id,
                            'turno'           => $grupo->turno ?? 'mañana',
                            'hora_inicio'     => $horario->hora_inicio,
                            'hora_fin'        => $horario->hora_fin,
                            'estado'          => 'activo',
                        ]
                    );
                }

                $asignadas++;
                if (!in_array($docente->id, $docentesUsados)) {
                    $docentesUsados[] = $docente->id;
                }
                $detalle[] = [
                    'grupo'   => $grupo->codigo,
                    'materia' => $materiaLabel,
                    'horario' => $horarioLabel,
                    'docente' => $docente->name,
                    'estado'  => 'asignado',
                ];
            }
        }

        return response()->json([
            'message'         => "Asignación completada. Asignadas: {$asignadas}, Sin docente: {$sinDocente}.",
            'total_materias'  => $totalMaterias,
            'asignadas'       => $asignadas,
            'sin_docente'     => $sinDocente,
            'docentes_usados' => count($docentesUsados),
            'detalle'         => $detalle,
        ]);
    }

    // ── Helper: detección de conflicto ──
    private function tieneConflicto(int $docenteId, string $dia, string $horaInicio, string $horaFin, ?int $excludeId): bool
    {
        $query = DocenteGrupoAsignacion::where('docente_user_id', $docenteId)
            ->where('dia', $dia)
            ->where('estado', 'activo')
            ->where('hora_inicio', '<', $horaFin)
            ->where('hora_fin', '>', $horaInicio);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
