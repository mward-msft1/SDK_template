mod agent365_adapter;
mod config;
mod entra_sidecar_client;
mod host_adapters;
mod middleware;
mod models;
mod purview_adapter;

use agent365_adapter::Agent365Adapter;
use config::load_config;
use host_adapters::{run_with_agent_framework, run_with_m365_agents_sdk};
use purview_adapter::PurviewAdapter;

fn main() {
    let config = match load_config() {
        Ok(cfg) => cfg,
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    let agent365 = Agent365Adapter::new(config.clone());
    let purview = PurviewAdapter::new(config.clone());

    let result = if config.host_sdk.eq_ignore_ascii_case("m365-agents-sdk") {
        run_with_m365_agents_sdk(&purview, &agent365, &config)
    } else {
        run_with_agent_framework(&purview, &agent365, &config)
    };

    match result {
        Ok(r) => {
            println!("{{");
            println!("  \"blocked\": {},", r.blocked);
            println!("  \"reason\": \"{}\",", r.reason);
            println!("  \"outputText\": \"{}\"", r.output_text);
            println!("}}");
        }
        Err(err) => {
            eprintln!("{err}");
            std::process::exit(1);
        }
    }
}
