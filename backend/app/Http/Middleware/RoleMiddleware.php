<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->role) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (!$user->isActive()) {
            return response()->json(['message' => 'Tu cuenta está inactiva.'], 403);
        }

        if (!in_array($user->role->name, $roles)) {
            return response()->json([
                'message' => 'No tienes permiso para ingresar con este perfil.',
            ], 403);
        }

        return $next($request);
    }
}
