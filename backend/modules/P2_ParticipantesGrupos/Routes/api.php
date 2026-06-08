<?php

use Modules\P2_ParticipantesGrupos\Controllers\PreinscripcionController;
use Modules\P2_ParticipantesGrupos\Controllers\PreinscripcionAdminController;
use Modules\P2_ParticipantesGrupos\Controllers\PostulanteController;
use Modules\P2_ParticipantesGrupos\Controllers\ImportacionController;
use Modules\P2_ParticipantesGrupos\Controllers\DocenteController;
use Modules\P2_ParticipantesGrupos\Controllers\GrupoController;
use Modules\P2_ParticipantesGrupos\Controllers\MateriaController;
use Modules\P2_ParticipantesGrupos\Controllers\CoordDocenteController;
use Modules\P2_ParticipantesGrupos\Controllers\CoordGrupoController;
use Modules\P2_ParticipantesGrupos\Controllers\CoordAsignacionController;

use Modules\P4_ReportesMonitoreoAuditoria\Controllers\CoordReporteController;
use Modules\P2_ParticipantesGrupos\Controllers\CoordReporteController;
use Modules\P2_ParticipantesGrupos\Controllers\DocentePortalController;
use Modules\P2_ParticipantesGrupos\Controllers\AutoridadPortalController;
use Illuminate\Support\Facades\Route;



// Preinscripción pública
Route::post('/preinscripcion', [PreinscripcionController::class, 'store']);
Route::post('/preinscripciones', [PreinscripcionController::class, 'store']);
Route::get('/preinscripciones/{id}', [PreinscripcionController::class, 'show']);
Route::get('/carreras-disponibles', [PreinscripcionController::class, 'carrerasDisponibles']);

// Pasarelas de Pago Públicas
Route::post('/pagos/stripe/checkout', [PreinscripcionController::class, 'stripeCheckout']);
Route::post('/preinscripcion/stripe/checkout', [PreinscripcionController::class, 'preinscripcionStripeCheckout']);
Route::post('/preinscripcion/{id}/pago/paypal/create-order', [PreinscripcionController::class, 'paypalCreateOrder']);
Route::post('/preinscripcion/{id}/pago/paypal/capture', [PreinscripcionController::class, 'paypalCapture']);
Route::get('/preinscripcion/{id}/pago/estado', [PreinscripcionController::class, 'pagoEstado']);
Route::post('/preinscripcion/{id}/pago/simular', [PreinscripcionController::class, 'simularPago']);
Route::post('/pagos/stripe/webhook', [PreinscripcionController::class, 'stripeWebhook']);
Route::get('/pagos/stripe/estado', [PreinscripcionController::class, 'stripeEstado']);
Route::get('/preinscripcion/stripe/estado', [PreinscripcionController::class, 'preinscripcionStripeEstado']);
Route::delete('/preinscripciones/{id}/cancelar', [PreinscripcionController::class, 'cancelar']);

