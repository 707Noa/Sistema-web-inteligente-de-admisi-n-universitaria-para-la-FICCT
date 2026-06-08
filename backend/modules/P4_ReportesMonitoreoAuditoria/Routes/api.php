<?php

use Modules\P4_ReportesMonitoreoAuditoria\Controllers\DashboardController;
use Modules\P4_ReportesMonitoreoAuditoria\Controllers\ReporteController;
use Modules\P4_ReportesMonitoreoAuditoria\Controllers\AuditoriaController;
use Modules\P4_ReportesMonitoreoAuditoria\Controllers\AdmisionReporteController;
use Modules\P4_ReportesMonitoreoAuditoria\Controllers\CoordReporteController;
use Modules\P4_ReportesMonitoreoAuditoria\Controllers\DocenteReporteController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador,administrador')->prefix('coordinador')->group(function () {
        // Dashboard route is handled by P2's CoordDocenteController::dashboard
        Route::get('/reporte/horarios',     [CoordReporteController::class, 'horarios']);
        Route::get('/reporte/horarios/csv', [CoordReporteController::class, 'exportarCsv']);
        Route::get('/admision/exportar-csv', [AdmisionReporteController::class, 'exportarCsv']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Docente — Reportes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:docente')->prefix('docente')->group(function () {
        Route::get('/reporte/calificaciones', [DocenteReporteController::class, 'reporteCalificaciones']);
        Route::get('/reporte/asistencia',     [DocenteReporteController::class, 'reporteAsistencia']);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Autoridad
    |----------------------------------------------------------------------
    */
    Route::middleware('role:autoridad')->prefix('autoridad')->group(function () {
        // Dashboard route is handled by P2's AutoridadPortalController::dashboard
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
