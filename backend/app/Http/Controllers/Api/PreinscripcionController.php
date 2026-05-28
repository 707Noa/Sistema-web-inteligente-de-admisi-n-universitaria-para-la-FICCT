<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Preinscripcion;
use App\Models\Carrera;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreinscripcionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Preinscripcion::with('carreras');

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%")
                  ->orWhere('numero_formulario', 'ilike', "%{$s}%");
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => 'required|string|unique:preinscripciones,ci',
            'email' => 'required|email',
            'declaracion_jurada' => 'required|accepted',
            'carreras' => 'required|array|min:1',
            'carreras.*' => 'exists:carreras,id',
        ]);

        $data = $request->except('carreras');
        $data['numero_formulario'] = Preinscripcion::generarNumeroFormulario();
        $data['codigo_qr'] = 'PREINSC-' . uniqid();

        $preinscripcion = Preinscripcion::create($data);

        // Adjuntar carreras
        foreach ($request->carreras as $index => $carreraId) {
            $preinscripcion->carreras()->attach($carreraId, ['opcion' => 'Opción ' . ($index + 1)]);
        }

        return response()->json($preinscripcion->load('carreras'), 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(
            Preinscripcion::with('carreras')->findOrFail($id)
        );
    }

    public function carrerasDisponibles(): JsonResponse
    {
        return response()->json(Carrera::where('estado', 'activo')->orderBy('nombre')->get());
    }
}
