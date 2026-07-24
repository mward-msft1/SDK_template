package main

import (
	"fmt"
	"strings"
)

type PurviewAdapter struct {
	config AppConfig
}

func newPurviewAdapter(config AppConfig) PurviewAdapter {
	return PurviewAdapter{config: config}
}

func (p PurviewAdapter) computeProtectionScopes(userID string) (string, error) {
	if err := p.ensureGraphToken(); err != nil {
		return "", err
	}
	// TODO: Replace with real Graph call:
	// POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
	return fmt.Sprintf("scopes: evaluate %s for user %s", p.config.PurviewActivityTypes, userID), nil
}

func (p PurviewAdapter) evaluateContent(userID, activity, content, contextID string) (string, error) {
	if err := p.ensureGraphToken(); err != nil {
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

func (p PurviewAdapter) ensureGraphToken() error {
	if strings.TrimSpace(p.config.GraphAccessTokenPlaceholder) == "" {
		return fmt.Errorf("missing GRAPH_ACCESS_TOKEN_PLACEHOLDER. Replace token acquisition TODO in PurviewAdapter")
	}
	return nil
}
