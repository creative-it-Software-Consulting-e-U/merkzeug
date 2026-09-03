# Merkzeug-Kalender-Helfer (Windows): liest Termine aus dem klassischen
# Outlook über dessen COM-Objektmodell und gibt sie als JSON auf stdout aus.
# Wird vom Electron-Main-Prozess aufgerufen – ohne Cloud-API, es zählt, was
# im lokalen Outlook (Exchange/M365, IMAP, Google, …) eingerichtet ist.
#
# Aufruf:
#   powershell -NoProfile -ExecutionPolicy Bypass -File merkzeug-calendar.ps1 list <von-epoch-sekunden> <bis-epoch-sekunden>
#     → {"events":[…]}  – schnelle Liste (Titel, Zeit, Ort, Organisator,
#       Teilnehmerzahl), ohne Teilnehmerliste und Notizen
#   powershell … -File merkzeug-calendar.ps1 detail <entry-id> <start-iso>
#     → {"events":[…]}  – ein Termin (bei Serien das Vorkommen zu <start-iso>)
#       mit Teilnehmerliste und Notizen
#   Fehler: {"error":"unsupported"|"usage"|"failed","message":"…"}
#
# „unsupported“: kein klassisches Outlook registriert (nur New Outlook / gar
# keines). Das Format der Termine entspricht dem EventKit-Helfer (macOS).
# Die Teilnehmer-Auflösung ist getrennt, weil sie pro Termin ~100 ms kostet
# (Adressbuch), die Liste über Wochen aber hunderte Termine umfasst.
#
# MERKZEUG_CALENDAR_TRACE=<datei>: schreibt Fortschritt mit Zeitstempel (Fehlersuche)

param(
  [Parameter(Position = 0)][string]$Mode,
  [Parameter(Position = 1)][string]$A,
  [Parameter(Position = 2)][string]$B
)

$ErrorActionPreference = 'Stop'

$traceFile = $env:MERKZEUG_CALENDAR_TRACE
$traceStart = [Diagnostics.Stopwatch]::StartNew()
function Trace($msg) {
  if ($traceFile) { Add-Content -Path $traceFile -Value ("{0,8:N0}ms {1}" -f $traceStart.Elapsed.TotalMilliseconds, $msg) }
}

Trace "start $Mode $A $B"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Emit($obj) {
  # -Depth: events → attendees → person
  [Console]::Out.Write((ConvertTo-Json -InputObject $obj -Depth 6 -Compress))
}

function Fail($kind, $message) {
  Emit @{ error = $kind; message = [string]$message }
  exit 0
}

if ($Mode -match '^\d+$') { $B = $A; $A = $Mode; $Mode = 'list' }  # alte Aufrufform: <von> <bis>
if ($Mode -ne 'list' -and $Mode -ne 'detail') { Fail 'usage' 'merkzeug-calendar.ps1 list <from-epoch> <to-epoch> | detail <entry-id> <start-iso>' }
if (-not $A -or -not $B) { Fail 'usage' 'merkzeug-calendar.ps1 list <from-epoch> <to-epoch> | detail <entry-id> <start-iso>' }

# Ohne registriertes Outlook.Application gibt es kein klassisches Outlook.
if (-not (Test-Path 'Registry::HKEY_CLASSES_ROOT\Outlook.Application')) {
  Fail 'unsupported' 'Kein klassisches Outlook installiert.'
}

Trace "connecting outlook"
try {
  $outlook = New-Object -ComObject Outlook.Application
  $session = $outlook.GetNamespace('MAPI')
} catch {
  Fail 'failed' ("Outlook nicht erreichbar: " + $_.Exception.Message)
}

function Iso($dt) {
  # Outlook liefert lokale Zeiten ohne Kind → als lokal ausgeben, mit Offset
  ([DateTime]::SpecifyKind($dt, [DateTimeKind]::Local)).ToString('yyyy-MM-ddTHH:mm:sszzz')
}

