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
use Illuminate\Support\Facades\Route;

// Preinscripción pública
Route::post('/preinscripcion', [PreinscripcionController::class, 'store']);
Route::post('/preinscripciones', [PreinscripcionController::class, 'store']);
Route::get('/preinscripciones/{id}', [PreinscripcionController::class, 'show']);
Route::get('/carreras-disponibles', [PreinscripcionController::class, 'carrerasDisponibles']);

// Pasarelas de Pago Públicas
Route::post('/preinscripcion/{id}/pago/stripe/checkout', [PreinscripcionController::class, 'stripeCheckout']);
Route::post('/preinscripcion/{id}/pago/paypal/create-order', [PreinscripcionController::class, 'paypalCreateOrder']);
Route::post('/preinscripcion/{id}/pago/paypal/capture', [PreinscripcionController::class, 'paypalCapture']);
Route::get('/preinscripcion/{id}/pago/estado', [PreinscripcionController::class, 'pagoEstado']);
Route::post('/preinscripcion/{id}/pago/simular', [PreinscripcionController::class, 'simularPago']);
Route::post('/webhooks/stripe', [PreinscripcionController::class, 'stripeWebhook']);

Route::middleware('auth:sanctum')->group(function () {
    // Preinscripciones privadas admin/coordinador
    Route::middleware('role:administrador,coordinador')->group(function () {
        Route::get('/preinscripciones', [PreinscripcionAdminController::class, 'index']);
        Route::get('/preinscripciones/exportar-csv', [PreinscripcionAdminController::class, 'exportarCsv']);
        Route::post('/preinscripciones/generar-cuentas', [PreinscripcionAdminController::class, 'generarCuentasMasivo']);
        Route::post('/preinscripciones/{postulante}/generar-cuenta', [PreinscripcionAdminController::class, 'generarCuenta']);
        Route::get('/postulantes/{id}/documento/{type}', [PreinscripcionAdminController::class, 'descargarDocumento']);
    });

    Route::get('/materias-all', [MateriaController::class, 'all']);

    /*
    |----------------------------------------------------------------------
    | Rutas de Postulante
    |----------------------------------------------------------------------
    */
    Route::middleware('role:postulante')->prefix('postulante')->group(function () {
        Route::get('/perfil',  [PostulanteController::class, 'perfil']);
        Route::get('/horario', [PostulanteController::class, 'horarioPostulante']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Docente
    |----------------------------------------------------------------------
    */
    Route::middleware('role:docente')->prefix('docente')->group(function () {
        Route::get('/mis-grupos', [GrupoController::class, 'index']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador Académico
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador,administrador')->prefix('coordinador')->group(function () {
        // Docentes académicos
        Route::get('/docentes',                           [CoordDocenteController::class, 'index']);
        Route::get('/docentes/materias',                  [CoordDocenteController::class, 'materias']);
        Route::get('/docentes/{id}',                      [CoordDocenteController::class, 'show']);
        Route::post('/docentes/{id}/asignar-materia',     [CoordDocenteController::class, 'asignarMateria']);

        // Grupos coordinados
        Route::get('/grupos',                             [CoordGrupoController::class, 'index']);
        Route::post('/grupos/auto-generar',               [CoordGrupoController::class, 'generarGruposAuto']);
        Route::get('/grupos/{id}',                        [CoordGrupoController::class, 'show']);
        Route::put('/grupos/{id}',                        [CoordGrupoController::class, 'update']);
        Route::patch('/grupos/{id}/toggle-estado',        [CoordGrupoController::class, 'toggleEstado']);
        Route::delete('/grupos/{id}',                     [CoordGrupoController::class, 'destroy']);

        // Asignaciones
        Route::get('/asignacion/stats',                   [CoordAsignacionController::class, 'statsAsignacion']);
        Route::post('/asignacion/docentes-auto',          [CoordAsignacionController::class, 'asignarDocentesAuto']);
        Route::post('/asignacion/postulantes-auto',       [CoordAsignacionController::class, 'asignarPostulantesAuto']);
        Route::get('/asignacion/grupo/{grupoId}/postulantes', [CoordAsignacionController::class, 'postulantesEnGrupo']);
        Route::post('/asignacion/docentes-disponibles',   [CoordAsignacionController::class, 'docentesDisponibles']);
        Route::post('/asignacion/docente',                [CoordAsignacionController::class, 'asignarDocente']);
        Route::get('/asignacion/asignaciones',            [CoordAsignacionController::class, 'getAsignaciones']);

    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Postulantes
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
