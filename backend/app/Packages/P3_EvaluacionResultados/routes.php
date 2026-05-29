<?php

use App\Packages\P3_EvaluacionResultados\Controllers\ExamenController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    /*
    |----------------------------------------------------------------------
    | Rutas de Coordinador
    |----------------------------------------------------------------------
    */
    Route::middleware('role:coordinador')->prefix('coordinador')->group(function () {
        Route::apiResource('/examenes', ExamenController::class);
    });

    /*
    |----------------------------------------------------------------------
    | Rutas de Administrador (acceso total)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Exámenes
        Route::apiResource('/examenes', ExamenController::class);
    });
});
