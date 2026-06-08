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

        // Buscar usuario por email, CI o código de usuario (insensible a mayúsculas/minúsculas y recortando espacios)
        $login = trim($request->login);
        $user = User::where(function ($query) use ($login) {
            $query->where('ci', 'ilike', $login)
                  ->orWhere('codigo', 'ilike', $login)
                  ->orWhere('email', 'ilike', $login)
                  ->orWhereHas('postulante', function ($q) use ($login) {
                      $q->where('codigo_usuario', 'ilike', $login)
                        ->orWhere('ci', 'ilike', $login);
                  });
        })->first();

        if (!$user) {
            \Illuminate\Support\Facades\Log::warning("Fallo de login para '{$request->login}': Usuario no encontrado.");
            $debugResponse = config('app.debug') ? ['debug_reason' => 'Usuario no encontrado.'] : [];
            return response()->json(array_merge([

                'message' => 'El usuario no se encuentra registrado.',

                'message' => 'Credenciales incorrectas.',

            ], $debugResponse), 401);
        }

        if (!Hash::check($request->password, $user->password)) {
            AuditoriaService::registrar(
                $user->id,
                'Intento fallido de login',
                'Autenticación',
                $request,
                'Login: ' . $request->login
            );
            \Illuminate\Support\Facades\Log::warning("Fallo de login para '{$request->login}': Contraseña incorrecta.");
            $debugResponse = config('app.debug') ? ['debug_reason' => 'Contraseña incorrecta.'] : [];
            return response()->json(array_merge([

                'message' => 'Contraseña incorrecta.',
                'message' => 'Credenciales incorrectas.',

            ], $debugResponse), 401);
        }

        if (!$user->isActive()) {
            \Illuminate\Support\Facades\Log::warning("Fallo de login para '{$request->login}': Usuario inactivo.");
            $debugResponse = config('app.debug') ? ['debug_reason' => 'Usuario inactivo.'] : [];
            return response()->json(array_merge([
                'message' => 'La cuenta se encuentra inactiva. Contacte con administración.',
            ], $debugResponse), 403);
        }


        // Reglas de acceso dual (no aplica para administradores: cuenta de sistema)
        $roleName = $user->role->name ?? '';
        if (!$user->must_change_password && strtolower($roleName) !== 'administrador') {
            if (strtolower($user->email ?? '') === strtolower($login)) {
                return response()->json([
                    'message' => 'Acceso denegado. El usuario ya actualizó sus datos de acceso. Use su código de registro.',
                ], 401);
            }
            if (strtolower($roleName) === 'postulante') {
                $codigo = $user->codigo ?? '';
                if (strtolower($codigo) !== strtolower($login)) {
                    return response()->json([
                        'message' => 'Acceso denegado. Para ingresar debe utilizar su código de registro.',
                    ], 401);
                }
            } else {
                $codigo = $user->codigo ?? '';
                $ci = $user->ci ?? '';
                if (strtolower($codigo) !== strtolower($login) && strtolower($ci) !== strtolower($login)) {
                    return response()->json([
                        'message' => 'Acceso denegado. Debe iniciar sesión con su código de usuario o CI.',
                    ], 401);
                }
            }
        }

        // Verificar que el rol coincida con el perfil seleccionado
        if (strtolower($roleName) !== strtolower($request->perfil)) {
            AuditoriaService::registrar(
                $user->id,
                'Intento de login con perfil incorrecto',
                'Autenticación',
                $request,
                "Perfil solicitado: {$request->perfil}, rol real: {$roleName}"
            );
            \Illuminate\Support\Facades\Log::warning("Fallo de login para '{$request->login}': Rol incorrecto. Perfil solicitado: {$request->perfil}, rol real: {$roleName}");
            $debugResponse = config('app.debug') ? ['debug_reason' => 'Rol incorrecto.'] : [];
            return response()->json(array_merge([
                'message' => 'No tienes permiso para ingresar con este perfil.',
            ], $debugResponse), 403);
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
                'id'                   => $user->id,
                'name'                 => $user->name,
                'email'                => $user->email,
                'ci'                   => $user->ci,
                'codigo'               => $user->codigo,
                'role'                 => $roleName,
                'estado'               => $user->estado,
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'token'    => $token,
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
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'ci'                   => $user->ci,
            'codigo'               => $user->codigo,
            'role'                 => $user->role->name ?? '',
            'estado'               => $user->estado,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    /**
     * Cambio de contraseña obligatorio en el primer login.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[!@#$%^&*(),.?":{}|<>_+\\-=\\[\\]]/',
            ],
        ], [
            'new_password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'new_password.regex' => 'La contraseña debe contener al menos una minúscula, una mayúscula y un carácter especial.',
            'new_password.confirmed' => 'Las contraseñas de confirmación no coinciden.',
        ]);

        $user = $request->user();
        $user->password = Hash::make($request->new_password);
        $user->must_change_password = false;
        $user->save();

        AuditoriaService::registrar(
            $user->id,
            'Cambio de contraseña',
            'Autenticación',
            $request
        );

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    private function getRedirectPath(string $role): string
    {
        return match(strtolower($role)) {
            'administrador' => '/admin/dashboard',
            'coordinador'   => '/coordinador/dashboard',

            'docente'       => '/docente/grupos',
            'postulante'    => '/perfil',

            'docente'       => '/docente/perfil',
            'postulante'    => '/postulante/perfil',

            'autoridad'     => '/autoridad/dashboard',
            default         => '/perfil',
        };
    }
}
