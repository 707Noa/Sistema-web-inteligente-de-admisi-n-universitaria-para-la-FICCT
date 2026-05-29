<?php

namespace App\Packages\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Packages\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Examen::with(['postulante', 'materia']);

        if ($request->has('postulante_id')) {
            $query->where('postulante_id', $request->postulante_id);
        }

        if ($request->has('materia_id')) {
            $query->where('materia_id', $request->materia_id);
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'postulante_id' => 'required|exists:postulantes,id',
            'materia_id' => 'required|exists:materias,id',
            'nota_1' => 'nullable|numeric|min:0|max:100',
            'nota_2' => 'nullable|numeric|min:0|max:100',
            'nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $examen = new Examen($request->all());
        $examen->calcularPromedio();
        $examen->save();

        AuditoriaService::registrar($request->user()->id, 'Registró notas', 'Exámenes', $request, "Postulante ID: {$examen->postulante_id}");

        return response()->json($examen->load(['postulante', 'materia']), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Examen::with(['postulante', 'materia'])->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $examen = Examen::findOrFail($id);

        $request->validate([
            'nota_1' => 'nullable|numeric|min:0|max:100',
            'nota_2' => 'nullable|numeric|min:0|max:100',
            'nota_3' => 'nullable|numeric|min:0|max:100',
        ]);

        $examen->fill($request->only(['nota_1', 'nota_2', 'nota_3', 'carrera_adjudicada']));
        $examen->calcularPromedio();
        $examen->save();

        AuditoriaService::registrar($request->user()->id, 'Actualizó notas', 'Exámenes', $request, "Examen ID: {$id}");

        return response()->json($examen->load(['postulante', 'materia']));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Examen::findOrFail($id)->delete();

        AuditoriaService::registrar($request->user()->id, 'Eliminó un examen', 'Exámenes', $request);

        return response()->json(['message' => 'Examen eliminado.']);
    }
}
