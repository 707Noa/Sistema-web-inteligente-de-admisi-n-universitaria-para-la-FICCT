<?php

return [
    'name' => env('APP_NAME', 'CUP-FICCT'),
    'env' => env('APP_ENV', 'local'),
    'debug' => (bool) env('APP_DEBUG', true),
    'url' => env('APP_URL', 'http://localhost:8000'),
    'timezone' => 'America/La_Paz',
    'locale' => 'es',
    'fallback_locale' => 'en',
    'faker_locale' => 'es_BO',
    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
    ],
];
