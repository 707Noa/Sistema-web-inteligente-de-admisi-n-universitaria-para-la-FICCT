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
                'id'        => $p->id,
                'nombres'   => $p->nombres,
                'apellidos' => $p->apellidos,
                'ci'        => $p->ci,
                'email'     => $p->email,
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
            'dia'             => 'required|string',
            'hora_inicio'     => 'required|string',
            'hora_fin'        => 'required|string',
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

        if ($this->tieneConflicto($docente->id, $request->dia, $request->hora_inicio, $request->hora_fin, null)) {
            return response()->json(['message' => 'El docente ya tiene una clase asignada en ese día y horario.'], 422);
        }

        DocenteGrupoAsignacion::updateOrCreate(
            [
                'grupo_id'   => $request->grupo_id,
                'materia_id' => $request->materia_id,
                'dia'        => $request->dia,
            ],
            [
                'docente_user_id' => $request->docente_user_id,
                'turno'           => $grupo->turno ?? 'mañana',
                'hora_inicio'     => $request->hora_inicio,
                'hora_fin'        => $request->hora_fin,
                'estado'          => 'activo',
            ]
        );

        return response()->json([
            'message' => "Docente {$docente->name} asignado a {$materia->nombre} en grupo {$grupo->codigo}.",
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
