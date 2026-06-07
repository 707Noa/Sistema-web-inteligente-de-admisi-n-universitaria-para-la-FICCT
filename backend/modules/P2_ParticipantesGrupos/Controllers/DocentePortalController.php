<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use App\Models\Materia;
use App\Models\Postulante;
use App\Models\Nota;
use App\Models\DocenteGrupoAsignacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocentePortalController extends Controller
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
            'role' => $user->role->name ?? 'docente',
            'estado' => $user->estado,
        ]);
    }

    public function misGrupos(Request $request): JsonResponse
    {
        $user = $request->user();
        $grupoIds = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
            ->where('estado', 'activo')
            ->pluck('grupo_id')
            ->unique()
            ->toArray();

        $grupos = Grupo::whereIn('id', $grupoIds)
            ->with(['horarios.materia', 'asignaciones' => function($q) use ($user) {
                $q->where('docente_user_id', $user->id)->where('estado', 'activo');
            }])
            ->get()
            ->map(function($g) use ($user) {
                return [
                    'id' => $g->id,
                    'codigo' => $g->codigo,
                    'nombre_grupo' => $g->nombre_grupo,
                    'turno' => $g->turno,
                    'aula' => $g->aula,
                    'cupo_maximo' => $g->cupo_maximo ?? 70,
                    'ocupacion' => $g->postulantes()->count(),
                    'horarios' => $g->horarios->map(fn($h) => [
                        'materia_nombre' => $h->materia?->nombre,
                        'dia' => $h->dia,
                        'hora_inicio' => substr($h->hora_inicio, 0, 5),
                        'hora_fin' => substr($h->hora_fin, 0, 5),
                    ]),
                    'materias' => $g->asignaciones->map(fn($a) => [
                        'id' => $a->materia_id,
                        'nombre' => $a->materia?->nombre
                    ])->unique('id')->values(),
                ];
            });

        return response()->json($grupos);
    }

    public function misMaterias(Request $request): JsonResponse
    {
        $user = $request->user();
        $materiaIds = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
            ->where('estado', 'activo')
            ->pluck('materia_id')
            ->unique()
            ->toArray();

        $materias = Materia::whereIn('id', $materiaIds)->get(['id', 'nombre', 'codigo', 'estado']);
        return response()->json($materias);
    }

    public function misEstudiantes(Request $request): JsonResponse
    {
        $user = $request->user();
        $grupoIds = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
            ->where('estado', 'activo')
            ->pluck('grupo_id')
            ->unique()
            ->toArray();

        $postulantes = Postulante::whereHas('grupos', function($q) use ($grupoIds) {
            $q->whereIn('grupos.id', $grupoIds);
        })->with('grupos')->get()->map(function($p) use ($grupoIds, $user) {
            $grupo = $p->grupos->whereIn('id', $grupoIds)->first();
            
            $materiaNames = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
                ->where('grupo_id', $grupo?->id)
                ->where('estado', 'activo')
                ->with('materia')
                ->get()
                ->map(fn($a) => $a->materia?->nombre)
                ->unique()
                ->values()
                ->toArray();

            return [
                'id' => $p->id,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'name' => trim($p->nombres . ' ' . $p->apellidos),
                'ci' => $p->ci,
                'email' => $p->email,
                'grupo_codigo' => $grupo?->codigo ?? $grupo?->nombre_grupo,
                'materia' => implode(', ', $materiaNames),
                'estado_tramite' => $p->estado_tramite,
            ];
        });

        return response()->json($postulantes);
    }

    public function getNotas(Request $request): JsonResponse
    {
        $request->validate([
            'grupo_id' => 'required|exists:grupos,id',
            'materia_id' => 'required|exists:materias,id',
        ]);

        $user = $request->user();
        
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
            ->where('grupo_id', $request->grupo_id)
            ->where('materia_id', $request->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No está asignado a este grupo o materia.'], 403);
        }

        $grupo = Grupo::with('postulantes')->findOrFail($request->grupo_id);
        
        $notas = Nota::where('grupo_id', $request->grupo_id)
            ->where('materia_id', $request->materia_id)
            ->get()
            ->keyBy('postulante_id');

        $res = $grupo->postulantes->map(function($p) use ($notas, $grupo, $request, $user) {
            $n = $notas->get($p->id);
            return [
                'id' => $n?->id,
                'postulante_id' => $p->id,
                'nombres' => $p->nombres,
                'apellidos' => $p->apellidos,
                'name' => trim($p->nombres . ' ' . $p->apellidos),
                'ci' => $p->ci,
                'grupo_id' => $grupo->id,
                'grupo_codigo' => $grupo->codigo,
                'materia_id' => $request->materia_id,
                'docente_id' => $user->id,
                'nota_1' => $n ? (float)$n->nota_1 : null,
                'nota_2' => $n ? (float)$n->nota_2 : null,
                'nota_3' => $n ? (float)$n->nota_3 : null,
                'promedio' => $n ? (float)$n->promedio : null,
            ];
        });

        return response()->json($res);
    }

    public function guardarNotas(Request $request): JsonResponse
    {
        $request->validate([
            'notas' => 'required|array',
            'notas.*.postulante_id' => 'required|exists:postulantes,id',
            'notas.*.grupo_id' => 'required|exists:grupos,id',
            'notas.*.materia_id' => 'required|exists:materias,id',
            'notas.*.nota_1' => 'nullable|numeric|min:0|max:100',
            'notas.*.nota_2' => 'nullable|numeric|min:0|max:100',
            'notas.*.nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $user = $request->user();

        foreach ($request->notas as $item) {
            $assigned = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
                ->where('grupo_id', $item['grupo_id'])
                ->where('materia_id', $item['materia_id'])
                ->where('estado', 'activo')
                ->exists();

            if (!$assigned) {
                return response()->json(['message' => 'Intento de guardar notas para un grupo o materia no asignado.'], 403);
            }

            Nota::updateOrCreate(
                [
                    'postulante_id' => $item['postulante_id'],
                    'grupo_id' => $item['grupo_id'],
                    'materia_id' => $item['materia_id'],
                ],
                [
                    'docente_id' => $user->id,
                    'nota_1' => $item['nota_1'] !== '' ? $item['nota_1'] : null,
                    'nota_2' => $item['nota_2'] !== '' ? $item['nota_2'] : null,
                    'nota_3' => $item['nota_3'] !== '' ? $item['nota_3'] : null,
                ]
            );
        }

        return response()->json(['message' => 'Notas registradas correctamente.']);
    }

    public function actualizarNota(Request $request, $id): JsonResponse
    {
        $nota = Nota::findOrFail($id);
        $user = $request->user();
        
        $assigned = DocenteGrupoAsignacion::where('docente_user_id', $user->id)
            ->where('grupo_id', $nota->grupo_id)
            ->where('materia_id', $nota->materia_id)
            ->where('estado', 'activo')
            ->exists();

        if (!$assigned) {
            return response()->json(['message' => 'No tiene permisos para modificar esta nota.'], 403);
        }

        $request->validate([
            'nota_1' => 'nullable|numeric|min:0|max:100',
            'nota_2' => 'nullable|numeric|min:0|max:100',
            'nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $nota->update([
            'nota_1' => $request->nota_1 !== '' ? $request->nota_1 : null,
            'nota_2' => $request->nota_2 !== '' ? $request->nota_2 : null,
            'nota_3' => $request->nota_3 !== '' ? $request->nota_3 : null,
        ]);

        return response()->json([
            'message' => 'Nota actualizada correctamente.',
            'nota' => [
                'id' => $nota->id,
                'nota_1' => (float)$nota->nota_1,
                'nota_2' => (float)$nota->nota_2,
                'nota_3' => (float)$nota->nota_3,
                'promedio' => (float)$nota->promedio,
            ]
        ]);
    }
}
