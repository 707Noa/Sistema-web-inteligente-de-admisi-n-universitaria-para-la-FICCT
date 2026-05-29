<?php

namespace App\Packages\P2_ParticipantesGrupos\Requests;

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
            'telefono' => 'nullable|string|max:20',
            'segundo_telefono' => 'nullable|string|max:20',
            'correo_electronico' => 'required|email|max:191',
            'direccion' => 'nullable|string',
            'colegio_procedencia' => 'nullable|string|max:191',
            'ciudad' => 'nullable|string|max:100',
            'carrera' => 'nullable|string|max:191',
            'titulo_bachiller' => 'nullable|boolean',
            'otros' => 'nullable|string',
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
            'ci.unique' => 'El CI ya fue registrado.',
            'correo_electronico.required' => 'El correo electrónico es obligatorio.',
            'correo_electronico.email' => 'El formato del correo electrónico no es válido.',
        ];
    }
}
