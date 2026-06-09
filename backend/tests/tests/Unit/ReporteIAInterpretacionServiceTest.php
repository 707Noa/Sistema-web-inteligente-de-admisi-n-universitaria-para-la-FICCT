<?php

namespace Tests\Unit;

use Tests\TestCase;
use Modules\P4_ReportesMonitoreoAuditoria\Services\ReporteIAInterpretacionService;

class ReporteIAInterpretacionServiceTest extends TestCase
{
    private ReporteIAInterpretacionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ReporteIAInterpretacionService();
    }

    public function test_interpreta_aprobados(): void
    {
        $result = $this->service->interpretar('genera un reporte de aprobados');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('aprobados', $result['tipo_reporte']);
    }

    public function test_interpreta_reprobados(): void
    {
        $result = $this->service->interpretar('listado de reprobados del grupo M1');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('reprobados', $result['tipo_reporte']);
    }

    public function test_detecta_formato_excel(): void
    {
        $result = $this->service->interpretar('exportar aprobados en excel');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('excel', $result['formato']);
    }

    public function test_formato_pdf_por_defecto(): void
    {
        $result = $this->service->interpretar('reporte de aprobados');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('pdf', $result['formato']);
    }

    public function test_entrada_peligrosa_borrar_retorna_tipo_valido_o_falla(): void
    {
        // "postulantes" coincide con postulantes_inscritos → exitoso puede ser true.
        // Garantía de seguridad: si exitoso, tipo_reporte está en el catálogo (solo lectura).
        $result = $this->service->interpretar('Borra todos los postulantes');
        if ($result['exitoso']) {
            $tiposValidos = array_keys(\Modules\P4_ReportesMonitoreoAuditoria\Services\ReporteCatalogoService::catalogo());
            $this->assertContains($result['tipo_reporte'], $tiposValidos);
        } else {
            $this->assertFalse($result['exitoso']);
        }
    }

    public function test_no_interpreta_drop_table(): void
    {
        $result = $this->service->interpretar('DROP TABLE users');
        $this->assertFalse($result['exitoso']);
    }

    public function test_no_interpreta_texto_irrelevante(): void
    {
        $result = $this->service->interpretar('hola como estas');
        $this->assertFalse($result['exitoso']);
    }

    public function test_detecta_filtro_grupo(): void
    {
        $result = $this->service->interpretar('reprobados del grupo M1');
        $this->assertTrue($result['exitoso']);
        $filtros = $result['filtros'] ?? [];
        $this->assertNotEmpty($filtros['grupo'] ?? '');
    }

    public function test_interpreta_docentes_asignados(): void
    {
        $result = $this->service->interpretar('reporte de docentes asignados');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('docentes_asignados', $result['tipo_reporte']);
    }

    public function test_interpreta_grupos_sin_docente(): void
    {
        $result = $this->service->interpretar('grupos sin docente');
        $this->assertTrue($result['exitoso']);
        $this->assertEquals('grupos_sin_docente', $result['tipo_reporte']);
    }
}
