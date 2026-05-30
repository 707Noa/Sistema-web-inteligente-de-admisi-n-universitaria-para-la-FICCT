<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use App\Models\Carrera;
use Modules\P2_ParticipantesGrupos\Requests\PreinscripcionRequest;
use Illuminate\Http\JsonResponse;

class PreinscripcionController extends Controller
{
    /**
     * Registrar una nueva preinscripción.
     */
    public function store(PreinscripcionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Mapear género/sexo de manera segura
        $sexo = $validated['sexo'] ?? $validated['genero'] ?? null;
        $generoEnum = null;
        if ($sexo) {
            $lowerSexo = strtolower($sexo);
            if (in_array($lowerSexo, ['masculino', 'femenino', 'otro'])) {
                $generoEnum = $lowerSexo;
            }
        }

        // Crear registro en la tabla postulantes
        $postulante = Postulante::create([
            'nombres' => $validated['nombres'],
            'apellidos' => $validated['apellidos'],
            'ci' => $validated['ci'],
            'genero' => $generoEnum,
            'sexo' => $sexo,
            'fecha_nacimiento' => $validated['fecha_nacimiento'] ?? null,
            'celular' => $validated['telefono'] ?? null,
            'segundo_celular' => $validated['segundo_telefono'] ?? null,
            'segundo_telefono' => $validated['segundo_telefono'] ?? null,
            'email' => $validated['correo_electronico'],
            'direccion' => $validated['direccion'] ?? null,
            'colegio_procedencia' => $validated['colegio_procedencia'] ?? null,
            'ciudad' => $validated['ciudad'] ?? null,
            'carrera' => $validated['carrera'] ?? null,
            'carrera_postulada' => $validated['carrera'] ?? null,
            'titulo_bachiller' => $validated['titulo_bachiller'] ?? false,
            'otros' => $validated['otros'] ?? null,
            'estado_tramite' => 'PREINSCRITO',
            'estado' => 'pendiente',
        ]);

        return response()->json([
            'message' => 'Registro exitoso. Su cuenta será enviada a su correo electrónico.',
            'data' => $postulante,
        ], 201);
    }

    /**
     * Mostrar detalles de una preinscripción específica.
     */
    public function show(int $id): JsonResponse
    {
        $postulante = Postulante::where('estado_tramite', 'PREINSCRITO')
                                ->orWhere('estado_tramite', 'CUENTA_CREADA')
                                ->findOrFail($id);

        return response()->json($postulante);
    }

    /**
     * Obtener carreras activas.
     */
    public function carrerasDisponibles(): JsonResponse
    {
        return response()->json(
            Carrera::where('estado', 'activo')->orderBy('nombre')->get()
        );
    }
}
