#[derive(Clone, Debug)]
pub struct TurnContext {
    pub turn_id: String,
    pub user_id: String,
    pub input_text: String,
    pub authorization_header: String,
}

#[derive(Clone, Debug, Default)]
pub struct ModelResult {
    pub blocked: bool,
    pub reason: String,
    pub output_text: String,
}

#[derive(Clone, Debug, Default)]
pub struct Decision {
    pub block: bool,
    pub raw: String,
}
