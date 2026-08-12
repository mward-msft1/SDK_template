use crate::config::AppConfig;
use serde_json::Value;

#[derive(Clone, Debug)]
pub struct EntraSidecarClient {
    config: AppConfig,
}

impl EntraSidecarClient {
    pub fn new(config: AppConfig) -> Self {
        Self { config }
    }

    pub fn get_authorization_header(
        &self,
        incoming_authorization_header: &str,
    ) -> Result<String, String> {
        let mode = self.config.entra_sidecar_auth_mode.to_ascii_lowercase();
        if mode != "autonomous" && mode != "obo" {
            return Err("ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo.".to_string());
        }

        let endpoint = if mode == "autonomous" {
            "AuthorizationHeaderUnauthenticated"
        } else {
            "AuthorizationHeader"
        };
        let url = format!(
            "{}/{}/{}?AgentIdentity={}&optionsOverride.RequestAppToken={}",
            self.config.entra_sidecar_url.trim_end_matches('/'),
            endpoint,
            self.config.entra_sidecar_service_name,
            self.config.entra_agent_client_id,
            if mode == "autonomous" {
                "true"
            } else {
                "false"
            }
        );
        let mut request = minreq::get(url).with_timeout(30);

        if mode == "obo" {
            if incoming_authorization_header.trim().is_empty() {
                return Err(
                    "The current request authorization header is required in obo mode."
                        .to_string(),
                );
            }
            request = request.with_header(
                "Authorization",
                normalize_authorization_header(incoming_authorization_header)?,
            );
        }

        let response = request
            .send()
            .map_err(|error| format!("Entra sidecar token request failed: {error}"))?;
        let status = response.status_code;
        let body = response
            .as_str()
            .map_err(|error| format!("Unable to read Entra sidecar response: {error}"))?;
        if !(200..300).contains(&status) {
            let detail = if body.trim().is_empty() {
                String::new()
            } else {
                format!(" - {}", body.trim())
            };
            return Err(format!(
                "Entra sidecar token request failed: {}{}",
                status, detail
            ));
        }

        let payload: Value = serde_json::from_str(&body)
            .map_err(|error| format!("Invalid Entra sidecar response: {error}"))?;
        let header = payload["authorizationHeader"].as_str().ok_or_else(|| {
            "The Entra sidecar response did not include authorizationHeader.".to_string()
        })?;
        normalize_authorization_header(header)
    }
}

pub fn normalize_authorization_header(value: &str) -> Result<String, String> {
    let header = value.trim();
    if header.is_empty() {
        return Err("The authorization header is empty.".to_string());
    }
    if header.starts_with("Bearer ") || header.starts_with("PoP ") {
        Ok(header.to_string())
    } else {
        Ok(format!("Bearer {header}"))
    }
}
