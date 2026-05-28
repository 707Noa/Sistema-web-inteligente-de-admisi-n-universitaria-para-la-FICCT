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

        if ($adminRole) {
            DB::table('users')->updateOrInsert(
                ['email' => 'admin@sistema.com'],
                [
                    'role_id' => $adminRole->id,
                    'name' => 'Administrador',
                    'ci' => '00000001',
                    'password' => Hash::make('Admin123456'),
                    'estado' => 'activo',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
