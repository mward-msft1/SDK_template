use crate::config::AppConfig;
use crate::models::Decision;

#[derive(Clone, Debug)]
pub struct PurviewAdapter {
    config: AppConfig,
}

impl PurviewAdapter {
    pub fn new(config: AppConfig) -> Self {
        Self { config }
    }

    pub fn compute_protection_scopes(&self, user_id: &str) -> Result<String, String> {
        self.ensure_graph_token()?;
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
    ) -> Result<String, String> {
        self.ensure_graph_token()?;
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

    fn ensure_graph_token(&self) -> Result<(), String> {
        if self.config.graph_access_token_placeholder.trim().is_empty() {
            return Err(
                "Missing GRAPH_ACCESS_TOKEN_PLACEHOLDER. Replace token acquisition TODO in PurviewAdapter."
                    .to_string(),
            );
        }
        Ok(())
    }
}
