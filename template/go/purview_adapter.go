package main

import (
	"fmt"
	"strings"
)

type PurviewAdapter struct {
	config       AppConfig
	entraSidecar EntraSidecarClient
}

func newPurviewAdapter(config AppConfig) PurviewAdapter {
	return PurviewAdapter{
		config:       config,
		entraSidecar: newEntraSidecarClient(config),
	}
}

func (p PurviewAdapter) computeProtectionScopes(userID, incomingAuthorizationHeader string) (string, error) {
	if _, err := p.graphAuthorizationHeader(incomingAuthorizationHeader); err != nil {
		return "", err
	}
	// TODO: Replace with real Graph call:
	// POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
	return fmt.Sprintf("scopes: evaluate %s for user %s", p.config.PurviewActivityTypes, userID), nil
}

func (p PurviewAdapter) evaluateContent(userID, activity, content, contextID, incomingAuthorizationHeader string) (string, error) {
	if _, err := p.graphAuthorizationHeader(incomingAuthorizationHeader); err != nil {
		return "", err
	}
	// TODO: Replace with real Graph call:
	// POST /users/{id}/dataSecurityAndGovernance/activities/contentActivities
	return fmt.Sprintf("activity=%s; userId=%s; contextId=%s; content=%s", activity, userID, contextID, content), nil
}

func (p PurviewAdapter) getEnforcementDecision(resultPayload string) Decision {
	return Decision{
		Block: strings.Contains(strings.ToLower(resultPayload), "block"),
		Raw:   resultPayload,
	}
}

func (p PurviewAdapter) graphAuthorizationHeader(incomingAuthorizationHeader string) (string, error) {
	if p.config.EntraSidecarEnabled {
		return p.entraSidecar.getAuthorizationHeader(incomingAuthorizationHeader)
	}
	token := normalizeAuthorizationHeader(p.config.GraphAccessTokenPlaceholder)
	if token == "" {
		return "", fmt.Errorf("enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER")
	}
	return token, nil
}
