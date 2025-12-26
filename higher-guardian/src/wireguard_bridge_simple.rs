use serde::{Deserialize, Serialize};
use crate::{GuardianDecision, InterventionLevel};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireGuardConfig {
    pub name: String,
    pub private_key: String,
    pub public_key: String,
    pub endpoint: String,
    pub allowed_ips: Vec<String>,
    pub listen_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPolicy {
    pub allowed_endpoints: Vec<String>,
    pub blocked_ips: Vec<String>,
    pub max_connections: u32,
    pub require_encryption: bool,
}

pub struct WireGuardBridge {
    policy: NetworkPolicy,
    active_tunnels: Vec<String>,
}

impl WireGuardBridge {
    pub fn new() -> Self {
        Self {
            policy: NetworkPolicy {
                allowed_endpoints: vec![],
                blocked_ips: vec![],
                max_connections: 10,
                require_encryption: true,
            },
            active_tunnels: vec![],
        }
    }

    pub fn validate_tunnel_creation(&self, config: &WireGuardConfig) -> GuardianDecision {
        // Check if endpoint is allowed
        if !self.policy.allowed_endpoints.is_empty() && 
           !self.policy.allowed_endpoints.iter().any(|ep| config.endpoint.contains(ep)) {
            return GuardianDecision {
                action_id: Uuid::new_v4(),
                approved: false,
                intervention_applied: InterventionLevel::Block,
                reasoning: format!("Endpoint {} not in allowed list", config.endpoint),
                timestamp: Utc::now(),
                human_override: Some(false),
            };
        }

        // Check connection limits
        if self.active_tunnels.len() >= self.policy.max_connections as usize {
            return GuardianDecision {
                action_id: Uuid::new_v4(),
                approved: false,
                intervention_applied: InterventionLevel::Block,
                reasoning: "Maximum tunnel connections reached".to_string(),
                timestamp: Utc::now(),
                human_override: Some(false),
            };
        }

        GuardianDecision {
            action_id: Uuid::new_v4(),
            approved: true,
            intervention_applied: InterventionLevel::Monitor,
            reasoning: "Tunnel creation approved".to_string(),
            timestamp: Utc::now(),
            human_override: Some(false),
        }
    }

    pub fn monitor_traffic(&self, tunnel_name: &str, bytes_sent: u64, bytes_received: u64) -> GuardianDecision {
        const MAX_TRAFFIC_MB: u64 = 1000; // 1GB limit
        let total_mb = (bytes_sent + bytes_received) / (1024 * 1024);

        if total_mb > MAX_TRAFFIC_MB {
            return GuardianDecision {
                action_id: Uuid::new_v4(),
                approved: false,
                intervention_applied: InterventionLevel::Block,
                reasoning: format!("Traffic limit exceeded: {}MB", total_mb),
                timestamp: Utc::now(),
                human_override: Some(false),
            };
        }

        GuardianDecision {
            action_id: Uuid::new_v4(),
            approved: true,
            intervention_applied: InterventionLevel::Monitor,
            reasoning: "Traffic within normal limits".to_string(),
            timestamp: Utc::now(),
            human_override: Some(false),
        }
    }

    pub fn update_policy(&mut self, policy: NetworkPolicy) {
        self.policy = policy;
    }

    pub fn add_active_tunnel(&mut self, tunnel_name: String) {
        self.active_tunnels.push(tunnel_name);
    }

    pub fn remove_active_tunnel(&mut self, tunnel_name: &str) {
        self.active_tunnels.retain(|t| t != tunnel_name);
    }

    pub fn get_active_tunnels(&self) -> &[String] {
        &self.active_tunnels
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tunnel_validation() {
        let bridge = WireGuardBridge::new();
        let config = WireGuardConfig {
            name: "test-tunnel".to_string(),
            private_key: "test-key".to_string(),
            public_key: "test-pub".to_string(),
            endpoint: "192.168.1.1:51820".to_string(),
            allowed_ips: vec!["0.0.0.0/0".to_string()],
            listen_port: 51820,
        };

        let decision = bridge.validate_tunnel_creation(&config);
        assert!(decision.approved);
    }

    #[test]
    fn test_traffic_monitoring() {
        let bridge = WireGuardBridge::new();
        let decision = bridge.monitor_traffic("test", 500_000_000, 500_000_000); // 500MB each
        assert!(decision.approved);

        let decision = bridge.monitor_traffic("test", 1_000_000_000, 1_000_000_000); // 1GB each
        assert!(!decision.approved);
    }
}