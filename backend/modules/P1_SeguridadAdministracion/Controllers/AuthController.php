<?php

namespace Modules\P1_SeguridadAdministracion\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
            'perfil' => 'required|string|in:postulante,docente,coordinador,autoridad,administrador',
        ]);

        // Buscar usuario por email, CI o código de usuario
        $user = User::where('email', $request->login)
                    ->orWhere('ci', $request->login)
                    ->orWhere('codigo', $request->login)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditoriaService::registrar(
                $user?->id,
                'Intento fallido de login',
                'Autenticación',
                $request,
                'Login: ' . $request->login
            );

            return response()->json([
                'message' => 'Credenciales incorrectas.',
            ], 401);
        }

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Tu cuenta está inactiva. Contacta al administrador.',
            ], 403);
        }

        // Verificar que el rol coincida con el perfil seleccionado
        $roleName = $user->role->name ?? '';
        if ($roleName !== $request->perfil) {
            AuditoriaService::registrar(
                $user->id,
                'Intento de login con perfil incorrecto',
                'Autenticación',
                $request,
                "Perfil solicitado: {$request->perfil}, rol real: {$roleName}"
            );

            return response()->json([
                'message' => 'No tienes permiso para ingresar con este perfil.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        AuditoriaService::registrar(
            $user->id,
            'Inicio de sesión',
            'Autenticación',
            $request
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'ci' => $user->ci,
                'role' => $roleName,
                'estado' => $user->estado,
            ],
            'token' => $token,
            'redirect' => $this->getRedirectPath($roleName),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        AuditoriaService::registrar(
            $user->id,
            'Cierre de sesión',
            'Autenticación',
            $request
        );

        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'ci' => $user->ci,
            'role' => $user->role->name ?? '',
            'estado' => $user->estado,
        ]);
    }

    private function getRedirectPath(string $role): string
    {
        return match ($role) {
            'postulante' => '/postulante/inicio',
            'docente' => '/docente/inicio',
            'coordinador' => '/coordinador/dashboard',
            'autoridad' => '/autoridad/dashboard',
            'administrador' => '/admin/dashboard',
            default => '/',
        };
    }
}
