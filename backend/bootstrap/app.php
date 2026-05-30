<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        health: '/up',
        then: function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('modules/P1_SeguridadAdministracion/Routes/api.php'));

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('modules/P2_ParticipantesGrupos/Routes/api.php'));

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('modules/P3_EvaluacionResultados/Routes/api.php'));

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('modules/P4_ReportesMonitoreoAuditoria/Routes/api.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/preinscripcion',
            'api/preinscripciones',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
