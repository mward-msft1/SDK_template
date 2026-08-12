package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type EntraSidecarClient struct {
	config AppConfig
	client *http.Client
}

func newEntraSidecarClient(config AppConfig) EntraSidecarClient {
	return EntraSidecarClient{
		config: config,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c EntraSidecarClient) getAuthorizationHeader(incomingAuthorizationHeader string) (string, error) {
	mode := strings.ToLower(c.config.EntraSidecarAuthMode)
	if mode != "autonomous" && mode != "obo" {
		return "", fmt.Errorf("ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo")
	}

	endpoint := "AuthorizationHeaderUnauthenticated"
	if mode == "obo" {
		endpoint = "AuthorizationHeader"
	}
	requestURL := fmt.Sprintf(
		"%s/%s/%s?AgentIdentity=%s&optionsOverride.RequestAppToken=%t",
		strings.TrimRight(c.config.EntraSidecarURL, "/"),
		endpoint,
		url.PathEscape(c.config.EntraSidecarServiceName),
		url.QueryEscape(c.config.EntraAgentClientID),
		mode == "autonomous",
	)
	request, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return "", err
	}
	if mode == "obo" {
		if strings.TrimSpace(incomingAuthorizationHeader) == "" {
			return "", fmt.Errorf("the current request authorization header is required in obo mode")
		}
		request.Header.Set(
			"Authorization",
			normalizeAuthorizationHeader(incomingAuthorizationHeader),
		)
	}

	response, err := c.client.Do(request)
	if err != nil {
		return "", fmt.Errorf("Entra sidecar token request failed: %w", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf(
			"Entra sidecar token request failed: %d%s",
			response.StatusCode,
			formatResponseDetail(body),
		)
	}

	var payload struct {
		AuthorizationHeader string `json:"authorizationHeader"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", fmt.Errorf("invalid Entra sidecar response: %w", err)
	}
	header := normalizeAuthorizationHeader(payload.AuthorizationHeader)
	if header == "" {
		return "", fmt.Errorf("the Entra sidecar returned an empty authorizationHeader")
	}
	return header, nil
}

func normalizeAuthorizationHeader(value string) string {
	header := strings.TrimSpace(value)
	if header == "" || strings.HasPrefix(header, "Bearer ") || strings.HasPrefix(header, "PoP ") {
		return header
	}
	return "Bearer " + header
}

func formatResponseDetail(body []byte) string {
	detail := strings.TrimSpace(string(body))
	if detail == "" {
		return ""
	}
	return " - " + detail
}
