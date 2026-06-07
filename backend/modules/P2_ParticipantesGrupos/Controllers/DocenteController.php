<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use App\Models\User;
use App\Models\Role;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DocenteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Docente::with(['user', 'grupos']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%");
            });
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    /**
     * Crear docente + cuenta de usuario vinculada.
     * Contraseña: "2025" + CI invertido
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombres'         => 'required|string|max:191',
            'apellidos'       => 'required|string|max:191',
            'ci'              => 'required|string|unique:docentes,ci|unique:users,ci',
            'email'           => 'required|email|unique:docentes,email|unique:users,email',
            'celular'         => 'nullable|string|max:20',
            'profesion'       => 'nullable|string|max:191',
            'tiene_maestria'  => 'boolean',
            'tiene_diplomado' => 'boolean',
        ], [
            'email.required'           => 'El correo electrónico es obligatorio para crear la cuenta del docente.',
            'ci.unique'                => 'Ya existe un docente o usuario con este CI.',
            'email.unique'             => 'Ya existe un docente o usuario con este correo electrónico.',
        ]);

        $roleDocente = Role::where('name', 'docente')->first();
        if (!$roleDocente) {
            return response()->json(['message' => 'El rol "docente" no existe en el sistema.'], 500);
        }

        $ci       = $request->ci;
        $name     = trim($request->nombres . ' ' . $request->apellidos);
        $password = Hash::make($ci); // contraseña inicial es el CI
        $codigo   = '2026' . strrev($ci);             // registro

        // Transacción: ambos registros o ninguno
        $result = DB::transaction(function () use ($request, $ci, $name, $password, $codigo, $roleDocente) {
            $user = User::create([
                'name'                 => $name,
                'email'                => $request->email,
                'ci'                   => $ci,
                'password'             => $password,
                'role_id'              => $roleDocente->id,
                'estado'               => 'activo',
                'codigo'               => $codigo,
                'must_change_password' => false,
            ]);

            $docente = Docente::create([
                'user_id'         => $user->id,
                'nombres'         => $request->nombres,
                'apellidos'       => $request->apellidos,
                'ci'              => $ci,
                'email'           => $request->email,
                'celular'         => $request->celular ?? null,
                'profesion'       => $request->profesion ?? null,
                'tiene_maestria'  => $request->boolean('tiene_maestria'),
                'tiene_diplomado' => $request->boolean('tiene_diplomado'),
                'estado'          => 'activo',
            ]);

            return compact('docente', 'user');
        });

        AuditoriaService::registrar(
            $request->user()->id,
            'Registró un docente con cuenta de acceso',
            'Docentes',
            $request,
            "Docente: {$name} (CI: {$ci})"
        );

        return response()->json([
            'message' => 'Docente creado correctamente. Puede iniciar sesión con su correo y la contraseña generada.',
            'docente' => $result['docente'],
            'usuario' => [
                'email'  => $result['user']->email,
                'codigo' => $result['user']->codigo,
            ],
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Docente::with(['user', 'grupos.materia'])->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $docente = Docente::findOrFail($id);

        $request->validate([
            'nombres'   => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci'        => "required|string|unique:docentes,ci,{$id}",
        ]);

        $docente->update($request->all());

        // Sincronizar nombre en la cuenta de usuario vinculada
        if ($docente->user_id) {
            User::where('id', $docente->user_id)->update([
                'name' => trim($request->nombres . ' ' . $request->apellidos),
            ]);
        }

        AuditoriaService::registrar(
            $request->user()->id,
            'Editó un docente',
            'Docentes',
            $request,
            "Docente: {$docente->nombres} {$docente->apellidos}"
        );

        return response()->json($docente);
    }

    /**
     * Resuelve el registro de docente a partir de un user_id.
     * Busca por user_id primero; si no existe, busca por CI del usuario y vincula.
     * Si no existe de ninguna forma, devuelve null.
     */
    private function resolverDocente(int $userId): ?Docente
    {
        $docente = Docente::where('user_id', $userId)->first();
        if ($docente) return $docente;

        $user = User::find($userId);
        if ($user && $user->ci) {
            $docente = Docente::where('ci', $user->ci)->first();
            if ($docente && !$docente->user_id) {
                $docente->update(['user_id' => $userId]);
            }
        }
        return $docente;
    }

    /**
     * Obtener requisitos académicos del docente a partir de su user_id.
     * Si el usuario no tiene registro de docente vinculado, devuelve valores por defecto.
     */
    public function getRequisitosPorUsuario(int $userId): JsonResponse
    {
        $user = User::with('role')->findOrFail($userId);

        if ($user->role?->name !== 'docente') {
            return response()->json(['message' => 'Solo se pueden gestionar requisitos de docentes.'], 403);
        }

        $docente = $this->resolverDocente($userId);

        // Si no existe registro de docente, devolver valores por defecto sin error
        if (!$docente) {
            return response()->json([
                'docente_id'           => null,
                'nombres'              => $user->name,
                'apellidos'            => '',
                'ci'                   => $user->ci,
                'tiene_profesion_area' => false,
                'tiene_maestria'       => false,
                'tiene_diplomado'      => false,
                'estado_cumplimiento'  => 'NO_CUMPLE',
            ]);
        }

        $cumple = $docente->tiene_profesion_area
               && $docente->tiene_maestria
               && $docente->tiene_diplomado;

        return response()->json([
            'docente_id'           => $docente->id,
            'nombres'              => $docente->nombres,
            'apellidos'            => $docente->apellidos,
            'ci'                   => $docente->ci,
            'tiene_profesion_area' => (bool) $docente->tiene_profesion_area,
            'tiene_maestria'       => (bool) $docente->tiene_maestria,
            'tiene_diplomado'      => (bool) $docente->tiene_diplomado,
            'estado_cumplimiento'  => $cumple ? 'CUMPLE' : 'NO_CUMPLE',
        ]);
    }

    /**
     * Actualizar requisitos académicos del docente a partir de su user_id.
     * Si no existe registro de docente, lo crea con los datos del usuario.
     */
    public function updateRequisitosPorUsuario(Request $request, int $userId): JsonResponse
    {
        $user = User::with('role')->findOrFail($userId);

        if ($user->role?->name !== 'docente') {
            return response()->json(['message' => 'Solo se pueden gestionar requisitos de docentes.'], 403);
        }

        $request->validate([
            'tiene_profesion_area' => 'required|boolean',
            'tiene_maestria'       => 'required|boolean',
            'tiene_diplomado'      => 'required|boolean',
        ]);

        $docente = $this->resolverDocente($userId);

        // Si no existe registro de docente, crearlo a partir de los datos del usuario
        if (!$docente) {
            $parts = explode(' ', trim($user->name), 2);
            $docente = Docente::create([
                'user_id'              => $userId,
                'nombres'              => $parts[0],
                'apellidos'            => $parts[1] ?? '',
                'ci'                   => $user->ci,
                'email'                => $user->email,
                'estado'               => 'activo',
                'tiene_profesion_area' => false,
                'tiene_maestria'       => false,
                'tiene_diplomado'      => false,
            ]);
        }

        $docente->update([
            'tiene_profesion_area' => $request->boolean('tiene_profesion_area'),
            'tiene_maestria'       => $request->boolean('tiene_maestria'),
            'tiene_diplomado'      => $request->boolean('tiene_diplomado'),
        ]);

        $docente->refresh();
        $cumple = $docente->tiene_profesion_area
               && $docente->tiene_maestria
               && $docente->tiene_diplomado;

        AuditoriaService::registrar(
            $request->user()->id,
            'Actualizó requisitos del docente',
            'Docentes',
            $request,
            "Docente: {$docente->nombres} {$docente->apellidos} | Estado: " . ($cumple ? 'CUMPLE' : 'NO_CUMPLE')
        );

        return response()->json([
            'docente_id'           => $docente->id,
            'nombres'              => $docente->nombres,
            'apellidos'            => $docente->apellidos,
            'ci'                   => $docente->ci,
            'tiene_profesion_area' => (bool) $docente->tiene_profesion_area,
            'tiene_maestria'       => (bool) $docente->tiene_maestria,
            'tiene_diplomado'      => (bool) $docente->tiene_diplomado,
            'estado_cumplimiento'  => $cumple ? 'CUMPLE' : 'NO_CUMPLE',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $docente = Docente::findOrFail($id);
        $name    = "{$docente->nombres} {$docente->apellidos}";

        // Desactivar la cuenta de usuario en lugar de borrar
        if ($docente->user_id) {
            User::where('id', $docente->user_id)->update(['estado' => 'inactivo']);
        }

        $docente->update(['estado' => 'inactivo']);

        AuditoriaService::registrar(
            $request->user()->id,
            'Desactivó un docente',
            'Docentes',
            $request,
            "Docente: {$name}"
        );

        return response()->json(['message' => 'Docente desactivado.']);
    }
}
