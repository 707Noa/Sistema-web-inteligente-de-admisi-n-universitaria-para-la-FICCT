<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Auditoria extends Model
{
    protected $fillable = [
        'user_id', 'accion', 'modulo', 'fecha', 'hora', 'ip', 'detalles',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'hora' => 'datetime:H:i:s',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
