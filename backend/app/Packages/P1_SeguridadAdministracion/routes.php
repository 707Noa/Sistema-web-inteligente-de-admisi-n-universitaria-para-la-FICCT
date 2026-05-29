<?php

use App\Packages\P1_SeguridadAdministracion\Controllers\AuthController;
use App\Packages\P1_SeguridadAdministracion\Controllers\ForgotPasswordController;
use App\Packages\P1_SeguridadAdministracion\Controllers\ResetPasswordController;
use App\Packages\P1_SeguridadAdministracion\Controllers\UsuarioController;
use Illuminate\Support\Facades\Route;

// Rutas Públicas
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/auth/reset-password', [ResetPasswordController::class, 'reset']);

// Rutas Autenticadas
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    // Roles (para formularios)
    Route::get('/roles', [UsuarioController::class, 'roles']);

    Route::middleware('role:administrador')->prefix('admin')->group(function () {
        // Usuarios
        Route::apiResource('/usuarios', UsuarioController::class);
        Route::put('/usuarios/{id}/activate', [UsuarioController::class, 'activate']);
        Route::put('/usuarios/{id}/deactivate', [UsuarioController::class, 'deactivate']);
        Route::put('/usuarios/{id}/change-password', [UsuarioController::class, 'changePassword']);
    });
});
