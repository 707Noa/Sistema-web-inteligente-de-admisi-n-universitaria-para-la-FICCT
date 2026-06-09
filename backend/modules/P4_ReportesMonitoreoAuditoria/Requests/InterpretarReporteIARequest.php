<?php

namespace Modules\P4_ReportesMonitoreoAuditoria\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InterpretarReporteIARequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'texto' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'texto.required' => 'El texto dictado es requerido.',
            'texto.min' => 'El texto debe tener al menos 3 caracteres.',
            'texto.max' => 'El texto no puede superar los 500 caracteres.',
        ];
    }
}
