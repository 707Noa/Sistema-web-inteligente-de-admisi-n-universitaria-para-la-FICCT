<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'ci', 'password', 'role_id', 'estado',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function postulante(): HasOne
    {
        return $this->hasOne(Postulante::class, 'user_id');
    }

    public function docente(): HasOne
    {
        return $this->hasOne(Docente::class, 'user_id');
    }

    public function auditorias(): HasMany
    {
        return $this->hasMany(Auditoria::class, 'user_id');
    }

    public function hasRole(string $roleName): bool
    {
        return $this->role && $this->role->name === $roleName;
    }

    public function isActive(): bool
    {
        return $this->estado === 'activo';
    }
}
