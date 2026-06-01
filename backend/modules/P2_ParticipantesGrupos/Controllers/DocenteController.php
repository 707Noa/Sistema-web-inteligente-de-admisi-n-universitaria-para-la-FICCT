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
        $password = Hash::make('2026' . strrev($ci)); // contraseña: "2026" + CI invertido (igual al registro)
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
