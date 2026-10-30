# 문장인지 Closed 연습용 임시 TTS (Microsoft Heami, ko-KR).
# 문장은 sent-closed-tts.json (UTF-8). 사람 녹음 대체가 아님.
Add-Type -AssemblyName System.Speech

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "assets\9_sent"
$jsonPath = Join-Path $PSScriptRoot "sent-closed-tts.json"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$items = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json

foreach ($item in $items) {
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $synth.SelectVoice("Microsoft Heami Desktop")
    $synth.Rate = -2
    $path = Join-Path $outDir $item.file
    $synth.SetOutputToWaveFile($path)
    $synth.Speak($item.text)
  }
  finally {
    $synth.Dispose()
  }
  Write-Host "wrote $($item.file)"
}
