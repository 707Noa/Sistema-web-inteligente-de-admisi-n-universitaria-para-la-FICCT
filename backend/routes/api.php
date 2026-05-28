<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ForgotPasswordController;
use App\Http\Controllers\Api\ResetPasswordController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\PostulanteController;
use App\Http\Controllers\Api\DocenteController;
use App\Http\Controllers\Api\GrupoController;
use App\Http\Controllers\Api\MateriaController;
use App\Http\Controllers\Api\ExamenController;
use App\Http\Controllers\Api\PreinscripcionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\AuditoriaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas Públicas
|--------------------------------------------------------------------------
*/
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/auth/reset-password', [ResetPasswordController::class, 'reset']);

// Preinscripción pública
Route::post('/preinscripciones', [PreinscripcionController::class, 'store']);
Route::get('/preinscripciones/{id}', [PreinscripcionController::class, 'show']);
Route::get('/carreras-disponibles', [PreinscripcionController::class, 'carrerasDisponibles']);

/*
|--------------------------------------------------------------------------
| Rutas Autenticadas
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Roles (para formularios)
    Route::get('/roles', [UsuarioController::class, 'roles']);
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
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::apiResource('/postulantes', PostulanteController::class);
        Route::apiResource('/grupos', GrupoController::class);
        Route::apiResource('/examenes', ExamenController::class);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Autoridad
    |----------------------------------------------------------------------
    */
    Route::middleware('role:autoridad')->prefix('autoridad')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/reportes/postulantes', [ReporteController::class, 'postulantes']);
        Route::get('/reportes/aprobados', [ReporteController::class, 'aprobados']);
        Route::get('/reportes/reprobados', [ReporteController::class, 'reprobados']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Usuarios
        Route::apiResource('/usuarios', UsuarioController::class);
        Route::put('/usuarios/{id}/activate', [UsuarioController::class, 'activate']);
        Route::put('/usuarios/{id}/deactivate', [UsuarioController::class, 'deactivate']);
        Route::put('/usuarios/{id}/change-password', [UsuarioController::class, 'changePassword']);

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

        // Exámenes
        Route::apiResource('/examenes', ExamenController::class);

        // Preinscripciones
        Route::get('/preinscripciones', [PreinscripcionController::class, 'index']);

        // Reportes
        Route::get('/reportes/postulantes', [ReporteController::class, 'postulantes']);
        Route::get('/reportes/aprobados', [ReporteController::class, 'aprobados']);
        Route::get('/reportes/reprobados', [ReporteController::class, 'reprobados']);
        Route::get('/reportes/promedios', [ReporteController::class, 'promedios']);
        Route::get('/reportes/grupos', [ReporteController::class, 'grupos']);
        Route::get('/reportes/docentes-por-grupo', [ReporteController::class, 'docentesPorGrupo']);
        Route::get('/reportes/auditorias', [ReporteController::class, 'auditorias']);

        // Auditoría
        Route::get('/auditorias', [AuditoriaController::class, 'index']);
        Route::get('/auditorias/{id}', [AuditoriaController::class, 'show']);
    });
});
