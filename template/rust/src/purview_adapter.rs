use crate::config::AppConfig;
use crate::entra_sidecar_client::{normalize_authorization_header, EntraSidecarClient};
use crate::models::Decision;

#[derive(Clone, Debug)]
pub struct PurviewAdapter {
    config: AppConfig,
    entra_sidecar: EntraSidecarClient,
}

impl PurviewAdapter {
    pub fn new(config: AppConfig) -> Self {
        Self {
            entra_sidecar: EntraSidecarClient::new(config.clone()),
            config,
        }
    }

    pub fn compute_protection_scopes(
        &self,
        user_id: &str,
        incoming_authorization_header: &str,
    ) -> Result<String, String> {
        let _authorization =
            self.graph_authorization_header(incoming_authorization_header)?;
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
        Ok(format!(
            "scopes: evaluate {} for user {}",
            self.config.purview_activity_types, user_id
        ))
    }

    pub fn evaluate_content(
        &self,
        user_id: &str,
        activity: &str,
        content: &str,
        context_id: &str,
        incoming_authorization_header: &str,
    ) -> Result<String, String> {
        let _authorization =
            self.graph_authorization_header(incoming_authorization_header)?;
        // TODO: Replace with real Graph call:
        // POST /users/{id}/dataSecurityAndGovernance/activities/contentActivities
        Ok(format!(
            "activity={activity}; userId={user_id}; contextId={context_id}; content={content}"
        ))
    }

    pub fn get_enforcement_decision(&self, result_payload: &str) -> Decision {
        Decision {
            block: result_payload.to_ascii_lowercase().contains("block"),
            raw: result_payload.to_string(),
        }
    }

    fn graph_authorization_header(
        &self,
        incoming_authorization_header: &str,
    ) -> Result<String, String> {
        if self.config.entra_sidecar_enabled {
            return self
                .entra_sidecar
                .get_authorization_header(incoming_authorization_header);
        }
        if self.config.graph_access_token_placeholder.trim().is_empty() {
            return Err(
                "Enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER.".to_string(),
            );
        }
        normalize_authorization_header(&self.config.graph_access_token_placeholder)
    }
}
