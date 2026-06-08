<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PreinscripcionTemporal extends Model
{
    protected $table = 'preinscripciones_temporales';

    protected $fillable = [
        'ci',
        'datos_formulario',
        'documentos_temporales',
        'stripe_session_id',
        'estado_pago',
        'expires_at',
    ];

    protected $casts = [
        'datos_formulario' => 'array',
        'documentos_temporales' => 'array',
        'expires_at' => 'datetime',
    ];
}
