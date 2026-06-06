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
        'tarde'  => ['inicio' => '12:00', 'fin' => '16:00'],
        'noche'  => ['inicio' => '16:00', 'fin' => '20:00'],
    ];

    private const MATERIAS_ORDEN = ['Computación', 'Física', 'Inglés', 'Matemáticas'];

    private const AULAS = [11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26];

    private const CUPO = 70;

    /** Lista grupos coordinados con código, turno y aula. */
    public function index(Request $request): JsonResponse
    {
        $query = Grupo::with(['horarios.materia'])
            ->whereNotNull('codigo');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }
        if ($request->filled('turno')) {
            $query->where('turno', $request->turno);
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
        $grupo = Grupo::with(['horarios.materia', 'postulantes', 'asignaciones.docente', 'asignaciones.materia'])
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
            'estado' => 'required|in:activo,inactivo',
        ]);

        $grupo->update(['estado' => $request->estado]);

        return response()->json([
            'message' => 'Estado del grupo actualizado.',
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
    private function generarHorarios(Grupo $grupo): void
    {
        $turnoConfig = self::TURNOS[$grupo->turno] ?? self::TURNOS['mañana'];
        $materias    = Materia::whereIn('nombre', self::MATERIAS_ORDEN)
            ->where('estado', 'activo')
            ->get()
            ->sortBy(fn($m) => array_search($m->nombre, self::MATERIAS_ORDEN));

        $horaBase = (int) substr($turnoConfig['inicio'], 0, 2);
        $dias     = is_array($grupo->dias) ? $grupo->dias : ['lunes'];

        foreach ($dias as $dia) {
            foreach ($materias->values() as $idx => $materia) {
                $inicio = sprintf('%02d:00:00', $horaBase + $idx);
                $fin    = sprintf('%02d:00:00', $horaBase + $idx + 1);
                GrupoHorario::updateOrCreate(
                    ['grupo_id' => $grupo->id, 'materia_id' => $materia->id, 'dia' => $dia],
                    ['hora_inicio' => $inicio, 'hora_fin' => $fin]
                );
            }
        }
    }

    private function formatGrupo(Grupo $g): array
    {
        return [
            'id'          => $g->id,
            'codigo'      => $g->codigo,
            'turno'       => $g->turno,
            'aula'        => $g->aula ?? '-',
            'dias'        => $g->dias ?? [],
            'cupo_maximo' => self::CUPO,
            'estado'      => $g->estado,
            'ocupacion'   => $g->ocupacion(),
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
}
