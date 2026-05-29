<?php

namespace App\Packages\P2_ParticipantesGrupos\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Postulante;
use App\Packages\P4_ReportesMonitoreoAuditoria\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostulanteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Postulante::with(['user', 'grupos', 'examenes.materia']);

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nombres', 'ilike', "%{$s}%")
                  ->orWhere('apellidos', 'ilike', "%{$s}%")
                  ->orWhere('ci', 'ilike', "%{$s}%")
                  ->orWhere('carrera_postulada', 'ilike', "%{$s}%");
            });
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        $postulantes = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($postulantes);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => 'required|string|unique:postulantes,ci',
            'email' => 'nullable|email',
            'genero' => 'nullable|in:masculino,femenino,otro',
            'fecha_nacimiento' => 'nullable|date',
        ]);

        $data = $request->all();
        $data['codigo_qr'] = 'POST-' . uniqid();

        $postulante = Postulante::create($data);

        AuditoriaService::registrar(
            $request->user()->id,
            'Registró un postulante',
            'Postulantes',
            $request,
            "Postulante: {$postulante->nombres} {$postulante->apellidos}"
        );

        return response()->json($postulante, 201);
    }

    public function show(int $id): JsonResponse
    {
        $postulante = Postulante::with(['user', 'grupos.docente', 'grupos.materia', 'examenes.materia'])->findOrFail($id);
        return response()->json($postulante);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);

        $request->validate([
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => "required|string|unique:postulantes,ci,{$id}",
        ]);

        $postulante->update($request->all());

        AuditoriaService::registrar(
            $request->user()->id,
            'Editó un postulante',
            'Postulantes',
            $request,
            "Postulante: {$postulante->nombres} {$postulante->apellidos}"
        );

        return response()->json($postulante);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $postulante = Postulante::findOrFail($id);
        $name = "{$postulante->nombres} {$postulante->apellidos}";
        $postulante->delete();

        AuditoriaService::registrar($request->user()->id, 'Eliminó un postulante', 'Postulantes', $request, "Postulante: {$name}");

        return response()->json(['message' => 'Postulante eliminado.']);
    }

    public function perfil(Request $request): JsonResponse
    {
        $user = $request->user();
        $postulante = Postulante::with(['grupos.docente', 'grupos.materia', 'examenes.materia'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        return response()->json($postulante);
    }

    public function uploadFoto(Request $request, int $id): JsonResponse
    {
        $request->validate(['foto' => 'required|image|max:2048']);
        $postulante = Postulante::findOrFail($id);

        $path = $request->file('foto')->store('fotos/postulantes', 'public');
        $postulante->update(['foto' => $path]);

        return response()->json(['foto' => $path]);
    }
}
