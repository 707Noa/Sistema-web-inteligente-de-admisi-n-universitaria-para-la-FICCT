<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = DB::table('roles')->where('name', 'administrador')->first();

        if (!$adminRole) {
            return;
        }

        DB::table('users')->updateOrInsert(
            ['email' => 'admin@sistema.com'],
            [
                'role_id'              => $adminRole->id,
                'name'                 => 'Administrador',
                'ci'                   => '00000001',
                'password'             => Hash::make('00000001'),
                'estado'               => 'activo',
                'codigo'               => 'admin',
                'must_change_password' => true,
                'created_at'           => now(),
                'updated_at'           => now(),
            ]
        );
    }
}
