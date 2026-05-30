<?php

use Modules\P2_ParticipantesGrupos\Controllers\PreinscripcionController;
use Modules\P2_ParticipantesGrupos\Controllers\PreinscripcionAdminController;
use Modules\P2_ParticipantesGrupos\Controllers\PostulanteController;
use Modules\P2_ParticipantesGrupos\Controllers\DocenteController;
use Modules\P2_ParticipantesGrupos\Controllers\GrupoController;
use Modules\P2_ParticipantesGrupos\Controllers\MateriaController;
use Illuminate\Support\Facades\Route;

// Preinscripción pública
Route::post('/preinscripcion', [PreinscripcionController::class, 'store']);
Route::post('/preinscripciones', [PreinscripcionController::class, 'store']);
Route::get('/preinscripciones/{id}', [PreinscripcionController::class, 'show']);
Route::get('/carreras-disponibles', [PreinscripcionController::class, 'carrerasDisponibles']);

Route::middleware('auth:sanctum')->group(function () {
    // Preinscripciones privadas admin/coordinador
    Route::middleware('role:administrador,coordinador')->group(function () {
        Route::get('/preinscripciones', [PreinscripcionAdminController::class, 'index']);
        Route::get('/preinscripciones/exportar-csv', [PreinscripcionAdminController::class, 'exportarCsv']);
        Route::post('/preinscripciones/generar-cuentas', [PreinscripcionAdminController::class, 'generarCuentasMasivo']);
        Route::post('/preinscripciones/{postulante}/generar-cuenta', [PreinscripcionAdminController::class, 'generarCuenta']);
    });

    Route::get('/materias-all', [MateriaController::class, 'all']);

    /*
    |----------------------------------------------------------------------
    | Rutas de Postulante
    |----------------------------------------------------------------------
    */
    Route::middleware('role:postulante')->prefix('postulante')->group(function () {
        Route::get('/perfil', [PostulanteController::class, 'perfil']);
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
    | Rutas de Coordinador
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador')->prefix('coordinador')->group(function () {
        Route::apiResource('/postulantes', PostulanteController::class);
        Route::apiResource('/grupos', GrupoController::class);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Postulantes
        Route::apiResource('/postulantes', PostulanteController::class);
        Route::post('/postulantes/{id}/foto', [PostulanteController::class, 'uploadFoto']);

        // Docentes
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
