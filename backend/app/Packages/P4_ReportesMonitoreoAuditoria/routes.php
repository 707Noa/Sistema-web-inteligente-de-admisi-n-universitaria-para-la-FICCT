<?php

use App\Packages\P4_ReportesMonitoreoAuditoria\Controllers\DashboardController;
use App\Packages\P4_ReportesMonitoreoAuditoria\Controllers\ReporteController;
use App\Packages\P4_ReportesMonitoreoAuditoria\Controllers\AuditoriaController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador')->prefix('coordinador')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index']);
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
