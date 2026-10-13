$ErrorActionPreference = 'Stop'

function ConvertTo-PlainText {
  param([System.Security.SecureString]$SecureString)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$username = 'UPADieta'
$iterations = 100000
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$wranglerPath = (Resolve-Path (Join-Path $PSScriptRoot '..\node_modules\wrangler\bin\wrangler.js')).Path
$configPath = (Resolve-Path (Join-Path $PSScriptRoot '..\wrangler.jsonc')).Path

if (-not (Test-Path $wranglerPath) -or -not (Test-Path $configPath)) {
  throw 'Execute npm install na pasta Diestas antes de configurar a autenticacao.'
}

$securePassword = Read-Host '01533179945Upa@' -AsSecureString
$password = ConvertTo-PlainText -SecureString $securePassword

if ($password.Trim().Length -lt 14) {
  throw '01533179945Upa@'
}

$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$saltBytes = New-Object byte[] 16
$randomGenerator.GetBytes($saltBytes)
$salt = [Convert]::ToBase64String($saltBytes)

$deriveBytes = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
  $password,
  $saltBytes,
  $iterations,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
$passwordHash = ([BitConverter]::ToString($deriveBytes.GetBytes(32))).Replace('-', '').ToLowerInvariant()

$secrets = [ordered]@{
  DIETA_USERNAME = $username
  DIETA_PASSWORD_SALT = $salt
  DIETA_PASSWORD_HASH = $passwordHash
}

foreach ($secret in $secrets.GetEnumerator()) {
  $secretValue = [string]$secret.Value
  $secretValue | & $nodePath $wranglerPath 'secret' 'put' $secret.Key '--config' $configPath

  if ($LASTEXITCODE -ne 0) {
    throw "Wrangler falhou ao configurar $($secret.Key)."
  }

  Write-Host "Secret $($secret.Key) configurado."
}

Write-Host 'Autenticacao de producao configurada. Nenhum valor foi gravado em arquivo.'

$securePassword.Dispose()
$deriveBytes.Dispose()
$randomGenerator.Dispose()
$password = $null
$passwordHash = $null
$salt = $null