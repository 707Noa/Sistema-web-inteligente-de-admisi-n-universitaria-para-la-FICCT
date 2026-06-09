<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

/**
 * Tests para el módulo Reportes con IA por Voz (P4).
 *
 * Usa DatabaseTransactions para que cada test se revierta automáticamente
 * y no contamine los datos de desarrollo/producción.
 */
class ReporteIATest extends TestCase
{
    use DatabaseTransactions;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function crearUsuarioConRol(string $roleName): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();
        return User::create([
            'name'     => 'Test ' . Str::ucfirst($roleName),
            'email'    => 'test_' . $roleName . '_' . Str::random(6) . '@test.local',
            'ci'       => (string) rand(1000000, 9999999),
            'password' => bcrypt('password'),
            'role_id'  => $role->id,
            'estado'   => 'activo',
        ]);
    }

    // ── Seguridad: acceso no autenticado ────────────────────────────────────

    public function test_no_autenticado_recibe_401_en_tipos_disponibles(): void
    {
        $res = $this->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(401);
    }

    public function test_no_autenticado_recibe_401_en_interpretar(): void
    {
        $res = $this->postJson('/api/p4/reportes-ia/interpretar', ['texto' => 'reporte de aprobados']);
        $res->assertStatus(401);
    }

    public function test_no_autenticado_recibe_401_en_generar(): void
    {
        $res = $this->postJson('/api/p4/reportes-ia/generar', [
            'tipo_reporte' => 'aprobados',
            'formato'      => 'pdf',
        ]);
        $res->assertStatus(401);
    }

    // ── Seguridad: roles sin acceso ──────────────────────────────────────────

    public function test_administrador_no_puede_acceder_a_endpoint_p4_ia(): void
    {
        $user = $this->crearUsuarioConRol('administrador');
        $res = $this->actingAs($user)->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(403);
    }

    public function test_docente_no_puede_acceder_a_endpoint_p4_ia(): void
    {
        $user = $this->crearUsuarioConRol('docente');
        $res = $this->actingAs($user)->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(403);
    }

    // ── Autoridad Académica: acceso permitido ────────────────────────────────

    public function test_autoridad_puede_obtener_tipos_disponibles(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(200)
            ->assertJsonStructure(['tipos' => [['id', 'titulo', 'descripcion']]]);
    }

    public function test_autoridad_puede_interpretar_solicitud_valida(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'genera un reporte de aprobados en pdf',
        ]);
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', true)
            ->assertJsonStructure(['tipo_reporte', 'formato', 'titulo', 'descripcion']);
    }

    public function test_autoridad_puede_interpretar_solicitud_excel(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'exportar reprobados en excel',
        ]);
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', true)
            ->assertJsonPath('formato', 'excel');
    }

    // ── Coordinador Académico: acceso permitido ──────────────────────────────

    public function test_coordinador_puede_obtener_tipos_disponibles(): void
    {
        $user = $this->crearUsuarioConRol('coordinador');
        $res = $this->actingAs($user)->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(200)
            ->assertJsonStructure(['tipos']);
    }

    public function test_coordinador_puede_interpretar_solicitud_valida(): void
    {
        $user = $this->crearUsuarioConRol('coordinador');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'reporte de docentes asignados',
        ]);
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', true);
    }

    // ── Seguridad: entradas peligrosas (inyección / modificación) ───────────

    public function test_entrada_peligrosa_borrar_postulantes_no_ejecuta_nada(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'Borra todos los postulantes',
        ]);
        // El sistema no debe ejecutar nada destructivo; simplemente no reconoce el tipo
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', false);
    }

    public function test_entrada_peligrosa_drop_table_no_ejecuta_sql(): void
    {
        $user = $this->crearUsuarioConRol('coordinador');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'DROP TABLE users; -- selecciona aprobados',
        ]);
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', false);
    }

    public function test_entrada_peligrosa_select_usuarios_no_se_ejecuta(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => 'Ejecuta select * from users',
        ]);
        $res->assertStatus(200)
            ->assertJsonPath('exitoso', false);
    }

    public function test_texto_vacio_es_rechazado(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/interpretar', [
            'texto' => '',
        ]);
        $res->assertStatus(422);
    }

    // ── Validación de tipo_reporte en /generar ───────────────────────────────

    public function test_tipo_reporte_invalido_retorna_422(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/generar', [
            'tipo_reporte' => 'drop_all_tables',
            'formato'      => 'pdf',
        ]);
        $res->assertStatus(422);
    }

    public function test_formato_invalido_retorna_422(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/generar', [
            'tipo_reporte' => 'aprobados',
            'formato'      => 'csv',
        ]);
        $res->assertStatus(422);
    }

    // ── Catálogo de tipos ────────────────────────────────────────────────────

    public function test_catalogo_contiene_al_menos_17_tipos(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->getJson('/api/p4/reportes-ia/tipos-disponibles');
        $res->assertStatus(200);
        $this->assertGreaterThanOrEqual(17, count($res->json('tipos')));
    }

    // ── Vista previa ─────────────────────────────────────────────────────────

    public function test_vista_previa_tipo_invalido_retorna_422_o_error(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/vista-previa', [
            'tipo_reporte' => 'tipo_inexistente',
        ]);
        // 422 (validación) o 400 (catálogo rechaza el tipo)
        $this->assertContains($res->getStatusCode(), [400, 422]);
    }

    public function test_vista_previa_tipo_valido_retorna_estructura_correcta(): void
    {
        $user = $this->crearUsuarioConRol('autoridad');
        $res = $this->actingAs($user)->postJson('/api/p4/reportes-ia/vista-previa', [
            'tipo_reporte' => 'postulantes_inscritos',
            'filtros'      => [],
        ]);
        $res->assertStatus(200)
            ->assertJsonStructure(['titulo', 'columnas', 'filas', 'total', 'mostrando']);
    }
}
