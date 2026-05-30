<?php

namespace Modules\P1_SeguridadAdministracion\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('role');

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('email', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%");
            });
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->has('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'email' => 'required|email|unique:users,email',
            'ci' => 'nullable|string|unique:users,ci',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'ci' => $request->ci,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'estado' => 'activo',
        ]);

        AuditoriaService::registrar(
            $request->user()->id,
            'Registró un usuario',
            'Usuarios',
            $request,
            "Usuario: {$user->name}"
        );

        return response()->json($user->load('role'), 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with('role')->findOrFail($id);
        return response()->json($user);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:191',
            'email' => "required|email|unique:users,email,{$id}",
            'ci' => "nullable|string|unique:users,ci,{$id}",
            'role_id' => 'required|exists:roles,id',
        ]);

        $user->update($request->only(['name', 'email', 'ci', 'role_id']));

        AuditoriaService::registrar(
            $request->user()->id,
            'Editó un usuario',
            'Usuarios',
            $request,
            "Usuario: {$user->name}"
        );

        return response()->json($user->load('role'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $name = $user->name;
        $user->delete();

        AuditoriaService::registrar(
            $request->user()->id,
            'Eliminó un usuario',
            'Usuarios',
            $request,
            "Usuario: {$name}"
        );

        return response()->json(['message' => 'Usuario eliminado.']);
    }

    public function activate(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['estado' => 'activo']);

        AuditoriaService::registrar($request->user()->id, 'Activó un usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json($user->load('role'));
    }

    public function deactivate(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['estado' => 'inactivo']);

        AuditoriaService::registrar($request->user()->id, 'Inactivó un usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json($user->load('role'));
    }

    public function changePassword(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::findOrFail($id);
        $user->update(['password' => Hash::make($request->password)]);

        AuditoriaService::registrar($request->user()->id, 'Cambió contraseña de usuario', 'Usuarios', $request, "Usuario: {$user->name}");

        return response()->json(['message' => 'Contraseña actualizada.']);
    }

    public function roles(): JsonResponse
    {
        return response()->json(Role::all());
    }
}
