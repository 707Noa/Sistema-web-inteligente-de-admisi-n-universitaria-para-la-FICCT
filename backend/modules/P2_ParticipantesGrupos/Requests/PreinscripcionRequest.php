<?php

namespace Modules\P2_ParticipantesGrupos\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PreinscripcionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'nombres' => 'required|string|max:191',
            'apellidos' => 'required|string|max:191',
            'ci' => 'required|string|max:20|unique:postulantes,ci',
            'genero' => 'nullable|string|max:50',
            'sexo' => 'nullable|string|max:50',
            'fecha_nacimiento' => 'nullable|date',
            'telefono' => 'nullable|string|max:20|unique:postulantes,celular',
            'segundo_telefono' => 'nullable|string|max:20',
            'correo_electronico' => 'required|email|max:191|unique:postulantes,email',
            'direccion' => 'nullable|string',
            'colegio_procedencia' => 'nullable|string|max:191',
            'ciudad' => 'nullable|string|max:100',
            'carrera' => 'nullable|string|max:191',
            'primera_opcion_carrera' => 'nullable|string|max:191',
            'segunda_opcion_carrera' => 'nullable|string|max:191',
            'titulo_bachiller' => 'nullable|boolean',
            'otros' => 'nullable|string',
            'imagen_ci' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'imagen_titulo_bachiller' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'nombres.required' => 'El nombre es obligatorio.',
            'apellidos.required' => 'El apellido es obligatorio.',
            'ci.required' => 'El CI es obligatorio.',
            'ci.unique' => 'El CI ya está registrado.',
            'telefono.unique' => 'El teléfono ya está registrado.',
            'correo_electronico.required' => 'El correo electrónico es obligatorio.',
            'correo_electronico.email' => 'El formato del correo electrónico no es válido.',
            'correo_electronico.unique' => 'El correo electrónico ya está registrado.',
            'imagen_ci.required' => 'La imagen del CI es obligatoria.',
            'imagen_ci.image' => 'El archivo del CI debe ser una imagen.',
            'imagen_ci.mimes' => 'El CI debe estar en formato JPG, JPEG, PNG o WEBP.',
            'imagen_ci.max' => 'La imagen del CI no debe superar los 5 MB.',
            'imagen_titulo_bachiller.required' => 'La imagen del título de bachiller es obligatoria.',
            'imagen_titulo_bachiller.image' => 'El archivo del título debe ser una imagen.',
            'imagen_titulo_bachiller.mimes' => 'El título debe estar en formato JPG, JPEG, PNG o WEBP.',
            'imagen_titulo_bachiller.max' => 'La imagen del título no debe superar los 5 MB.',
        ];
    }
}
