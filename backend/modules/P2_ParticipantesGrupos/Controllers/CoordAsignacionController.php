<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Postulante;
use App\Models\User;
use App\Models\DocenteEspecialidad;
use App\Models\DocenteGrupoAsignacion;
use App\Models\Materia;
use App\Models\Carrera;
use App\Models\GrupoHorario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CoordAsignacionController extends Controller
{
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 4.1  AsignaciÃ³n automÃ¡tica de postulantes
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    public function asignarPostulantesAuto(): JsonResponse
    {
        // 1. Obtener postulantes INSCRITOS
        $postulantes = Postulante::where('estado_tramite', 'INSCRITO')->get();

        // 2. Verificar si existen postulantes INSCRITOS sin preferencia_turno
        $sinTurno = $postulantes->filter(fn($p) => empty($p->preferencia_turno) || !in_array($p->preferencia_turno, ['manana', 'tarde', 'noche']));

        if ($sinTurno->isNotEmpty()) {
            return response()->json([
                'message' => 'Existen postulantes inscritos sin turno elegido. Debe asignarles un turno antes de generar grupos.'
            ], 422);
        }

        // 3. Generar y asignar grupos en una transacciÃ³n
        \DB::transaction(function () use ($postulantes) {
            // Eliminar grupos anteriores (todos los que tengan cÃ³digo asignado)
            Grupo::whereNotNull('codigo')->delete();

            $turnosInfo = [
                'manana' => ['prefix' => 'M', 'label' => 'maÃ±ana'],
                'tarde'  => ['prefix' => 'T', 'label' => 'tarde'],
                'noche'  => ['prefix' => 'N', 'label' => 'noche'],
            ];

            foreach ($turnosInfo as $turnoKey => $info) {
                $postsTurno = $postulantes->where('preferencia_turno', $turnoKey)->values();
                if ($postsTurno->isEmpty()) {
                    continue;
                }

                // Chunk postulantes by 70
                $chunks = $postsTurno->chunk(70);
                foreach ($chunks as $chunkIndex => $chunk) {
                    $grupoNum = $chunkIndex + 1;
                    $codigo = $info['prefix'] . $grupoNum;

                    // Crear grupo activo
                    $grupo = Grupo::create([
                        'codigo'           => $codigo,
                        'nombre_grupo'     => $codigo,
                        'turno'            => $info['label'],
                        'dias'             => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
                        'cupo_maximo'      => 70,
                        'capacidad_maxima' => 70,
                        'estado'           => 'activo',
                        'gestion'          => 'I-2026',
                    ]);

                    // Generar horarios automÃ¡ticos
                    $this->generarHorarios($grupo);

                    // Asignar postulantes
                    $grupo->postulantes()->sync($chunk->pluck('id')->toArray());
                }
            }
        });

        $totalInscritos = $postulantes->count();
        $grupos = Grupo::whereNotNull('codigo')->where('estado', 'activo')->get();

        return response()->json([
            'message'           => "GeneraciÃ³n y asignaciÃ³n de grupos completada con Ã©xito. Creados " . $grupos->count() . " grupos.",
            'total_inscritos'   => $totalInscritos,
            'total_grupos'      => $grupos->count(),
            'asignados'         => $totalInscritos,
            'sin_grupo'         => 0,
            'grupos_llenos'     => $grupos->filter(fn($g) => $g->postulantes()->count() >= 70)->count(),
            'grupos_disponibles'=> $grupos->filter(fn($g) => $g->postulantes()->count() < 70)->count(),
        ]);
    }

    /** Postulantes asignados a un grupo especÃ­fico. */
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 4.2  AsignaciÃ³n de docentes a grupos/materias
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /** Docentes disponibles para una materia especÃ­fica (sin conflictos). */
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

        // Filtrar docentes con â‰¤4 grupos asignados
        $docenteIds = $docenteIds->filter(function ($uid) {
            $grupos = DocenteGrupoAsignacion::where('docente_user_id', $uid)
                ->where('estado', 'activo')
                ->distinct('grupo_id')
                ->count('grupo_id');
            return $grupos < 4;
        });

        // Filtrar sin superposiciÃ³n horaria
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

        // Determinar dÃ­as a asignar: todos los del grupo o solo el dÃ­a indicado
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
                    'turno'           => $grupo->turno ?? 'maÃ±ana',
                    'hora_inicio'     => $request->hora_inicio,
                    'hora_fin'        => $request->hora_fin,
                    'estado'          => 'activo',
                ]
            );
        }

        $diasLabel = $todosLosDias ? 'todos los dÃ­as' : $dias[0];
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 4.0  EstadÃ­sticas de asignaciÃ³n
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /** Devuelve estadÃ­sticas globales: inscritos, grupos, asignados, sin grupo, ocupaciÃ³n por grupo. */
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // 4.3  AsignaciÃ³n automÃ¡tica de docentes
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /**
     * Asigna docentes automÃ¡ticamente a todas las materias de grupos activos.
     * Por cada (grupo, materia) sin docente asignado, busca el primer docente disponible:
     *   - Tiene la especialidad de la materia.
     *   - EstÃ¡ activo.
     *   - No supera 4 grupos.
     *   - No tiene conflicto de horario en el dÃ­a representativo.
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

            // Obtener una Ãºnica entrada por materia (dÃ­a representativo = primero)
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

                // Â¿Ya tiene docente asignado en este grupo+materia?
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

                // Asignar para todos los dÃ­as del grupo
                foreach ($dias as $dia) {
                    DocenteGrupoAsignacion::updateOrCreate(
                        ['grupo_id' => $grupo->id, 'materia_id' => $materiaId, 'dia' => $dia],
                        [
                            'docente_user_id' => $docente->id,
                            'turno'           => $grupo->turno ?? 'maÃ±ana',
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
            'message'         => "AsignaciÃ³n completada. Asignadas: {$asignadas}, Sin docente: {$sinDocente}.",
            'total_materias'  => $totalMaterias,
            'asignadas'       => $asignadas,
            'sin_docente'     => $sinDocente,
            'docentes_usados' => count($docentesUsados),
            'detalle'         => $detalle,
        ]);
    }

    // â”€â”€ Helper: detecciÃ³n de conflicto â”€â”€
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

    public function postulantesSinGrupo(Request $request): JsonResponse
    {
        $yaAsignados = \DB::table('grupo_postulante')
            ->join('grupos', 'grupo_postulante.grupo_id', '=', 'grupos.id')
            ->where('grupos.estado', 'activo')
            ->pluck('grupo_postulante.postulante_id')
            ->toArray();

        $query = Postulante::where('estado_tramite', 'INSCRITO')
            ->whereNotIn('id', $yaAsignados);

        if ($request->filled('carrera_id')) {
            $carrera = Carrera::find($request->carrera_id);
            if ($carrera) {
                $query->where(function($q) use ($carrera) {
                    $q->where('carrera_postulada', 'ilike', "%{$carrera->nombre}%")
                      ->orWhere('carrera_postulada', 'ilike', "%{$carrera->codigo}%");
                });
            }
        }

        $postulantes = $query->get()->map(fn($p) => [
            'id' => $p->id,
            'nombres' => $p->nombres,
            'apellidos' => $p->apellidos,
            'name' => trim($p->nombres . ' ' . $p->apellidos),
            'ci' => $p->ci,
            'email' => $p->email,
            'carrera_postulada' => $p->carrera_postulada,
        ]);

        return response()->json($postulantes);
    }

    public function asignarEstudiantes(Request $request, int $grupoId): JsonResponse
    {
        $request->validate([
            'postulante_ids' => 'required|array|min:1',
            'postulante_ids.*' => 'exists:postulantes,id',
        ]);

        $grupo = Grupo::where('estado', 'activo')->findOrFail($grupoId);

        $cupo = $grupo->cupo_maximo ?? $grupo->capacidad_maxima ?? 70;
        $actual = $grupo->postulantes()->count();
        $nuevos = count($request->postulante_ids);

        if ($actual + $nuevos > 70) {
            return response()->json([
                'message' => "No se puede realizar la asignaciÃ³n. El grupo superarÃ­a el lÃ­mite de 70 estudiantes (actual: {$actual}, intentando agregar: {$nuevos})."
            ], 422);
        }

        // Validate duplicates and active groups
        foreach ($request->postulante_ids as $pid) {
            if ($grupo->postulantes()->where('postulantes.id', $pid)->exists()) {
                continue;
            }
            $inOtherActive = \DB::table('grupo_postulante')
                ->join('grupos', 'grupo_postulante.grupo_id', '=', 'grupos.id')
                ->where('grupo_postulante.postulante_id', $pid)
                ->where('grupos.estado', 'activo')
                ->where('grupos.id', '!=', $grupoId)
                ->exists();

            if ($inOtherActive) {
                $postulante = Postulante::find($pid);
                $name = $postulante ? trim($postulante->nombres . ' ' . $postulante->apellidos) : "ID: {$pid}";
                return response()->json([
                    'message' => "El estudiante {$name} ya se encuentra asignado a otro grupo activo."
                ], 422);
            }
        }

        $grupo->postulantes()->syncWithoutDetaching($request->postulante_ids);

        return response()->json([
            'message' => 'Estudiantes asignados correctamente al grupo.',
            'ocupacion' => $grupo->postulantes()->count(),
        ]);
    }

    public function asignarDocenteAGrupo(Request $request, int $grupoId): JsonResponse
    {
        $request->merge(['grupo_id' => $grupoId]);
        return $this->asignarDocente($request);
    }

    private function generarHorarios(Grupo $grupo): void
    {
        $materias = Materia::where('estado', 'activo')->get();
        $dias = is_array($grupo->dias) ? $grupo->dias : ($grupo->dias ? json_decode($grupo->dias, true) : ['lunes']);

        foreach ($dias as $dia) {
            $diaLower = strtolower($dia);
            $materiasDelDia = ['ComputaciÃ³n', 'FÃ­sica'];
            if (in_array($diaLower, ['miercoles', 'jueves'])) {
                $materiasDelDia = ['InglÃ©s', 'MatemÃ¡ticas'];
            }

            $mats = $materias->filter(fn($m) => in_array($m->nombre, $materiasDelDia))
                ->sortBy(fn($m) => array_search($m->nombre, $materiasDelDia))
                ->values();

            foreach ($mats as $idx => $materia) {
                $horario = $this->getHorarioBloque($grupo->turno, $diaLower, $idx);
                GrupoHorario::updateOrCreate(
                    ['grupo_id' => $grupo->id, 'materia_id' => $materia->id, 'dia' => $diaLower],
                    ['hora_inicio' => $horario['inicio'], 'hora_fin' => $horario['fin']]
                );
            }
        }
    }

    private function getHorarioBloque(string $turno, string $dia, int $blockIndex): array
    {
        $esLmv = in_array(strtolower($dia), ['lunes', 'miercoles', 'viernes']);
        $turnoNormalized = str_replace(['maÃ±ana', 'tarde', 'noche'], ['manana', 'tarde', 'noche'], strtolower($turno));

        if ($esLmv) {
            if ($blockIndex === 0) {
                switch ($turnoNormalized) {
                    case 'tarde': return ['inicio' => '13:00:00', 'fin' => '14:30:00'];
                    case 'noche': return ['inicio' => '18:00:00', 'fin' => '19:30:00'];
                    default:      return ['inicio' => '07:00:00', 'fin' => '08:30:00'];
                }
            } else {
                switch ($turnoNormalized) {
                    case 'tarde': return ['inicio' => '14:30:00', 'fin' => '16:00:00'];
                    case 'noche': return ['inicio' => '19:30:00', 'fin' => '21:00:00'];
                    default:      return ['inicio' => '08:30:00', 'fin' => '10:00:00'];
                }
            }
        } else {
            if ($blockIndex === 0) {
                switch ($turnoNormalized) {
                    case 'tarde': return ['inicio' => '13:00:00', 'fin' => '15:15:00'];
                    case 'noche': return ['inicio' => '18:00:00', 'fin' => '20:15:00'];
                    default:      return ['inicio' => '07:00:00', 'fin' => '09:15:00'];
                }
            } else {
                switch ($turnoNormalized) {
                    case 'tarde': return ['inicio' => '15:15:00', 'fin' => '17:30:00'];
                    case 'noche': return ['inicio' => '20:15:00', 'fin' => '22:30:00'];
                    default:      return ['inicio' => '09:15:00', 'fin' => '11:30:00'];
                }
            }
        }
    }
}
