<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>{{ $titulo }}</title>
<style>
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10px; color: #1f2937; margin: 0; padding: 20px; }
  .header { border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 16px; color: #1e40af; margin: 0 0 4px 0; }
  .header .meta { font-size: 9px; color: #6b7280; }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead tr { background: #1e40af; color: #fff; }
  thead th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: bold; letter-spacing: 0.03em; }
  tbody tr:nth-child(even) { background: #f0f4ff; }
  tbody tr:nth-child(odd)  { background: #fff; }
  tbody td { padding: 6px 8px; font-size: 9px; border-bottom: 1px solid #e5e7eb; }
  .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8px; color: #9ca3af; display: flex; justify-content: space-between; }
  .total { margin-top: 10px; font-size: 9px; color: #374151; }
  .total strong { color: #1e40af; }
  .empty { text-align: center; padding: 30px; color: #9ca3af; font-style: italic; }
  .filtros { margin-bottom: 10px; font-size: 9px; color: #4b5563; }
</style>
</head>
<body>

<div class="header">
  <h1>{{ $titulo }}</h1>
  <div class="meta">
    Generado el {{ $generado_en }} &nbsp;|&nbsp;
    Sistema CUP-FICCT &nbsp;|&nbsp;
    Autoridad Académica
  </div>
</div>

@if(!empty($descripcion))
<p style="font-size:9px; color:#374151; margin:0 0 6px 0;">{{ $descripcion }}</p>
@endif

@if(!empty($filtrosAplicados))
<div class="filtros">
  Filtros aplicados:
  @foreach($filtrosAplicados as $key => $val)
    <span class="badge">{{ ucfirst($key) }}: {{ $val }}</span>
  @endforeach
</div>
@endif

@if(count($filas) > 0)
<table>
  <thead>
    <tr>
      @foreach($columnas as $col)
        <th>{{ $col }}</th>
      @endforeach
    </tr>
  </thead>
  <tbody>
    @foreach($filas as $fila)
    <tr>
      @foreach($fila as $celda)
        <td>{{ $celda ?? '-' }}</td>
      @endforeach
    </tr>
    @endforeach
  </tbody>
</table>
<div class="total">Total de registros: <strong>{{ count($filas) }}</strong></div>
@else
<div class="empty">No existen datos para los filtros seleccionados.</div>
@endif

<div class="footer">
  <span>CUP-FICCT — Sistema Web de Admisión Universitaria</span>
  <span>Página 1</span>
</div>

</body>
</html>
