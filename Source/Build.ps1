$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Compress-Archive -Path (Join-Path $PSScriptRoot 'Web/*') -DestinationPath (Join-Path $PSScriptRoot 'Desktop/web.zip') -Force
dotnet publish (Join-Path $PSScriptRoot 'Desktop/Zpevnik.csproj') -c Release -o $projectRoot --nologo
if ($LASTEXITCODE -ne 0) { throw 'Sestavení se nezdařilo.' }
