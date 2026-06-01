<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DocenteGrupoAsignacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CoordReporteController extends Controller
{
    public function horarios(Request $request): JsonResponse
    {
        $query = DocenteGrupoAsignacion::with(['docente', 'grupo', 'materia'])
            ->where('estado', 'activo');

        if ($request->filled('docente_user_id')) {
            $query->where('docente_user_id', $request->docente_user_id);
        }
        if ($request->filled('materia_id')) {
            $query->where('materia_id', $request->materia_id);
        }
        if ($request->filled('grupo_id')) {
            $query->where('grupo_id', $request->grupo_id);
        }
        if ($request->filled('turno')) {
            $query->where('turno', $request->turno);
        }
        if ($request->filled('dia')) {
            $query->where('dia', $request->dia);
        }

        $rows = $query->orderBy('docente_user_id')
            ->orderBy('dia')
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn($a) => [
                'docente_name'   => $a->docente?->name,
                'docente_ci'     => $a->docente?->ci,
                'docente_email'  => $a->docente?->email,
                'docente_codigo' => $a->docente?->codigo,
                'materia_nombre' => $a->materia?->nombre,
                'grupo_codigo'   => $a->grupo?->codigo,
                'dia'            => $a->dia,
                'turno'          => $a->turno,
                'hora_inicio'    => substr($a->hora_inicio, 0, 5),
                'hora_fin'       => substr($a->hora_fin, 0, 5),
            ]);

        return response()->json($rows);
    }

    public function exportarCsv(Request $request): StreamedResponse
    {
        $query = DocenteGrupoAsignacion::with(['docente', 'grupo', 'materia'])
            ->where('estado', 'activo');

        if ($request->filled('docente_user_id')) $query->where('docente_user_id', $request->docente_user_id);
        if ($request->filled('materia_id'))      $query->where('materia_id', $request->materia_id);
        if ($request->filled('grupo_id'))        $query->where('grupo_id', $request->grupo_id);
        if ($request->filled('turno'))           $query->where('turno', $request->turno);
        if ($request->filled('dia'))             $query->where('dia', $request->dia);

        $rows = $query->orderBy('docente_user_id')->orderBy('dia')->orderBy('hora_inicio')->get();

        $headers = [
            'Content-type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=reporte_horarios_' . date('Ymd_His') . '.csv',
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($rows) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8

            fputcsv($file, ['Docente', 'CI', 'Correo', 'Registro', 'Materia', 'Grupo', 'Día', 'Turno', 'Hora Inicio', 'Hora Fin'], ';');

            foreach ($rows as $a) {
                fputcsv($file, [
                    $a->docente?->name,
                    $a->docente?->ci,
                    $a->docente?->email,
                    $a->docente?->codigo,
                    $a->materia?->nombre,
                    $a->grupo?->codigo,
                    $a->dia,
                    $a->turno,
                    substr($a->hora_inicio, 0, 5),
                    substr($a->hora_fin, 0, 5),
                ], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
