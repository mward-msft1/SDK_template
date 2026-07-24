<#
  Template for configuring Purview DLP against Entra app registrations used by your custom agent app.
  Based on Microsoft Purview custom AI app guidance.
#>

$DlpPolicyName  = "REPLACE - Custom AI Apps DLP Policy"
$DlpRuleName    = "REPLACE - Block sensitive upload/download text"
$PolicyMode     = "Enable" # Enable | TestWithNotifications | TestWithoutNotifications | Disable
$RestrictAction = "Block"  # Block | Audit

# Add one or more Entra App Registration IDs used by your agent runtime(s)
$Applications = @(
  "00000000-0000-0000-0000-000000000000"
)

$AlertRecipients    = @("SiteAdmin")
$IncidentRecipients = @("security-team@contoso.com")
$NotifyRecipients   = @("All")
$ReportSeverityLevel = "High"

# Example sensitive information types (adjust for your tenant policy)
$SensitiveTypes = @(
  "Credit Card Number",
  "U.S. Social Security Number (SSN)"
)

# TODO: Connect to Security & Compliance PowerShell session before invoking policy/rule cmdlets.
# Connect-IPPSSession

$LocationsJson = @{
  EnforcementMode = "Application"
  Application = $Applications
} | ConvertTo-Json -Depth 5 -Compress

# TODO: Create or update policy/rule using New-DlpCompliancePolicy / Set-DlpCompliancePolicy
# and New-DlpComplianceRule / Set-DlpComplianceRule in your tenant.
# Keep $Applications aligned with PURVIEW_APP_LOCATION_ID in your runtime environment.

Write-Host "Template prepared. Replace TODO blocks with your tenant-specific cmdlet flow."