Route::middleware('auth:sanctum')->group(function () {
    // Preinscripciones privadas admin/coordinador
    Route::middleware('role:administrador,coordinador')->group(function () {
        Route::get('/preinscripciones', [PreinscripcionAdminController::class, 'index']);
        Route::get('/preinscripciones/exportar-csv', [PreinscripcionAdminController::class, 'exportarCsv']);
        Route::get('/postulantes/{id}/documento/{type}', [PreinscripcionAdminController::class, 'descargarDocumento']);

    });

    // Solo administrador - Creación de cuentas y inscripción masiva
    Route::middleware('role:administrador')->group(function () {
        Route::post('/preinscripciones/generar-cuentas', [PreinscripcionAdminController::class, 'generarCuentasMasivo']);
        Route::post('/preinscripciones/{postulante}/generar-cuenta', [PreinscripcionAdminController::class, 'generarCuenta']);

    });

    // Solo administrador - Creación de cuentas y inscripción masiva
    Route::middleware('role:administrador')->group(function () {
        Route::post('/preinscripciones/generar-cuentas', [PreinscripcionAdminController::class, 'generarCuentasMasivo']);
        Route::post('/preinscripciones/{postulante}/generar-cuenta', [PreinscripcionAdminController::class, 'generarCuenta']);
    });

    Route::get('/materias-all', [MateriaController::class, 'all']);
    Route::get('/materias/{materia_id}/temas', [MateriaController::class, 'getTemas']);

    /*
    |----------------------------------------------------------------------
    | Rutas de Postulante
    |----------------------------------------------------------------------
    */
    Route::middleware('role:postulante')->prefix('postulante')->group(function () {
        Route::get('/perfil',  [PostulanteController::class, 'perfil']);
        Route::get('/horario', [PostulanteController::class, 'horarioPostulante']);
        Route::get('/grupo-compañeros', [PostulanteController::class, 'misCompaneros']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Docente
    |----------------------------------------------------------------------
    */
    Route::middleware('role:docente')->prefix('docente')->group(function () {
        Route::get('/perfil', [DocentePortalController::class, 'perfil']);
        Route::get('/mis-grupos', [DocentePortalController::class, 'misGrupos']);
        Route::get('/mis-materias', [DocentePortalController::class, 'misMaterias']);
        Route::get('/mis-estudiantes', [DocentePortalController::class, 'misEstudiantes']);
        Route::get('/notas', [DocentePortalController::class, 'getNotas']);
        Route::post('/notas', [DocentePortalController::class, 'guardarNotas']);
        Route::put('/notas/{id}', [DocentePortalController::class, 'actualizarNota']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador Académico
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador,administrador')->prefix('coordinador')->group(function () {
        Route::get('/perfil',                             [CoordDocenteController::class, 'perfil']);
        Route::get('/dashboard',                          [CoordDocenteController::class, 'dashboard']);

        // Docentes académicos
        Route::get('/docentes',                           [CoordDocenteController::class, 'index']);
        Route::get('/docentes/materias',                  [CoordDocenteController::class, 'materias']);
        Route::get('/docentes/{id}',                      [CoordDocenteController::class, 'show']);
        Route::get('/docentes/{id}/carga-horaria',        [CoordDocenteController::class, 'cargaHoraria']);
        Route::post('/docentes/{id}/asignar-materia',     [CoordDocenteController::class, 'asignarMateria']);
        // Grupos coordinados
        Route::get('/grupos',                     [CoordGrupoController::class, 'index']);
        Route::post('/grupos',                    [CoordGrupoController::class, 'store']);
        Route::post('/grupos/auto-generar',       [CoordGrupoController::class, 'generarGruposAuto']);
        Route::post('/grupos/calcular',           [CoordGrupoController::class, 'calcularGrupos']);

        Route::get('/grupos/{id}',                [CoordGrupoController::class, 'show']);
        Route::put('/grupos/{id}',                [CoordGrupoController::class, 'update']);
        Route::delete('/grupos/{id}',             [CoordGrupoController::class, 'destroy']);

        Route::get('/grupos/{id}/estudiantes',    [CoordGrupoController::class, 'estudiantes']);
        Route::patch('/grupos/{id}/toggle-estado',[CoordGrupoController::class, 'toggleEstado']);

        Route::post('/grupos/{id}/asignar-estudiantes', [CoordAsignacionController::class, 'asignarEstudiantes']);
        Route::post('/grupos/{id}/asignar-docente',     [CoordAsignacionController::class, 'asignarDocenteAGrupo']);




        // Asignaciones
        Route::get('/asignacion/stats',                   [CoordAsignacionController::class, 'statsAsignacion']);
        Route::post('/asignacion/docentes-auto',          [CoordAsignacionController::class, 'asignarDocentesAuto']);
        Route::post('/asignacion/postulantes-auto',       [CoordAsignacionController::class, 'asignarPostulantesAuto']);
        Route::get('/asignacion/grupo/{grupoId}/postulantes', [CoordAsignacionController::class, 'postulantesEnGrupo']);
        Route::post('/asignacion/docentes-disponibles',   [CoordAsignacionController::class, 'docentesDisponibles']);
        Route::post('/asignacion/docente',                [CoordAsignacionController::class, 'asignarDocente']);
        Route::get('/asignacion/asignaciones',            [CoordAsignacionController::class, 'getAsignaciones']);
        Route::get('/postulantes-sin-grupo',              [CoordAsignacionController::class, 'postulantesSinGrupo']);

       // Reportes & Horarios
        Route::get('/horarios',              [CoordReporteController::class, 'horarios']);
        Route::post('/horarios',             [CoordGrupoController::class, 'crearHorario']);
        Route::get('/reporte/horarios',      [CoordReporteController::class, 'horarios']);
        Route::get('/reporte/horarios/csv',  [CoordReporteController::class, 'exportarCsv']);

        // Gestión de postulantes (coordinador)
        Route::get('/postulantes/export/csv',       [PostulanteController::class, 'exportarCsv']);
        Route::get('/postulantes',                  [PostulanteController::class, 'index']);
        Route::post('/postulantes/eliminar-multiple',[PostulanteController::class, 'eliminarMultiple']);
        Route::get('/postulantes/{id}',             [PostulanteController::class, 'show']);
        Route::put('/postulantes/{id}',             [PostulanteController::class, 'update']);
        Route::patch('/postulantes/{id}/requisitos',[PostulanteController::class, 'updateRequisitos']);
        Route::delete('/postulantes/{id}',          [PostulanteController::class, 'destroy']);
    });

    /*
|--------------------------------------------------------------------------
| Rutas de Autoridad Académica
|--------------------------------------------------------------------------
*/
        Route::middleware('role:autoridad,administrador')->prefix('autoridad')->group(function () {
        Route::get('/perfil',              [AutoridadPortalController::class, 'perfil']);
        Route::get('/dashboard',           [AutoridadPortalController::class, 'dashboard']);
        Route::get('/grupos',              [AutoridadPortalController::class, 'grupos']);
        Route::get('/docentes-asignados',  [AutoridadPortalController::class, 'docentesAsignados']);
        Route::get('/horarios',            [AutoridadPortalController::class, 'horarios']);
        Route::get('/estadisticas',        [AutoridadPortalController::class, 'estadisticas']);

    });

    /*
|--------------------------------------------------------------------------
| Rutas de Autoridad Académica
|--------------------------------------------------------------------------
*/
        Route::middleware('role:autoridad,administrador')->prefix('autoridad')->group(function () {
        Route::get('/perfil',             [AutoridadPortalController::class, 'perfil']);
        Route::get('/dashboard',          [AutoridadPortalController::class, 'dashboard']);
        Route::get('/grupos',             [AutoridadPortalController::class, 'grupos']);
        Route::get('/docentes_asignados', [AutoridadPortalController::class, 'docentesAsignados']);
        Route::get('/horarios',           [AutoridadPortalController::class, 'horarios']);
    Route::get('/estadisticas',       [AutoridadPortalController::class, 'estadisticas']);
});

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Postulantes
        Route::post('/postulantes/crear-cuentas', [PostulanteController::class, 'crearCuentasMasivo']);
        Route::post('/postulantes/eliminar-masivo', [PostulanteController::class, 'eliminarMasivo']);
        Route::post('/postulantes/eliminar-multiple', [PostulanteController::class, 'eliminarMultiple']);
        Route::post('/postulantes/importar-csv', [ImportacionController::class, 'importarPostulantesCsv']);
        Route::apiResource('/postulantes', PostulanteController::class);
        Route::post('/postulantes/{id}/foto', [PostulanteController::class, 'uploadFoto']);

        // Docentes — rutas específicas ANTES del apiResource para evitar conflictos
        Route::get('/docentes/usuario/{userId}/requisitos',  [DocenteController::class, 'getRequisitosPorUsuario']);
        Route::put('/docentes/usuario/{userId}/requisitos',  [DocenteController::class, 'updateRequisitosPorUsuario']);
        Route::apiResource('/docentes', DocenteController::class);

        // Materias
        Route::apiResource('/materias', MateriaController::class);

        // Grupos
        Route::apiResource('/grupos', GrupoController::class);
        Route::post('/grupos/{id}/asignar-postulante', [GrupoController::class, 'asignarPostulante']);
        Route::delete('/grupos/{grupoId}/postulantes/{postulanteId}', [GrupoController::class, 'removerPostulante']);
        Route::post('/grupos/auto-generar', [GrupoController::class, 'autoGenerar']);

        // Preinscripciones
        Route::get('/preinscripciones', [PreinscripcionController::class, 'index']);
    });
});
