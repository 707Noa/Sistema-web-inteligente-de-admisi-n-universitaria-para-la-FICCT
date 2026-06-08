<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\GrupoHorario;
use App\Models\Materia;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoordGrupoController extends Controller
{
    private const TURNOS = [
        'mañana' => ['inicio' => '08:00', 'fin' => '12:00'],
        'tarde'  => ['inicio' => '13:00', 'fin' => '16:00'],
        'noche'  => ['inicio' => '16:00', 'fin' => '20:00'],
    ];

    private const MATERIAS_ORDEN = ['Computación', 'Física', 'Inglés', 'Matemáticas'];

    private const AULAS = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26];

    private const CUPO = 70;

    /** Lista grupos coordinados con código, turno y aula. */
    public function index(Request $request): JsonResponse
    {
        $query = Grupo::with(['horarios.materia', 'carrera'])
            ->whereNotNull('codigo');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('turno')) {
            $query->where('turno', $request->turno);
        }
        if ($request->filled('carrera_id')) {
            $query->where('carrera_id', $request->carrera_id);
        }


        $grupos = $query->orderBy('codigo')->get()->map(fn($g) => $this->formatGrupo($g));

        return response()->json($grupos);
    }

    /**
     * Genera grupos automáticamente según la fórmula:
     *   CantidadGrupos = CEIL(TotalInscritos / 70)
     *
     * - Solo cuenta postulantes con estado_tramite = 'INSCRITO'.
     * - Distribuye grupos entre turnos: mañana → tarde → noche (rotación).
     * - Códigos: M1, M2 / T1, T2 / N1, N2.
     * - Aulas únicas por turno: 11-16 y 21-26.
     * - No genera si ya existen grupos activos (evita duplicación).
     */
    public function generarGruposAuto(): JsonResponse
    {

        // 1. Contar postulantes INSCRITOS
        $totalInscritos = Postulante::where('estado_tramite', 'INSCRITO')->count();

        if ($totalInscritos === 0) {
            return response()->json([
                'message' => 'No hay postulantes con estado INSCRITO. Inscriba postulantes antes de generar grupos.',
            ], 422);
        }


        // 2. Evitar duplicación si ya existen grupos activos
        $gruposActivos = Grupo::whereNotNull('codigo')->where('estado', 'activo')->count();
        if ($gruposActivos > 0) {
            return response()->json([
                'message'        => 'Ya existen ' . $gruposActivos . ' grupo(s) activo(s). Desactívelos o elimínelos antes de regenerar.',
                'grupos_activos' => $gruposActivos,
                'total_inscritos'=> $totalInscritos,
            ], 409);
        }

        // 3. Calcular cantidad de grupos: CEIL(TotalInscritos / 70)
        $cantidadGrupos = (int) ceil($totalInscritos / self::CUPO);

        // 4. Preparar rotación de turnos y contadores de aulas
        $turnosSecuencia = array_keys(self::TURNOS);           // [mañana, tarde, noche]
        $siglas          = ['mañana' => 'M', 'tarde' => 'T', 'noche' => 'N'];
        $contadores      = ['mañana' => 0, 'tarde' => 0, 'noche' => 0];
        $aulasUsadas     = ['mañana' => [], 'tarde' => [], 'noche' => []];

        $gruposCreados = [];

        for ($i = 0; $i < $cantidadGrupos; $i++) {
            $turno = $turnosSecuencia[$i % 3];
            $contadores[$turno]++;
            $codigo = $siglas[$turno] . $contadores[$turno];

            // 5. Asignar aula libre para este turno (sin choque)
            $aula = null;
            foreach (self::AULAS as $a) {
                if (!in_array($a, $aulasUsadas[$turno])) {
                    $aula = $a;
                    break;
                }
            }
            if ($aula === null) {
                return response()->json([
                    'message' => "Sin aulas disponibles para turno {$turno}. Se crearon " . count($gruposCreados) . " grupo(s).",
                ], 422);
            }
            $aulasUsadas[$turno][] = $aula;

            // 6. Crear grupo
            $grupo = Grupo::create([
                'codigo'           => $codigo,
                'nombre_grupo'     => $codigo,
                'turno'            => $turno,
                'dias'             => ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
                'cupo_maximo'      => self::CUPO,
                'capacidad_maxima' => self::CUPO,
                'aula'             => (string) $aula,
                'estado'           => 'activo',
            ]);

            // 7. Generar horarios automáticos para el turno
            $this->generarHorarios($grupo);

            $gruposCreados[] = $this->formatGrupo($grupo->fresh(['horarios.materia']));
        }

        return response()->json([
            'message'          => "Se generaron {$cantidadGrupos} grupo(s) para {$totalInscritos} postulantes inscritos.",
            'total_inscritos'  => $totalInscritos,
            'grupos_generados' => count($gruposCreados),
            'grupos'           => $gruposCreados,
        ], 201);
    }

    /** Ver detalle de un grupo. */
    public function show(int $id): JsonResponse
    {
        $grupo = Grupo::with(['horarios.materia', 'postulantes', 'asignaciones.docente', 'asignaciones.materia', 'carrera'])
            ->whereNotNull('codigo')
            ->findOrFail($id);

        return response()->json($this->formatGrupoDetalle($grupo));
    }

    /**
     * Edición restringida: solo permite cambiar estado del grupo.
     * Código, cupo máximo y materias son inmutables.
     */

