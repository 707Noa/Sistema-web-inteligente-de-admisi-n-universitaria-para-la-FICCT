<?php

namespace Tests\Unit;

use Tests\TestCase;
use Modules\P4_ReportesMonitoreoAuditoria\Services\ReporteCatalogoService;

class ReporteCatalogoServiceTest extends TestCase
{
    public function test_catalogo_tiene_al_menos_17_tipos(): void
    {
        $catalogo = ReporteCatalogoService::catalogo();
        $this->assertGreaterThanOrEqual(17, count($catalogo));
    }

    public function test_tipos_conocidos_existen_en_catalogo(): void
    {
        $esperados = [
            'postulantes_inscritos', 'aprobados', 'reprobados',
            'promedios_generales', 'docentes_asignados', 'grupos_habilitados',
            'grupos_sin_docente', 'materias_con_mas_reprobados',
        ];
        foreach ($esperados as $tipo) {
            $this->assertTrue(
                ReporteCatalogoService::existe($tipo),
                "El tipo '$tipo' debería existir en el catálogo."
            );
        }
    }

    public function test_tipo_peligroso_no_existe_en_catalogo(): void
    {
        $this->assertFalse(ReporteCatalogoService::existe('drop_table'));
        $this->assertFalse(ReporteCatalogoService::existe('delete_users'));
        $this->assertFalse(ReporteCatalogoService::existe('select_all'));
        $this->assertFalse(ReporteCatalogoService::existe(''));
    }

    public function test_cada_tipo_tiene_campos_requeridos(): void
    {
        $catalogo = ReporteCatalogoService::catalogo();
        foreach ($catalogo as $key => $tipo) {
            $this->assertArrayHasKey('titulo',     $tipo, "Falta 'titulo' en '$key'");
            $this->assertArrayHasKey('descripcion', $tipo, "Falta 'descripcion' en '$key'");
            $this->assertArrayHasKey('columnas',   $tipo, "Falta 'columnas' en '$key'");
        }
    }
}
