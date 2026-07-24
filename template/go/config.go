package main

import (
	"fmt"
	"os"
	"strings"
)

type AppConfig struct {
	TenantID                     string
	EntraClientID                string
	EntraClientSecret            string
	DefaultUserID                string
	AgentName                    string
	HostSDK                      string
	M365AgentsBotAppID           string
	M365AgentsBotAppPassword     string
	M365AgentsTenantID           string
	Agent365AppID                string
	Agent365AppSecret            string
	Agent365TenantID             string
	Agent365ReportingEndpoint    string
	PurviewGraphBaseURL          string
	PurviewAppLocationID         string
	PurviewActivityTypes         string
	PurviewEnableAuditWhenNoScope bool
	PurviewBlockOnError          bool
	GraphAccessTokenPlaceholder  string
}

func required(name string) (string, error) {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return "", fmt.Errorf("missing required environment variable: %s", name)
	}
	return v, nil
}

func optional(name, fallback string) string {
	v := strings.TrimSpace(os.Getenv(name))
	if v == "" {
		return fallback
	}
	return v
}

func asBool(name, fallback string) bool {
	return strings.EqualFold(optional(name, fallback), "true")
}

func loadConfig() (AppConfig, error) {
	tenantID, err := required("TENANT_ID")
	if err != nil {
		return AppConfig{}, err
	}
	entraClientID, err := required("ENTRA_CLIENT_ID")
	if err != nil {
		return AppConfig{}, err
	}
	entraClientSecret, err := required("ENTRA_CLIENT_SECRET")
	if err != nil {
		return AppConfig{}, err
	}
	m365BotAppID, err := required("M365_AGENTS_BOT_APP_ID")
	if err != nil {
		return AppConfig{}, err
	}
	m365BotAppPassword, err := required("M365_AGENTS_BOT_APP_PASSWORD")
	if err != nil {
		return AppConfig{}, err
	}
	m365TenantID, err := required("M365_AGENTS_TENANT_ID")
	if err != nil {
		return AppConfig{}, err
	}
	agent365AppID, err := required("AGENT365_APP_ID")
	if err != nil {
		return AppConfig{}, err
	}
	agent365AppSecret, err := required("AGENT365_APP_SECRET")
	if err != nil {
		return AppConfig{}, err
	}
	agent365TenantID, err := required("AGENT365_TENANT_ID")
	if err != nil {
		return AppConfig{}, err
	}
	agent365Endpoint, err := required("AGENT365_REPORTING_ENDPOINT")
	if err != nil {
		return AppConfig{}, err
	}
	purviewLocationID, err := required("PURVIEW_APP_LOCATION_ID")
	if err != nil {
		return AppConfig{}, err
	}

	return AppConfig{
		TenantID:                     tenantID,
		EntraClientID:                entraClientID,
		EntraClientSecret:            entraClientSecret,
		DefaultUserID:                optional("DEFAULT_USER_ID", ""),
		AgentName:                    optional("AGENT_NAME", "ContosoAgnosticAgent"),
		HostSDK:                      optional("HOST_SDK", "agent-framework"),
		M365AgentsBotAppID:           m365BotAppID,
		M365AgentsBotAppPassword:     m365BotAppPassword,
		M365AgentsTenantID:           m365TenantID,
		Agent365AppID:                agent365AppID,
		Agent365AppSecret:            agent365AppSecret,
		Agent365TenantID:             agent365TenantID,
		Agent365ReportingEndpoint:    agent365Endpoint,
		PurviewGraphBaseURL:          optional("PURVIEW_GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0"),
		PurviewAppLocationID:         purviewLocationID,
		PurviewActivityTypes:         optional("PURVIEW_ACTIVITY_TYPES", "uploadText,downloadText"),
		PurviewEnableAuditWhenNoScope: asBool("PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE", "true"),
		PurviewBlockOnError:          asBool("PURVIEW_BLOCK_ON_ERROR", "true"),
		GraphAccessTokenPlaceholder:  optional("GRAPH_ACCESS_TOKEN_PLACEHOLDER", ""),
	}, nil
}