# ---- Adressen -------------------------------------------------------------
# SMTP-Adresse eines Teilnehmers/Organisators. Zuerst die lokal gespeicherte
# MAPI-Eigenschaft PR_SMTP_ADDRESS (kein Server-Zugriff), dann als Fallback die
# Exchange-Auflösung – die kostet pro Person eine Server-Anfrage, daher mit
# Cache und Zeitbudget für den ganzen Lauf.
$PR_SMTP_ADDRESS = 'http://schemas.microsoft.com/mapi/proptag/0x39FE001F'
# PidTagSentRepresentingSmtpAddress am Termin selbst: Organisator ohne Adressbuch
$PR_SENT_REPRESENTING_SMTP = 'http://schemas.microsoft.com/mapi/proptag/0x5D02001F'
$smtpCache = @{}
$resolveBudget = [Diagnostics.Stopwatch]::New()
$resolveBudgetMs = 4000

function MapiProp($obj, $prop) {
  try {
    $v = $obj.PropertyAccessor.GetProperty($prop)
    if ($v -and $v -match '@') { return [string]$v }
  } catch { }
  return $null
}

function SmtpOf($addressEntry) {
  if ($null -eq $addressEntry) { return $null }
  try {
    $addr = [string]$addressEntry.Address
    if ($addressEntry.Type -ne 'EX') {
      if ($addr -match '@') { return $addr }
      return $null
    }
    if ($smtpCache.ContainsKey($addr)) { return $smtpCache[$addr] }
    $result = MapiProp $addressEntry $PR_SMTP_ADDRESS
    if (-not $result -and $resolveBudget.ElapsedMilliseconds -lt $resolveBudgetMs) {
      $resolveBudget.Start()
      try {
        $exUser = $addressEntry.GetExchangeUser()
        if ($null -ne $exUser -and $exUser.PrimarySmtpAddress) { $result = [string]$exUser.PrimarySmtpAddress }
        if (-not $result) {
          $exDl = $addressEntry.GetExchangeDistributionList()
          if ($null -ne $exDl -and $exDl.PrimarySmtpAddress) { $result = [string]$exDl.PrimarySmtpAddress }
        }
      } catch { }
      $resolveBudget.Stop()
    }
    $smtpCache[$addr] = $result
    return $result
  } catch { }
  return $null
}

function PersonOf($name, $email, $optional) {
  $p = [ordered]@{}
  if ($name) { $p.name = [string]$name }
  if ($email) { $p.email = [string]$email }
  if ($optional) { $p.optional = $true }
  return $p
}

function OrganizerOf($item, $resolve) {
  $name = $null
  try { $name = [string]$item.Organizer } catch { }
  $email = MapiProp $item $PR_SENT_REPRESENTING_SMTP
  if (-not $email -and $resolve) {
    try { $email = SmtpOf $item.GetOrganizer() } catch { }
  }
  if (-not $name -and -not $email) { return $null }
  return PersonOf $name $email $false
}

function AttendeesOf($item) {
  $attendees = @()
  $seenAttendee = @{}
  try {
    foreach ($rcp in $item.Recipients) {
      if ($rcp.Type -eq 3) { continue }  # olResource (Räume)
      $email = MapiProp $rcp $PR_SMTP_ADDRESS
      if (-not $email) { try { $email = SmtpOf $rcp.AddressEntry } catch { } }
      if (-not $email) { try { if ($rcp.Address -match '@') { $email = [string]$rcp.Address } } catch { } }
      # Outlook führt den Organisator mitunter doppelt in der Teilnehmerliste
      $dupKey = if ($email) { $email.ToLowerInvariant() } else { 'name:' + $rcp.Name }
      if ($seenAttendee.ContainsKey($dupKey)) { continue }
      $seenAttendee[$dupKey] = $true
      $attendees += PersonOf $rcp.Name $email ($rcp.Type -eq 2)  # olOptional
    }
  } catch { }
  return $attendees  # Aufrufer verpackt mit @(), damit 0/1 Elemente ein Array bleiben
}

