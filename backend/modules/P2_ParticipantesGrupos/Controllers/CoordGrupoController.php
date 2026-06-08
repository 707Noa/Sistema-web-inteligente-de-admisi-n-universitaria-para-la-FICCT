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

    /** Lista grupos coordinados (con codigo/turno). */
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

        $grupos = $query->orderBy('codigo')->get()->map(fn($g) => [
            'id'           => $g->id,
            'codigo'       => $g->codigo,
            'turno'        => $g->turno,
            'dias'         => $g->dias ?? [],
            'cupo_maximo'  => $g->cupo_maximo ?? $g->capacidad_maxima ?? 70,
            'estado'       => $g->estado,
            'ocupacion'    => $g->ocupacion(),
            'carrera_id'   => $g->carrera_id,
            'carrera_nombre'=> $g->carrera?->nombre ?? 'Sin carrera',
            'gestion'      => $g->gestion ?? 'I-2026',
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
            'cupo_maximo' => 'required|integer|min:1|max:70',
            'carrera_id'  => 'nullable|exists:carreras,id',
            'gestion'     => 'nullable|string|max:20',
        ]);

        $grupo = Grupo::create([
            'codigo'      => strtoupper($request->codigo),
            'nombre_grupo'=> strtoupper($request->codigo),
            'turno'       => $request->turno,
            'dias'        => $request->dias,
            'cupo_maximo' => $request->cupo_maximo,
            'capacidad_maxima' => $request->cupo_maximo,
            'carrera_id'  => $request->carrera_id,
            'gestion'     => $request->gestion ?? 'I-2026',
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
        $grupo = Grupo::with(['horarios.materia', 'postulantes', 'asignaciones.docente', 'asignaciones.materia', 'carrera'])
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
            'cupo_maximo' => 'required|integer|min:1|max:70',
            'carrera_id'  => 'nullable|exists:carreras,id',
            'gestion'     => 'nullable|string|max:20',
        ]);

        $turnoChanged = $grupo->turno !== $request->turno;

        $grupo->update([
            'codigo'      => strtoupper($request->codigo),
            'nombre_grupo'=> strtoupper($request->codigo),
            'turno'       => $request->turno,
            'dias'        => $request->dias,
            'cupo_maximo' => $request->cupo_maximo,
            'capacidad_maxima' => $request->cupo_maximo,
            'carrera_id'  => $request->carrera_id,
            'gestion'     => $request->gestion ?? 'I-2026',
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
        $materias = Materia::where('estado', 'activo')->get();
        $dias = is_array($grupo->dias) ? $grupo->dias : ($grupo->dias ? json_decode($grupo->dias, true) : ['lunes']);

        foreach ($dias as $dia) {
            $diaLower = strtolower($dia);
            $materiasDelDia = ['Computación', 'Física'];
            if (in_array($diaLower, ['miercoles', 'jueves'])) {
                $materiasDelDia = ['Inglés', 'Matemáticas'];
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
        $turnoNormalized = str_replace(['mañana', 'tarde', 'noche'], ['manana', 'tarde', 'noche'], strtolower($turno));

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

    private function formatGrupo(Grupo $g): array
    {
        return [
            'id'          => $g->id,
            'codigo'      => $g->codigo,
            'turno'       => $g->turno,
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
