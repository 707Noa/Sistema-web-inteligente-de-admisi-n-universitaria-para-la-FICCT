<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AdmisionResultado;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdmisionReporteController extends Controller
{
    private function labelEstado(string $estado): string
    {
        return match ($estado) {
            'admitido_primera'  => 'Admitido primera opción',
            'admitido_segunda'  => 'Admitido segunda opción',
            'aprobado_sin_cupo' => 'Aprobado sin cupo',
            'reprobado'         => 'Reprobado',
            'pendiente'         => 'Pendiente',
            default             => ucfirst($estado),
        };
    }

    public function exportarCsv(Request $request): StreamedResponse
    {
        $resultados = AdmisionResultado::with('postulante')
            ->when($request->filled('gestion'),          fn($q) => $q->where('gestion', $request->gestion))
            ->when($request->filled('estado_academico'), fn($q) => $q->where('estado_academico', $request->estado_academico))
            ->when($request->filled('estado_admision'),  fn($q) => $q->where('estado_admision', $request->estado_admision))
            ->when($request->filled('carrera_admitida'), fn($q) => $q->where('carrera_admitida', 'ilike', "%{$request->carrera_admitida}%"))
            ->orderByRaw("CASE WHEN estado_academico = 'aprobado' THEN 0 ELSE 1 END")
            ->orderBy('promedio_final', 'desc')
            ->get();

        $gestion  = $request->gestion ?? 'admision';
        $filename = "admision_final_{$gestion}.csv";

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($resultados) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // BOM UTF-8

            fputcsv($file, [
                'Nombre', 'CI', 'Registro', 'Primera Carrera', 'Segunda Carrera',
                'Prom. Computación', 'Prom. Matemáticas', 'Prom. Inglés', 'Prom. Física',
                'Promedio Final', 'Estado Académico', 'Carrera Admitida', 'Estado Admisión', 'Motivo',
            ], ';');

            foreach ($resultados as $r) {
                $p = $r->postulante;
                fputcsv($file, [
                    $p ? "{$p->nombres} {$p->apellidos}" : '—',
                    $p?->ci ?? '—',
                    $p?->codigo_usuario ?? '—',
                    $r->primera_carrera ?? '—',
                    $r->segunda_carrera ?? '—',
                    $r->promedio_computacion ?? '—',
                    $r->promedio_matematicas ?? '—',
                    $r->promedio_ingles ?? '—',
                    $r->promedio_fisica ?? '—',
                    $r->promedio_final ?? '—',
                    strtoupper($r->estado_academico),
                    $r->carrera_admitida ?? 'Ninguna',
                    $this->labelEstado($r->estado_admision),
                    $r->motivo ?? '—',
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