# ---- Termin → Ausgabeobjekt ----------------------------------------------
function EventOf($item, $folderName, $withDetails) {
  $start = [DateTime]$item.Start
  $end = [DateTime]$item.End
  $ev = [ordered]@{
    id = [string]$item.EntryID
    title = [string]$item.Subject
    start = Iso $start
    end = Iso $end
    allDay = [bool]$item.AllDayEvent
    attendees = @()
  }
  try { if ($item.Location) { $ev.location = [string]$item.Location } } catch { }
  if ($folderName) { $ev.calendar = [string]$folderName }
  $organizer = OrganizerOf $item $withDetails
  if ($organizer) { $ev.organizer = $organizer }
  if ($withDetails) {
    $ev.attendees = @(AttendeesOf $item)
    $ev.attendeeCount = $ev.attendees.Count
    try {
      $body = [string]$item.Body
      if ($body) { $ev.notes = $body.Substring(0, [Math]::Min(4000, $body.Length)) }
    } catch { }
  } else {
    try { $ev.attendeeCount = [int]$item.Recipients.Count } catch { $ev.attendeeCount = 0 }
  }
  return $ev
}

# ---- Modus „detail“ --------------------------------------------------------
if ($Mode -eq 'detail') {
  try {
    $item = $session.GetItemFromID($A)
    $wanted = [DateTime]::Parse($B)
    # Serientermin: das Vorkommen zum gewünschten Beginn holen (Ausnahmen inklusive)
    try {
      if ($item.IsRecurring -and ([DateTime]$item.Start) -ne $wanted) {
        $item = $item.GetRecurrencePattern().GetOccurrence($wanted)
      }
    } catch { }
    $folderName = $null
    try { $folderName = $item.Parent.Name } catch { }
    Trace "detail item"
    $ev = EventOf $item $folderName $true
    Trace "detail done"
    Emit @{ events = @($ev) }
  } catch {
    Fail 'failed' ("Termin nicht gefunden: " + $_.Exception.Message)
  }
  exit 0
}

# ---- Modus „list“ ----------------------------------------------------------
$epoch = [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)
$from = $epoch.AddSeconds([double]$A).ToLocalTime()
$to = $epoch.AddSeconds([double]$B).ToLocalTime()

# Alle Kalender-Ordner: Standardkalender jedes Kontos plus dessen Unterkalender
# (weitere eigene Kalender, Geburtstage, Feiertage, …) – ganztägige Einträge
# blendet der Dialog standardmäßig aus.
function CalendarFolders() {
  $folders = @()
  foreach ($store in $session.Stores) {
    try {
      $root = $store.GetDefaultFolder(9)  # olFolderCalendar
      if ($null -eq $root) { continue }
      $folders += $root
      foreach ($sub in $root.Folders) {
        if ($sub.DefaultItemType -eq 1) { $folders += $sub }  # olAppointmentItem
      }
    } catch { }
  }
  return $folders
}

$events = New-Object System.Collections.ArrayList
$seen = @{}
$limit = 1500

# Restrict versteht Datumsangaben im Format der aktuellen Systemsprache ("g").
$filter = "[Start] < '" + $to.ToString('g') + "' AND [End] > '" + $from.ToString('g') + "'"

foreach ($folder in CalendarFolders) {
  Trace ("folder " + $folder.Name)
  try {
    $items = $folder.Items
    $items.Sort('[Start]')
    $items.IncludeRecurrences = $true
    $matches = $items.Restrict($filter)
    $item = $matches.GetFirst()
    while ($null -ne $item -and $events.Count -lt $limit) {
      try {
        $key = [string]$item.EntryID + '@' + ([DateTime]$item.Start).ToString('s')
        if (-not $seen.ContainsKey($key)) {
          $seen[$key] = $true
          [void]$events.Add((EventOf $item $folder.Name $false))
        }
      } catch { }
      $item = $matches.GetNext()
    }
  } catch { }
}

Trace ("collected " + $events.Count)
$sorted = @($events | Sort-Object -Property @{ Expression = { [DateTime]::Parse($_.start) } }, title)
Emit @{ events = $sorted }
Trace "done"