public function update(Request $request, int $id): JsonResponse
{
    $grupo = Grupo::whereNotNull('codigo')->findOrFail($id);

    $request->validate([
        'codigo'      => "required|string|max:10|unique:grupos,codigo,{$id}",
        'turno'       => 'required|in:mañana,tarde,noche',
        'dias'        => 'required|array|min:1',
        'dias.*'      => 'in:lunes,martes,miercoles,jueves,viernes,sabado',
        'cupo_maximo' => 'required|integer|min:1|max:70',
        'carrera_id'  => 'nullable|exists:carreras,id',
        'gestion'     => 'nullable|string|max:20',
        'estado'      => 'nullable|in:activo,inactivo',
        'aula'        => 'nullable|string|max:50',
    ]);

    $turnoChanged = $grupo->turno !== $request->turno;

    $grupo->update([
        'codigo'           => strtoupper($request->codigo),
        'nombre_grupo'     => strtoupper($request->codigo),
        'turno'            => $request->turno,
        'dias'             => $request->dias,
        'cupo_maximo'      => $request->cupo_maximo,
        'capacidad_maxima' => $request->cupo_maximo,
        'carrera_id'       => $request->carrera_id,
        'gestion'          => $request->gestion ?? 'I-2026',
        'aula'             => $request->aula,
        'estado'           => $request->estado ?? $grupo->estado,
    ]);

    if ($turnoChanged) {
        // Regenerar horarios si cambió el turno
        $grupo->horarios()->delete();
        $this->generarHorarios($grupo);
    }

    return response()->json([
        'message' => 'Grupo actualizado correctamente.',
        'grupo'   => $this->formatGrupo($grupo->fresh(['horarios.materia'])),
    ]);
}


    /** Activar o inactivar un grupo (toggle). */
    public function toggleEstado(int $id): JsonResponse
    {
        $grupo = Grupo::whereNotNull('codigo')->findOrFail($id);
        $nuevo = $grupo->estado === 'activo' ? 'inactivo' : 'activo';
        $grupo->update(['estado' => $nuevo]);

        return response()->json(['message' => "Grupo {$nuevo}.", 'estado' => $nuevo]);
    }

    /**
     * Eliminar un grupo: desasigna postulantes, borra horarios y elimina el registro.
     * Útil para limpiar antes de regenerar grupos.
     */
    public function destroy(int $id): JsonResponse
    {
        $grupo = Grupo::whereNotNull('codigo')->findOrFail($id);
        $codigo = $grupo->codigo;

        $grupo->postulantes()->detach();
        $grupo->horarios()->delete();
        $grupo->delete();

        return response()->json(['message' => "Grupo {$codigo} eliminado correctamente."]);
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    /**
     * Genera horarios automáticos para cada materia dentro del turno del grupo.
     * Cada materia ocupa exactamente 1 hora, respetando el bloque del turno.
     */
    private function getBloquesConfig(string $turno): array
    {
        $turnoNormalized = str_replace(['mañana', 'tarde', 'noche'], ['manana', 'tarde', 'noche'], strtolower($turno));
        switch ($turnoNormalized) {
            case 'tarde':
                return [
                    0 => ['inicio' => '13:00:00', 'fin' => '14:00:00'],
                    1 => ['inicio' => '14:00:00', 'fin' => '15:00:00'],
                    2 => ['inicio' => '15:00:00', 'fin' => '16:00:00'],
                ];
            case 'noche':
                return [
                    0 => ['inicio' => '16:00:00', 'fin' => '17:00:00'],
                    1 => ['inicio' => '17:00:00', 'fin' => '18:00:00'],
                    2 => ['inicio' => '18:00:00', 'fin' => '19:00:00'],
                    3 => ['inicio' => '19:00:00', 'fin' => '20:00:00'],
                ];
            default: // manana / mañana
                return [
                    0 => ['inicio' => '08:00:00', 'fin' => '09:00:00'],
                    1 => ['inicio' => '09:00:00', 'fin' => '10:00:00'],
                    2 => ['inicio' => '10:00:00', 'fin' => '11:00:00'],
                    3 => ['inicio' => '11:00:00', 'fin' => '12:00:00'],
                ];
        }
    }

    private function generarHorarios(Grupo $grupo): void
    {
        $turnoConfig = self::TURNOS[$grupo->turno] ?? self::TURNOS['mañana'];

        $materias = Materia::whereIn('nombre', self::MATERIAS_ORDEN)
            ->where('estado', 'activo')
            ->get()
            ->sortBy(fn($m) => array_search($m->nombre, self::MATERIAS_ORDEN))
            ->values();

        $dias = is_array($grupo->dias)
            ? $grupo->dias
            : ($grupo->dias ? json_decode($grupo->dias, true) : ['lunes']);

        if (!is_array($dias) || empty($dias)) {
            $dias = ['lunes'];
        }

        // Obtener ids de otros grupos activos del mismo turno
        $grupoIds = Grupo::where('turno', $grupo->turno)
            ->where('estado', 'activo')
            ->where('id', '!=', $grupo->id)
            ->pluck('id');

        $bloques = $this->getBloquesConfig($grupo->turno);

        foreach ($dias as $dia) {
            $diaLower = strtolower($dia);
            $materiasDelDia = ['Computación', 'Física'];
            if (in_array($diaLower, ['miercoles', 'jueves'])) {
                $materiasDelDia = ['Inglés', 'Matemáticas'];
            }

            $mats = $materias->filter(fn($m) => in_array($m->nombre, $materiasDelDia))
                ->sortBy(fn($m) => array_search($m->nombre, $materiasDelDia))
                ->values();

            // Buscar horarios existentes para el mismo día de otros grupos en este turno
            $horariosExistentes = GrupoHorario::whereIn('grupo_id', $grupoIds)
                ->where('dia', $diaLower)
                ->get();

            // Calcular conflictos para cada bloque
            $conflictCounts = [];
            foreach ($bloques as $bIdx => $bRange) {
                $conflictCounts[$bIdx] = 0;
                foreach ($horariosExistentes as $h) {
                    $horaHStart = substr($h->hora_inicio, 0, 5);
                    $horaBStart = substr($bRange['inicio'], 0, 5);
                    if ($horaHStart === $horaBStart) {
                        $conflictCounts[$bIdx]++;
                    }
                }
            }

            // Ordenar por menor número de conflictos
            asort($conflictCounts);
            $selectedBlockIndices = array_slice(array_keys($conflictCounts), 0, count($mats));
            sort($selectedBlockIndices);

            foreach ($mats as $idx => $materia) {
                $blockIdx = $selectedBlockIndices[$idx] ?? $idx;
                $horario = $bloques[$blockIdx];
                GrupoHorario::updateOrCreate(
                    ['grupo_id' => $grupo->id, 'materia_id' => $materia->id, 'dia' => $diaLower],
                    ['hora_inicio' => $horario['inicio'], 'hora_fin' => $horario['fin']]
                );
            }
        }
    }

    private function getHorarioBloque(string $turno, string $dia, int $blockIndex): array
    {
        $bloques = $this->getBloquesConfig($turno);
        return $bloques[$blockIndex] ?? $bloques[0];
    }

    private function formatGrupo(Grupo $g): array
    {
        return [
            'id'          => $g->id,
            'codigo'      => $g->codigo,
            'turno'       => $g->turno,
            'aula'        => $g->aula ?? '-',
            'dias'        => $g->dias ?? [],
            'cupo_maximo' => $g->cupo_maximo ?? $g->capacidad_maxima ?? 70,
            'estado'      => $g->estado,
            'ocupacion'   => $g->ocupacion(),
            'carrera_id'   => $g->carrera_id,
            'carrera_nombre'=> $g->carrera?->nombre ?? 'Sin carrera',
            'gestion'      => $g->gestion ?? 'I-2026',
            'horarios'    => $g->horarios->map(fn($h) => [
                'materia_id'     => $h->materia_id,
                'materia_nombre' => $h->materia?->nombre,
                'dia'            => $h->dia,
                'hora_inicio'    => substr($h->hora_inicio, 0, 5),
                'hora_fin'       => substr($h->hora_fin, 0, 5),
            ]),
        ];
    }

    private function formatGrupoDetalle(Grupo $g): array
    {
        $base = $this->formatGrupo($g);
        $base['postulantes_count'] = $g->postulantes->count();
        $base['asignaciones'] = $g->asignaciones->map(fn($a) => [
            'docente_name'   => $a->docente?->name,
            'materia_nombre' => $a->materia?->nombre,
            'dia'            => $a->dia,
            'hora_inicio'    => substr($a->hora_inicio, 0, 5),
            'hora_fin'       => substr($a->hora_fin, 0, 5),
        ]);
        return $base;
    }

    public function estudiantes(int $id): JsonResponse
    {
        $grupo = Grupo::with('postulantes')->findOrFail($id);
        return response()->json($grupo->postulantes->map(fn($p) => [
            'id' => $p->id,
            'nombres' => $p->nombres,
            'apellidos' => $p->apellidos,
            'name' => trim($p->nombres . ' ' . $p->apellidos),
            'ci' => $p->ci,
            'email' => $p->email,
            'carrera_postulada' => $p->carrera_postulada,
            'carrera' => $p->carrera,
            'primera_carrera' => $p->carrera_postulada,
            'segunda_carrera' => ($p->carrera && $p->carrera !== $p->carrera_postulada) ? $p->carrera : null,
            'estado_tramite' => $p->estado_tramite,
        ]));
    }

    public function crearHorario(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'materia_id' => 'required|exists:materias,id',
            'dia' => 'required|in:lunes,martes,miercoles,jueves,viernes,sabado',
            'hora_inicio' => 'required|string',
            'hora_fin' => 'required|string',
        ]);

        $horario = GrupoHorario::updateOrCreate(
            [
                'grupo_id' => $request->grupo_id,
                'materia_id' => $request->materia_id,
                'dia' => $request->dia,
            ],
            [
                'hora_inicio' => $request->hora_inicio,
                'hora_fin' => $request->hora_fin,
            ]
        );

        return response()->json([
            'message' => 'Horario creado/actualizado correctamente.',
            'horario' => $horario,
        ]);
    }

    public function calcularGrupos(Request $request): JsonResponse
    {
        $request->validate([
            'total_inscritos' => 'required|integer|min:0',
        ]);

        $cantidad = ceil($request->total_inscritos / 70);

        return response()->json([
            'total_inscritos' => $request->total_inscritos,
            'cantidad_grupos' => max(1, (int)$cantidad),
        ]);
    }
}
