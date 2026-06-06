<?php

namespace Modules\P3_EvaluacionResultados\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Postulante;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulanteAcademicoController extends Controller
{
    /**
     * Retorna las calificaciones del postulante autenticado.
     * Threshold de aprobación: 60 (según requerimiento del sistema CUP-FICCT).
     */
    public function calificaciones(Request $request): JsonResponse
    {
        $user       = $request->user();
        $postulante = Postulante::where('user_id', $user->id)->firstOrFail();

        $examenes = Examen::with('materia')
            ->where('postulante_id', $postulante->id)
            ->get();

        $materias = $examenes->map(function ($e) {
            $nota1 = $e->nota_1 !== null ? (float) $e->nota_1 : null;
            $nota2 = $e->nota_2 !== null ? (float) $e->nota_2 : null;
            $nota3 = $e->nota_3 !== null ? (float) $e->nota_3 : null;

            if ($nota1 !== null && $nota2 !== null && $nota3 !== null) {
                $promedio = round(($nota1 + $nota2 + $nota3) / 3, 2);
                $estado   = $promedio >= 60 ? 'aprobado' : 'reprobado';
            } else {
                $promedio = null;
                $estado   = 'pendiente';
            }

            return [
                'materia'   => $e->materia?->nombre ?? 'Sin nombre',
                'parcial_1' => $nota1,
                'parcial_2' => $nota2,
                'parcial_3' => $nota3,
                'promedio'  => $promedio,
                'estado'    => $estado,
            ];
        })->values();

        // Resumen general
        $pendientes = $materias->filter(fn($m) => $m['estado'] === 'pendiente');
        $reprobadas = $materias->filter(fn($m) => $m['estado'] === 'reprobado');
        $completadas = $materias->filter(fn($m) => $m['estado'] !== 'pendiente');

        if ($materias->isEmpty()) {
            $estadoGeneral   = 'sin_datos';
            $promedioGeneral = null;
        } elseif ($pendientes->isNotEmpty()) {
            $estadoGeneral   = 'en_proceso';
            $promedioGeneral = $completadas->isNotEmpty()
                ? round($completadas->avg('promedio'), 2)
                : null;
        } elseif ($reprobadas->isNotEmpty()) {
            $estadoGeneral   = 'reprobado';
            $promedioGeneral = round($materias->avg('promedio'), 2);
        } else {
            $estadoGeneral   = 'aprobado';
            $promedioGeneral = round($materias->avg('promedio'), 2);
        }

        return response()->json([
            'materias'         => $materias,
            'promedio_general' => $promedioGeneral,
            'estado_general'   => $estadoGeneral,
        ]);
    }
}
