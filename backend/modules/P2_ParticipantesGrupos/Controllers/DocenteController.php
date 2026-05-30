<?php

namespace Modules\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Docente;
use Modules\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocenteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Docente::with(['user', 'grupos']);

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%");
            });
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => 'required|string|unique:docentes,ci',
            'email' => 'nullable|email',
            'tiene_maestria' => 'boolean',
            'tiene_diplomado' => 'boolean',
        ]);

        $docente = Docente::create($request->all());

        AuditoriaService::registrar($request->user()->id, 'Registró un docente', 'Docentes', $request, "Docente: {$docente->nombres} {$docente->apellidos}");

        return response()->json($docente, 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Docente::with(['user', 'grupos.materia'])->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $docente = Docente::findOrFail($id);

        $request->validate([
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => "required|string|unique:docentes,ci,{$id}",
        ]);

        $docente->update($request->all());

        AuditoriaService::registrar($request->user()->id, 'Editó un docente', 'Docentes', $request, "Docente: {$docente->nombres} {$docente->apellidos}");

        return response()->json($docente);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $docente = Docente::findOrFail($id);
        $name = "{$docente->nombres} {$docente->apellidos}";
        $docente->delete();

        AuditoriaService::registrar($request->user()->id, 'Eliminó un docente', 'Docentes', $request, "Docente: {$name}");

        return response()->json(['message' => 'Docente eliminado.']);
    }
}
