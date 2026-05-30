<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cuenta de acceso - Portal de Cursos Preuniversitarios</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            border: 1px solid #e1e8ed;
        }
        .header {
            background-color: #1a3a6b;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .greeting {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #1a3a6b;
        }
        .credentials-box {
            background-color: #f8fafc;
            border-left: 4px solid #1a3a6b;
            padding: 20px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .credential-item {
            margin: 10px 0;
            font-size: 16px;
        }
        .credential-label {
            font-weight: bold;
            color: #475569;
        }
        .credential-value {
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
            font-size: 18px;
            color: #0f172a;
        }
        .btn-login {
            display: inline-block;
            background-color: #1a3a6b;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .warning-text {
            color: #64748b;
            font-size: 14px;
            margin-top: 25px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
        }
        .footer {
            background-color: #f8fafc;
            color: #64748b;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CUP-FICCT</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Portal de Cursos Preuniversitarios</p>
        </div>
        <div class="content">
            <div class="greeting">Hola, {{ $nombreCompleto }}</div>
            <p>Se ha creado tu cuenta de acceso al Portal de Cursos Preuniversitarios CUP-FICCT.</p>
            
            <div class="credentials-box">
                <div class="credential-item">
                    <span class="credential-label">Perfil asignado:</span> 
                    <span style="font-weight: bold; color: #1a3a6b;">{{ $perfil }}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Usuario / Registro:</span> 
                    <span class="credential-value">{{ $codigoUsuario }}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Contraseña inicial:</span> 
                    <span class="credential-value">{{ $ci }}</span>
                </div>
            </div>

            <p>Por seguridad, deberás cambiar tu contraseña al ingresar por primera vez.</p>
            
            <div style="text-align: center;">
                <a href="{{ $urlLogin }}" class="btn-login" target="_blank">Ingresar al Sistema</a>
            </div>

            <p class="warning-text">⚠️ Si no puedes hacer clic en el botón superior, copia y pega la siguiente URL en tu navegador:<br>
            <a href="{{ $urlLogin }}">{{ $urlLogin }}</a></p>
        </div>
        <div class="footer">
            <p>Atentamente,<br><strong>Administración CUP-FICCT</strong></p>
            <p style="margin-top: 15px; font-size: 11px;">Este es un correo automático, por favor no responda a este mensaje.</p>
        </div>
    </div>
</body>
</html>
