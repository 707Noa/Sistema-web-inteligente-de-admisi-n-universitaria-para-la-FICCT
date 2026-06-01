<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Materia;
use App\Models\DocenteEspecialidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoordDocenteController extends Controller
{
    private const MATERIAS_VALIDAS = ['Computación', 'Física', 'Inglés', 'Matemáticas'];

    /** Lista usuarios con rol=docente e incluye su especialidad. */
    public function index(Request $request): JsonResponse
    {
        $search = $request->input('search');

        $query = User::with(['role', 'especialidadDocente.materia'])
            ->whereHas('role', fn($q) => $q->where('name', 'docente'));

        if (!empty($search)) {
            $query->where(fn($q) => $q
                ->where('name', 'ilike', "%{$search}%")
                ->orWhere('ci', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%")
            );
        }

        $docentes = $query->orderBy('name')->get()->map(fn($u) => [
            'id'              => $u->id,
            'name'            => $u->name,
            'ci'              => $u->ci,
            'email'           => $u->email,
            'codigo'          => $u->codigo,
            'estado'          => $u->estado,
            'materia_id'      => $u->especialidadDocente?->materia_id,
            'materia_nombre'  => $u->especialidadDocente?->materia?->nombre,
        ]);

        return response()->json($docentes);
    }

    /** Ver detalle de un docente. */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['role', 'especialidadDocente.materia'])
            ->whereHas('role', fn($q) => $q->where('name', 'docente'))
            ->findOrFail($id);

        return response()->json([
            'id'             => $user->id,
            'name'           => $user->name,
            'ci'             => $user->ci,
            'email'          => $user->email,
            'codigo'         => $user->codigo,
            'estado'         => $user->estado,
            'materia_id'     => $user->especialidadDocente?->materia_id,
            'materia_nombre' => $user->especialidadDocente?->materia?->nombre,
        ]);
    }

    /** Asignar o actualizar la materia principal de un docente. */
    public function asignarMateria(Request $request, int $id): JsonResponse
    {
        $user = User::whereHas('role', fn($q) => $q->where('name', 'docente'))->findOrFail($id);

        $request->validate([
            'materia_id' => 'required|exists:materias,id',
        ]);

        $materia = Materia::findOrFail($request->materia_id);

        if (!in_array($materia->nombre, self::MATERIAS_VALIDAS)) {
            return response()->json([
                'message' => 'La materia seleccionada no es válida. Solo se permiten: ' . implode(', ', self::MATERIAS_VALIDAS),
            ], 422);
        }

        DocenteEspecialidad::updateOrCreate(
            ['user_id'    => $user->id],
            ['materia_id' => $request->materia_id, 'estado' => 'activo']
        );

        return response()->json([
            'message'        => 'Materia asignada correctamente.',
            'materia_nombre' => $materia->nombre,
        ]);
    }

    /** Lista las materias disponibles para asignar. */
    public function materias(): JsonResponse
    {
        $materias = Materia::whereIn('nombre', self::MATERIAS_VALIDAS)
            ->where('estado', 'activo')
            ->get(['id', 'nombre', 'codigo']);

        return response()->json($materias);
    }
}
