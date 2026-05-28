<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Carrera extends Model
{
    protected $fillable = ['nombre', 'codigo', 'plan', 'modalidad', 'area', 'descripcion', 'estado'];

    public function preinscripciones(): HasMany
    {
        return $this->hasMany(PreinscripcionCarrera::class, 'carrera_id');
    }
}
