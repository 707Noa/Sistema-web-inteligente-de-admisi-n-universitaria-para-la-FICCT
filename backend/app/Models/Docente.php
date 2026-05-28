<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Docente extends Model
{
    protected $fillable = [
        'user_id', 'nombres', 'apellidos', 'ci', 'email',
        'celular', 'profesion', 'tiene_maestria', 'tiene_diplomado', 'estado',
    ];

    protected function casts(): array
    {
        return [
            'tiene_maestria' => 'boolean',
            'tiene_diplomado' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class, 'docente_id');
    }
}
