<?php

namespace Modules\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AdmisionResultado;
use App\Models\CupoCarrera;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuposCarreraController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CupoCarrera::query();

        if ($request->filled('gestion')) {
            $query->where('gestion', $request->gestion);
        }

        $cupos = $query->orderBy('gestion', 'desc')->orderBy('carrera')->get();

        $data = $cupos->map(fn($cupo) => $this->formatCupo($cupo));

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'carrera'     => 'required|string|max:191',
            'gestion'     => 'required|string|max:20',
            'cupo_maximo' => 'required|integer|min:1',
        ], [
            'carrera.required'     => 'La carrera es obligatoria.',
            'gestion.required'     => 'La gestión es obligatoria.',
            'cupo_maximo.min'      => 'El cupo debe ser mayor a 0.',
            'cupo_maximo.required' => 'El cupo máximo es obligatorio.',
        ]);

        $exists = CupoCarrera::where('carrera', $request->carrera)
            ->where('gestion', $request->gestion)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Ya existe un registro de cupos para esta carrera y gestión.',
            ], 422);
        }

        $cupo = CupoCarrera::create([
            'carrera'     => trim($request->carrera),
            'gestion'     => trim($request->gestion),
            'cupo_maximo' => $request->cupo_maximo,
            'estado'      => 'activo',
        ]);

        return response()->json($this->formatCupo($cupo), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cupo = CupoCarrera::findOrFail($id);

        $request->validate([
            'cupo_maximo' => 'required|integer|min:1',
        ], [
            'cupo_maximo.min'      => 'El cupo debe ser mayor a 0.',
            'cupo_maximo.required' => 'El cupo máximo es obligatorio.',
        ]);

        $ocupados = $this->calcularOcupados($cupo);

        if ($request->cupo_maximo < $ocupados) {
            return response()->json([
                'message' => "No se puede reducir el cupo por debajo de los estudiantes ya admitidos ({$ocupados}).",
            ], 422);
        }

        $cupo->update(['cupo_maximo' => $request->cupo_maximo]);

        return response()->json($this->formatCupo($cupo));
    }

    public function toggleEstado(int $id): JsonResponse
    {
        $cupo = CupoCarrera::findOrFail($id);
        $cupo->update(['estado' => $cupo->estado === 'activo' ? 'inactivo' : 'activo']);
        return response()->json($this->formatCupo($cupo));
    }

    /**
     * Solo para pruebas: elimina todos los resultados de admisión de la gestión del cupo.
     */
    public function revertir(int $id): JsonResponse
    {
        $cupo    = CupoCarrera::findOrFail($id);
        $deleted = AdmisionResultado::where('gestion', $cupo->gestion)->delete();

        return response()->json([
            'message'  => "Se eliminaron {$deleted} resultados de admisión de la gestión {$cupo->gestion}.",
            'gestion'  => $cupo->gestion,
            'deleted'  => $deleted,
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function calcularOcupados(CupoCarrera $cupo): int
    {
        return AdmisionResultado::where('gestion', $cupo->gestion)
            ->where('carrera_admitida', $cupo->carrera)
            ->whereIn('estado_admision', ['admitido_primera', 'admitido_segunda'])
            ->count();
    }

    private function formatCupo(CupoCarrera $cupo): array
    {
        $ocupados  = $this->calcularOcupados($cupo);
        $restantes = max(0, $cupo->cupo_maximo - $ocupados);

        return [
            'id'              => $cupo->id,
            'carrera'         => $cupo->carrera,
            'gestion'         => $cupo->gestion,
            'cupo_maximo'     => $cupo->cupo_maximo,
            'cupos_ocupados'  => $ocupados,
            'cupos_restantes' => $restantes,
            'estado'          => $cupo->estado,
        ];
    }
}
