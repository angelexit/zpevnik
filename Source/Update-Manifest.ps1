param(
    [string]$DataDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) 'Data'),
    [string]$LibraryVersion = (Get-Date -Format 'yyyyMMdd-HHmmss')
)
$ErrorActionPreference = 'Stop'
$basePath = (Resolve-Path -LiteralPath $DataDirectory).Path.TrimEnd('\','/')
$files = @(Get-ChildItem -LiteralPath $basePath -File -Recurse | Where-Object {
    $_.Name -ne 'manifest.json' -and $_.Extension.ToLowerInvariant() -in @('.json','.jpg','.jpeg','.png','.webp','.svg')
} | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($basePath.Length + 1).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(); bytes=$_.Length}
})
$manifest = [ordered]@{schemaVersion=1; libraryVersion=$LibraryVersion; database='database.json'; artists='artists.json'; songsDirectory='songs/'; assetDirectories=@('img/covers/','img/interprets/'); files=$files}
$json = $manifest | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $basePath 'manifest.json'), $json, (New-Object Text.UTF8Encoding($false)))
