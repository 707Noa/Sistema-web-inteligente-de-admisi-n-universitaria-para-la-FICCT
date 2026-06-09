<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Services;

class ReporteIAInterpretacionService
{
    /**
     * Interprets a natural language voice request and maps it to a structured report intent.
     * Uses keyword matching — no SQL generation, no external AI API.
     */
    public function interpretar(string $texto): array
    {
        $normalizado = $this->normalizar($texto);

        $tipoReporte = $this->detectarTipoReporte($normalizado);
        $formato = $this->detectarFormato($normalizado);
        $filtros = $this->detectarFiltros($normalizado);

        if ($tipoReporte === null) {
            return [
                'exitoso' => false,
                'mensaje' => 'No se pudo identificar el reporte solicitado. Por favor, sea más específico.',
                'texto_recibido' => $texto,
            ];
        }

        $catalogo = ReporteCatalogoService::get($tipoReporte);
        $descripcion = $this->construirDescripcion($catalogo['titulo'], $filtros);

        return [
            'exitoso' => true,
            'tipo_reporte' => $tipoReporte,
            'formato' => $formato,
            'filtros' => $filtros,
            'titulo' => $catalogo['titulo'],
            'descripcion' => $descripcion,
            'columnas' => $catalogo['columnas'],
            'texto_recibido' => $texto,
        ];
    }

    private function normalizar(string $texto): string
    {
        $texto = mb_strtolower($texto, 'UTF-8');
        $mapa = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ä' => 'a', 'ë' => 'e', 'ï' => 'i', 'ö' => 'o', 'ü' => 'u',
            'ñ' => 'n',
        ];
        return strtr($texto, $mapa);
    }

    private function detectarTipoReporte(string $texto): ?string
    {
        $catalogo = ReporteCatalogoService::catalogo();

        // Score each report type by keyword matching
        $puntuaciones = [];
        foreach ($catalogo as $tipo => $info) {
            $score = 0;
            foreach ($info['keywords'] as $keyword) {
                $keywordNorm = $this->normalizar($keyword);
                if (str_contains($texto, $keywordNorm)) {
                    // Longer keyword match = higher score
                    $score += strlen($keywordNorm);
                }
            }
            if ($score > 0) {
                $puntuaciones[$tipo] = $score;
            }
        }

        if (empty($puntuaciones)) {
            return null;
        }

        // Return the type with the highest score (most specific match)
        arsort($puntuaciones);
        return array_key_first($puntuaciones);
    }

    private function detectarFormato(string $texto): string
    {
        if (str_contains($texto, 'excel') || str_contains($texto, 'xlsx') || str_contains($texto, 'hoja de calculo')) {
            return 'excel';
        }
        if (str_contains($texto, 'csv')) {
            return 'csv';
        }
        // Default to PDF
        return 'pdf';
    }

    private function detectarFiltros(string $texto): array
    {
        $filtros = [];

        // Detect group code like M1, M2, G1, G2, T1, T2, A1, B1 etc.
        if (preg_match('/\b([a-z]\d+)\b/i', $texto, $m)) {
            $filtros['grupo'] = strtoupper($m[1]);
        }

        // Detect turno
        if (str_contains($texto, 'manana') || str_contains($texto, 'mañana')) {
            $filtros['turno'] = 'mañana';
        } elseif (str_contains($texto, 'tarde')) {
            $filtros['turno'] = 'tarde';
        } elseif (str_contains($texto, 'noche')) {
            $filtros['turno'] = 'noche';
        }

        // Detect materia keywords
        $materias = [
            'computacion' => 'Computación',
            'fisica' => 'Física',
            'ingles' => 'Inglés',
            'matematicas' => 'Matemáticas',
            'matematica' => 'Matemáticas',
            'quimica' => 'Química',
            'biologia' => 'Biología',
        ];
        foreach ($materias as $keyword => $nombre) {
            if (str_contains($texto, $keyword)) {
                $filtros['materia'] = $nombre;
                break;
            }
        }

        return $filtros;
    }

    private function construirDescripcion(string $titulo, array $filtros): string
    {
        $partes = ["Reporte de {$titulo}"];
        if (!empty($filtros['grupo'])) {
            $partes[] = "del grupo {$filtros['grupo']}";
        }
        if (!empty($filtros['materia'])) {
            $partes[] = "de la materia {$filtros['materia']}";
        }
        if (!empty($filtros['turno'])) {
            $partes[] = "del turno {$filtros['turno']}";
        }
        return implode(' ', $partes);
    }
}
