param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Password characters exist only in this process's memory. Never convert them to a String.
function Get-SecretBytes([Security.SecureString]$Secret) {
    $pointer = [IntPtr]::Zero
    $characters = New-Object char[] $Secret.Length
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
        for ($i = 0; $i -lt $characters.Length; $i++) {
            $characters[$i] = [char][Runtime.InteropServices.Marshal]::ReadInt16($pointer, $i * 2)
        }
        return ,([Text.Encoding]::UTF8.GetBytes($characters))
    } finally {
        [Array]::Clear($characters, 0, $characters.Length)
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
}
function Test-Confirmation([byte[]]$First, [byte[]]$Second) {
    if ($First.Length -ne $Second.Length) { return $false }
    $difference = 0
    for ($i = 0; $i -lt $First.Length; $i++) { $difference = $difference -bor ($First[$i] -bxor $Second[$i]) }
    return $difference -eq 0
}
function Get-DerivedBytes([byte[]]$Bytes, [byte[]]$Salt) {
    $derivation = [Security.Cryptography.Rfc2898DeriveBytes]::new($Bytes, $Salt, 600000, [Security.Cryptography.HashAlgorithmName]::SHA256)
    try { return ,($derivation.GetBytes(32)) } finally { $derivation.Dispose() }
}

if ($SelfTest) {
    # Disposable test vectors; this branch never writes a configuration.
    $a = [byte[]](1, 2, 3)
    $b = [byte[]](1, 2, 4)
    if ((Test-Confirmation $a $b) -or !(Test-Confirmation $a $a)) { throw 'Confirmation self-test failed.' }
    $salt = New-Object byte[] 16
    $derived = Get-DerivedBytes $a $salt
    $expected = 'ea2f219741f729307ae7473a2d91893208d64f8e3c33c9cd5eb0a70306eb249b'
    $actual = -join ($derived | ForEach-Object { $_.ToString('x2') })
    if ($actual -ne $expected) { throw 'PBKDF2 self-test failed.' }
    Write-Host 'Self-tests passed.'
    exit 0
}

$first = $null; $second = $null; $firstBytes = $null; $secondBytes = $null; $derived = $null
$success = $false
try {
    $first = Read-Host 'Defina a senha do Relalia' -AsSecureString
    $second = Read-Host 'Confirme a senha' -AsSecureString
    $firstBytes = Get-SecretBytes $first
    $secondBytes = Get-SecretBytes $second
    if ($firstBytes.Length -eq 0) { throw 'empty' }
    if (!(Test-Confirmation $firstBytes $secondBytes)) { throw 'mismatch' }
    $salt = New-Object byte[] 16
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($salt) } finally { $random.Dispose() }
    $derived = Get-DerivedBytes $firstBytes $salt
    $configuration = [ordered]@{
        algorithm = 'PBKDF2'; hash = 'SHA-256'; iterations = 600000; length = 256
        salt = [Convert]::ToBase64String($salt)
        verifier = [Convert]::ToBase64String($derived)
        version = [Guid]::NewGuid().ToString()
    }
    $destination = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\access-config.json'
    # Atomic replacement: the temporary file contains only the public derived configuration.
    $temporary = $destination + '.' + [Guid]::NewGuid().ToString() + '.tmp'
    try {
        [IO.File]::WriteAllText($temporary, ($configuration | ConvertTo-Json) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
        if ([IO.File]::Exists($destination)) { [IO.File]::Replace($temporary, $destination, $null) }
        else { [IO.File]::Move($temporary, $destination) }
    } finally {
        if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) }
    }
    $success = $true
    Write-Host 'Sucesso: configuracao derivada gravada. A senha nao foi gravada.'
} catch {
    # Do not print exception objects: they could contain input or implementation details.
    if ($_.Exception.Message -eq 'mismatch') { Write-Host 'Erro: confirmacao divergente. Configuracao anterior preservada.' }
    elseif ($_.Exception.Message -eq 'empty') { Write-Host 'Erro: senha vazia. Configuracao anterior preservada.' }
    else { Write-Host 'Erro: nao foi possivel gravar a configuracao. Configuracao anterior preservada.' }
} finally {
    foreach ($buffer in @($firstBytes, $secondBytes, $derived)) {
        if ($null -ne $buffer) { [Array]::Clear($buffer, 0, $buffer.Length) }
    }
    if ($null -ne $first) { $first.Dispose() }
    if ($null -ne $second) { $second.Dispose() }
}
Write-Host 'Pressione uma tecla para fechar.'
[void][Console]::ReadKey($true)
if (!$success) { exit 1 }
