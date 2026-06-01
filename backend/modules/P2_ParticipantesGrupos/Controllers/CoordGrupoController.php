<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\GrupoHorario;
use App\Models\Materia;
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

    /** Lista grupos coordinados (con codigo/turno). */
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

        $grupos = $query->orderBy('codigo')->get()->map(fn($g) => [
            'id'           => $g->id,
            'codigo'       => $g->codigo,
            'turno'        => $g->turno,
            'dias'         => $g->dias ?? [],
            'cupo_maximo'  => $g->cupo_maximo ?? $g->capacidad_maxima ?? 40,
            'estado'       => $g->estado,
            'ocupacion'    => $g->ocupacion(),
            'horarios'     => $g->horarios->map(fn($h) => [
                'materia_id'    => $h->materia_id,
                'materia_nombre'=> $h->materia?->nombre,
                'dia'           => $h->dia,
                'hora_inicio'   => substr($h->hora_inicio, 0, 5),
                'hora_fin'      => substr($h->hora_fin, 0, 5),
            ]),
        ]);

        return response()->json($grupos);
    }

    /** Crear grupo con horarios automáticos. */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'codigo'      => 'required|string|max:10|unique:grupos,codigo',
            'turno'       => 'required|in:mañana,tarde,noche',
            'dias'        => 'required|array|min:1',
            'dias.*'      => 'in:lunes,martes,miercoles,jueves,viernes,sabado',
            'cupo_maximo' => 'required|integer|min:1|max:200',
        ]);

        $grupo = Grupo::create([
            'codigo'      => strtoupper($request->codigo),
            'nombre_grupo'=> strtoupper($request->codigo),
            'turno'       => $request->turno,
            'dias'        => $request->dias,
            'cupo_maximo' => $request->cupo_maximo,
            'capacidad_maxima' => $request->cupo_maximo,
            'estado'      => 'activo',
        ]);

        $this->generarHorarios($grupo);

        return response()->json([
            'message' => 'Grupo creado correctamente.',
            'grupo'   => $this->formatGrupo($grupo->fresh(['horarios.materia'])),
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

    /** Editar grupo (solo datos que no rompen horarios). */
    public function update(Request $request, int $id): JsonResponse
    {
        $grupo = Grupo::whereNotNull('codigo')->findOrFail($id);

        $request->validate([
            'codigo'      => "required|string|max:10|unique:grupos,codigo,{$id}",
            'turno'       => 'required|in:mañana,tarde,noche',
            'dias'        => 'required|array|min:1',
            'dias.*'      => 'in:lunes,martes,miercoles,jueves,viernes,sabado',
            'cupo_maximo' => 'required|integer|min:1|max:200',
        ]);

        $turnoChanged = $grupo->turno !== $request->turno;

        $grupo->update([
            'codigo'      => strtoupper($request->codigo),
            'nombre_grupo'=> strtoupper($request->codigo),
            'turno'       => $request->turno,
            'dias'        => $request->dias,
            'cupo_maximo' => $request->cupo_maximo,
            'capacidad_maxima' => $request->cupo_maximo,
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

    /** Activar o inactivar un grupo. */
    public function toggleEstado(int $id): JsonResponse
    {
        $grupo = Grupo::whereNotNull('codigo')->findOrFail($id);
        $nuevo = $grupo->estado === 'activo' ? 'inactivo' : 'activo';
        $grupo->update(['estado' => $nuevo]);

        return response()->json(['message' => "Grupo {$nuevo}.", 'estado' => $nuevo]);
    }

    // ── Helpers privados ──

    private function generarHorarios(Grupo $grupo): void
    {
        $turnoConfig = self::TURNOS[$grupo->turno] ?? self::TURNOS['mañana'];
        $materias    = Materia::whereIn('nombre', self::MATERIAS_ORDEN)
            ->where('estado', 'activo')
            ->get()
            ->sortBy(fn($m) => array_search($m->nombre, self::MATERIAS_ORDEN));

        $horaBase = (int) substr($turnoConfig['inicio'], 0, 2);
        $dias     = is_array($grupo->dias) ? $grupo->dias : ($grupo->dias ? json_decode($grupo->dias, true) : ['lunes']);

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
            'dias'        => $g->dias ?? [],
            'cupo_maximo' => $g->cupo_maximo ?? $g->capacidad_maxima ?? 40,
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
