<?php

use Modules\P3_EvaluacionResultados\Controllers\ExamenController;
use Modules\P3_EvaluacionResultados\Controllers\DocenteAcademicoController;
use Modules\P3_EvaluacionResultados\Controllers\PostulanteAcademicoController;
use Modules\P3_EvaluacionResultados\Controllers\CuposCarreraController;
use Modules\P3_EvaluacionResultados\Controllers\AdmisionFinalController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    /*
    |----------------------------------------------------------------------
    | Rutas de Postulante
    |----------------------------------------------------------------------
    */
    Route::middleware('role:postulante')->prefix('postulante')->group(function () {
        Route::get('/calificaciones', [PostulanteAcademicoController::class, 'calificaciones']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador,administrador')->prefix('coordinador')->group(function () {
        Route::apiResource('/examenes', ExamenController::class);

        // Cupos por carrera
        Route::get('/cupos-carrera',                    [CuposCarreraController::class, 'index']);
        Route::post('/cupos-carrera',                   [CuposCarreraController::class, 'store']);
        Route::put('/cupos-carrera/{id}',               [CuposCarreraController::class, 'update']);
        Route::patch('/cupos-carrera/{id}/toggle-estado', [CuposCarreraController::class, 'toggleEstado']);
        Route::post('/cupos-carrera/{id}/revertir',     [CuposCarreraController::class, 'revertir']);

        // Admisión final
        Route::get('/admision/gestiones',               [AdmisionFinalController::class, 'gestiones']);
        Route::get('/admision/resultados',              [AdmisionFinalController::class, 'resultados']);
        Route::post('/admision/procesar',               [AdmisionFinalController::class, 'procesar']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        Route::apiResource('/examenes', ExamenController::class);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Docente
    |----------------------------------------------------------------------
    */
    Route::middleware('role:docente')->prefix('docente')->group(function () {
        // Perfil propio
        Route::get('/perfil', [DocenteAcademicoController::class, 'perfil']);

        // Carga horaria
        Route::get('/horario', [DocenteAcademicoController::class, 'horario']);

        // Grupos asignados
        Route::get('/grupos', [DocenteAcademicoController::class, 'grupos']);
        Route::get('/grupos/{id}/estudiantes', [DocenteAcademicoController::class, 'estudiantesGrupo']);
        Route::get('/mis-grupos', [DocenteAcademicoController::class, 'misGruposCompleto']);

        // Asistencia
        Route::get('/asistencia', [DocenteAcademicoController::class, 'listarAsistencia']);
        Route::post('/asistencia', [DocenteAcademicoController::class, 'guardarAsistencia']);

        // Calificaciones
        Route::post('/calificaciones', [DocenteAcademicoController::class, 'guardarCalificacion']);

    });
});
