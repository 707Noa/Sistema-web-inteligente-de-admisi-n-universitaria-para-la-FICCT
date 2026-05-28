<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Materia;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MateriaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Materia::query();

        if ($request->has('search')) {
            $query->where('nombre', 'ilike', "%{$request->search}%");
        }

        return response()->json($query->orderBy('nombre')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:191',
            'codigo' => 'required|string|unique:materias,codigo',
        ]);

        $materia = Materia::create($request->all());

        AuditoriaService::registrar($request->user()->id, 'Registró una materia', 'Materias', $request, "Materia: {$materia->nombre}");

        return response()->json($materia, 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Materia::findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $materia = Materia::findOrFail($id);

        $request->validate([
            'nombre' => 'required|string|max:191',
            'codigo' => "required|string|unique:materias,codigo,{$id}",
        ]);

        $materia->update($request->all());

        AuditoriaService::registrar($request->user()->id, 'Editó una materia', 'Materias', $request);

        return response()->json($materia);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $materia = Materia::findOrFail($id);
        $materia->delete();

        AuditoriaService::registrar($request->user()->id, 'Eliminó una materia', 'Materias', $request);

        return response()->json(['message' => 'Materia eliminada.']);
    }

    public function all(): JsonResponse
    {
        return response()->json(Materia::where('estado', 'activo')->orderBy('nombre')->get());
    }
}
