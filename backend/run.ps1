param(
  [string]$JavaHome = "C:\\Program Files\\Java\\jdk-21",
  [int]$Port = 8080,
  [string]$MailFrom = "",
  [string]$MailUser = "",
  [string]$MailPass = "",
  [string]$SmtpHost = "smtp.gmail.com",
  [int]$SmtpPort = 587,
  [switch]$MailDebug,
  [switch]$NoStartTls
)

# Move to backend folder if launched from elsewhere
Set-Location -Path $PSScriptRoot

# JAVA_HOME for this session
if (-not (Test-Path $JavaHome)) {
  Write-Host "JAVA_HOME path not found: $JavaHome" -ForegroundColor Yellow
} else {
  $env:JAVA_HOME = $JavaHome
  $env:PATH = "$($env:JAVA_HOME)\bin;$($env:PATH)"
}

# Basic validation for mail when provided
$mailEnabled = $false
if ($MailFrom -and $MailUser -and $MailPass) {
  $mailEnabled = $true
}

Write-Host "Launching Praxia API..." -ForegroundColor Cyan
Write-Host "  Port: $Port" -ForegroundColor DarkCyan
if ($mailEnabled) {
  # Use ${} to avoid parser confusion with ':' next to variable names
  Write-Host ("  SMTP: {0}:{1} (STARTTLS={2})" -f ${SmtpHost}, ${SmtpPort}, ([bool](-not $NoStartTls))) -ForegroundColor DarkCyan
  Write-Host "  From/User: $MailFrom / $MailUser" -ForegroundColor DarkCyan
} else {
  Write-Host "  SMTP: disabled (set -MailFrom -MailUser -MailPass to enable)" -ForegroundColor Yellow
}

# Build JVM args
$jvm = @()
$jvm += "-Dserver.port=$Port"
if ($mailEnabled) {
  $jvm += "-Dapp.mail.enabled=true"
  $jvm += "-Dapp.mail.from=$MailFrom"
  $jvm += "-Dspring.mail.host=$SmtpHost"
  $jvm += "-Dspring.mail.port=$SmtpPort"
  $jvm += "-Dspring.mail.username=$MailUser"
  $jvm += "-Dspring.mail.password=$MailPass"
  $jvm += "-Dspring.mail.properties.mail.smtp.auth=true"
  $startTlsStr = if ($NoStartTls) { 'false' } else { 'true' }
  $jvm += "-Dspring.mail.properties.mail.smtp.starttls.enable=$startTlsStr"
  if ($MailDebug) { $jvm += "-Dspring.mail.properties.mail.debug=true" }
}

$jvmArgs = ($jvm -join ' ')

# Run Spring Boot via Maven Wrapper with JVM arguments
Write-Host "Starting with JVM args:" -NoNewline
Write-Host " `n  $jvmArgs" -ForegroundColor Gray

# Properly escape a double-quoted value for external process
$mvnProp = "-Dspring-boot.run.jvmArguments=`"$jvmArgs`""
& .\mvnw.cmd spring-boot:run $mvnProp

exit $LASTEXITCODE
