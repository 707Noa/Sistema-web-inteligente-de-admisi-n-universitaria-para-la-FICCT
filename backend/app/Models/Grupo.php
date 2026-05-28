<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Grupo extends Model
{
    protected $fillable = [
        'nombre_grupo', 'capacidad_maxima', 'docente_id',
        'materia_id', 'aula', 'horario', 'estado',
    ];

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Docente::class, 'docente_id');
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function postulantes(): BelongsToMany
    {
        return $this->belongsToMany(Postulante::class, 'grupo_postulante')
                    ->withTimestamps();
    }

    public function ocupacion(): int
    {
        return $this->postulantes()->count();
    }

    public function estaLleno(): bool
    {
        return $this->ocupacion() >= $this->capacidad_maxima;
    }
}
