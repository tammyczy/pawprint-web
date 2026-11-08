$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$versionRoot = Join-Path $PSScriptRoot 'versions'
New-Item -ItemType Directory -Path $versionRoot -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$baseline = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot 'baseline-source.zip'))
function Restore-BaselineFile([string]$RelativePath, [string]$TargetRoot) {
    $entry = $baseline.Entries | Where-Object { $_.FullName.Replace('\','/') -eq $RelativePath } | Select-Object -First 1
    if (-not $entry) { throw "Missing baseline entry: $RelativePath" }
    $target = Join-Path $TargetRoot $RelativePath
    $stream = $entry.Open()
    $fileStream = [System.IO.File]::Create($target)
    try { $stream.CopyTo($fileStream) } finally { $fileStream.Dispose(); $stream.Dispose() }
}
try {
 foreach ($stage in @('v1','v2','v3')) {
    $stageRoot = Join-Path $versionRoot "$stage-source"
    if (Test-Path -LiteralPath $stageRoot) { throw "Snapshot already exists: $stageRoot. Preserve it; use a new snapshot name." }
    New-Item -ItemType Directory -Path $stageRoot | Out-Null
    foreach ($folder in @('src','server','worker')) { Copy-Item -LiteralPath (Join-Path $projectRoot $folder) -Destination $stageRoot -Recurse }
    $rootFiles = Get-ChildItem -LiteralPath $projectRoot -File | Where-Object { $_.Extension -in @('.html','.js','.mjs','.md') -or $_.Name -in @('package.json','package-lock.json','.env.example','.gitignore') }
    foreach ($sourceFile in $rootFiles) { Copy-Item -LiteralPath $sourceFile.FullName -Destination $stageRoot }
    if ($stage -ne 'v3') {
       foreach ($relative in @('judge.html','src/judge.js','src/judge.css')) { Remove-Item -LiteralPath (Join-Path $stageRoot $relative) }
       $configPath = Join-Path $stageRoot 'vite.config.js'
       $config = [System.IO.File]::ReadAllText($configPath).Replace(",judge:'judge.html'",'')
       [System.IO.File]::WriteAllText($configPath,$config)
       Restore-BaselineFile 'README.md' $stageRoot
       Restore-BaselineFile '部署与配置说明.md' $stageRoot
       $indexPath = Join-Path $stageRoot 'index.html'
       $indexContent = [System.IO.File]::ReadAllText($indexPath).Replace('<a href="/judge.html">Project evidence <i data-lucide="arrow-up-right"></i></a>','')
       [System.IO.File]::WriteAllText($indexPath,$indexContent)
    }
    if ($stage -eq 'v1') {
       Restore-BaselineFile 'src/commands.js' $stageRoot
       Remove-Item -LiteralPath (Join-Path $stageRoot 'command-safety.test.js')
       $packagePath = Join-Path $stageRoot 'package.json'
       $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
       $package.scripts.build = 'vite build'
       $package.scripts.PSObject.Properties.Remove('evaluate')
       $package | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $packagePath -Encoding utf8
    } else {
       Copy-Item -LiteralPath (Join-Path $projectRoot 'eval') -Destination $stageRoot -Recurse
       New-Item -ItemType Directory -Path (Join-Path $stageRoot 'public') | Out-Null
       Copy-Item -LiteralPath (Join-Path $projectRoot 'public/evidence') -Destination (Join-Path $stageRoot 'public') -Recurse
    }
    if ($stage -eq 'v3') {
       $stageReview = Join-Path $stageRoot 'review'
       New-Item -ItemType Directory -Path $stageReview | Out-Null
       foreach ($doc in @('WAICY-2026-REVIEW.md','SUBMISSION-KIT.md','VALIDATION.md')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $doc) -Destination $stageReview }
    }
    $manifest = [ordered]@{stage=$stage; createdAt=[DateTime]::UtcNow.ToString('o'); kind='cumulative sanitized source snapshot'; note='All stages share the original public models, images and sounds. No secrets, private data, node_modules or dist. Reconstructed from the reviewed final source; not historical releases or independent authorship evidence.'; files=@()}
    $manifest.files = @(Get-ChildItem -LiteralPath $stageRoot -File -Recurse | Sort-Object FullName | ForEach-Object { [ordered]@{path=[System.IO.Path]::GetRelativePath($stageRoot,$_.FullName).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} })
    $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $stageRoot 'version.json') -Encoding utf8
    Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath (Join-Path $versionRoot "$stage-source.zip") -CompressionLevel Optimal
    # The generated staging tree contains *.test.js. Remove only this exact,
    # verified child after archiving, so node --test cannot discover duplicate suites.
    $resolvedStage = (Resolve-Path -LiteralPath $stageRoot).Path
    $expectedStage = Join-Path ([System.IO.Path]::GetFullPath($versionRoot)) "$stage-source"
    if ($resolvedStage -ne $expectedStage -or -not $resolvedStage.StartsWith(([System.IO.Path]::GetFullPath($versionRoot) + [System.IO.Path]::DirectorySeparatorChar))) { throw 'Refusing to remove an unverified snapshot staging path.' }
    $savedArchive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $versionRoot "$stage-source.zip"))
    try { if (-not ($savedArchive.Entries | Where-Object { $_.FullName -eq 'version.json' })) { throw 'Snapshot archive verification failed.' } } finally { $savedArchive.Dispose() }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    Write-Output "$stage snapshot: $($manifest.files.Count) files"
 }
} finally { $baseline.Dispose() }
