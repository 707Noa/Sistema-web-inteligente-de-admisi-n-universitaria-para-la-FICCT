<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Grupo;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrupoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Grupo::with(['docente', 'materia'])
            ->withCount('postulantes');

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('nombre_grupo')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre_grupo' => 'required|string|max:191',
            'capacidad_maxima' => 'integer|min:1|max:100',
            'docente_id' => 'nullable|exists:docentes,id',
            'materia_id' => 'nullable|exists:materias,id',
        ]);

        $data = $request->all();
        $data['capacidad_maxima'] = $data['capacidad_maxima'] ?? 70;

        $grupo = Grupo::create($data);

        AuditoriaService::registrar($request->user()->id, 'Generó un grupo', 'Grupos', $request, "Grupo: {$grupo->nombre_grupo}");

        return response()->json($grupo->load(['docente', 'materia']), 201);
    }

    public function show(int $id): JsonResponse
    {
        $grupo = Grupo::with(['docente', 'materia', 'postulantes'])
            ->withCount('postulantes')
            ->findOrFail($id);

        return response()->json($grupo);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $grupo = Grupo::findOrFail($id);

        $request->validate([
            'nombre_grupo' => 'required|string|max:191',
            'docente_id' => 'nullable|exists:docentes,id',
            'materia_id' => 'nullable|exists:materias,id',
        ]);

        $grupo->update($request->all());

        AuditoriaService::registrar($request->user()->id, 'Editó un grupo', 'Grupos', $request, "Grupo: {$grupo->nombre_grupo}");

        return response()->json($grupo->load(['docente', 'materia']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $grupo = Grupo::findOrFail($id);
        $grupo->delete();

        AuditoriaService::registrar($request->user()->id, 'Eliminó un grupo', 'Grupos', $request);

        return response()->json(['message' => 'Grupo eliminado.']);
    }

    public function asignarPostulante(Request $request, int $grupoId): JsonResponse
    {
        $request->validate(['postulante_id' => 'required|exists:postulantes,id']);

        $grupo = Grupo::withCount('postulantes')->findOrFail($grupoId);

        if ($grupo->postulantes_count >= $grupo->capacidad_maxima) {
            return response()->json([
                'message' => "El grupo {$grupo->nombre_grupo} ya alcanzó su capacidad máxima de {$grupo->capacidad_maxima} postulantes.",
            ], 422);
        }

        $grupo->postulantes()->syncWithoutDetaching([$request->postulante_id]);

        AuditoriaService::registrar($request->user()->id, 'Asignó postulante a grupo', 'Grupos', $request, "Grupo: {$grupo->nombre_grupo}");

        return response()->json(['message' => 'Postulante asignado al grupo.']);
    }

    public function removerPostulante(Request $request, int $grupoId, int $postulanteId): JsonResponse
    {
        $grupo = Grupo::findOrFail($grupoId);
        $grupo->postulantes()->detach($postulanteId);

        return response()->json(['message' => 'Postulante removido del grupo.']);
    }

    public function autoGenerar(Request $request): JsonResponse
    {
        $request->validate([
            'nombre_base' => 'required|string',
            'cantidad' => 'required|integer|min:1|max:20',
        ]);

        $grupos = [];
        for ($i = 1; $i <= $request->cantidad; $i++) {
            $grupo = Grupo::create([
                'nombre_grupo' => $request->nombre_base . ' ' . chr(64 + $i),
                'capacidad_maxima' => 70,
                'docente_id' => $request->docente_id ?? null,
                'materia_id' => $request->materia_id ?? null,
                'aula' => $request->aula ?? null,
                'estado' => 'activo',
            ]);
            $grupos[] = $grupo;
        }

        AuditoriaService::registrar($request->user()->id, 'Generó grupos automáticamente', 'Grupos', $request, "Cantidad: {$request->cantidad}");

        return response()->json($grupos, 201);
    }
}
