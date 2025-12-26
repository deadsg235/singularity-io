use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_void};
use std::ptr;
use serde::{Deserialize, Serialize};
use crate::{GuardianDecision, RiskLevel, AIAction};

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
                allowed: false,
                risk_level: RiskLevel::High,
                reason: format!("Endpoint {} not in allowed list", config.endpoint),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "network_tunnel_creation".to_string(),
                    description: format!("Attempted to create tunnel to {}", config.endpoint),
                    risk_factors: vec!["unauthorized_endpoint".to_string()],
                }),
            };
        }

        // Check connection limits
        if self.active_tunnels.len() >= self.policy.max_connections as usize {
            return GuardianDecision {
                allowed: false,
                risk_level: RiskLevel::Medium,
                reason: "Maximum tunnel connections reached".to_string(),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "network_tunnel_creation".to_string(),
                    description: "Tunnel creation blocked due to connection limit".to_string(),
                    risk_factors: vec!["connection_limit_exceeded".to_string()],
                }),
            };
        }

        GuardianDecision {
            allowed: true,
            risk_level: RiskLevel::Low,
            reason: "Tunnel creation approved".to_string(),
            intervention_required: false,
            logged_action: Some(AIAction {
                action_type: "network_tunnel_creation".to_string(),
                description: format!("Approved tunnel to {}", config.endpoint),
                risk_factors: vec![],
            }),
        }
    }

    pub fn monitor_traffic(&self, tunnel_name: &str, bytes_sent: u64, bytes_received: u64) -> GuardianDecision {
        const MAX_TRAFFIC_MB: u64 = 1000; // 1GB limit
        let total_mb = (bytes_sent + bytes_received) / (1024 * 1024);

        if total_mb > MAX_TRAFFIC_MB {
            return GuardianDecision {
                allowed: false,
                risk_level: RiskLevel::High,
                reason: format!("Traffic limit exceeded: {}MB", total_mb),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "network_traffic_monitoring".to_string(),
                    description: format!("High traffic detected on tunnel {}", tunnel_name),
                    risk_factors: vec!["excessive_traffic".to_string()],
                }),
            };
        }

        GuardianDecision {
            allowed: true,
            risk_level: RiskLevel::Low,
            reason: "Traffic within normal limits".to_string(),
            intervention_required: false,
            logged_action: None,
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
}

// FFI bindings for WireGuard Windows integration
#[repr(C)]
pub struct WireGuardAdapter {
    handle: *mut c_void,
}

extern "C" {
    fn WireGuardCreateAdapter(name: *const c_char, tunnel_type: *const c_char, guid: *const c_void) -> *mut c_void;
    fn WireGuardCloseAdapter(handle: *mut c_void);
    fn WireGuardSetAdapterLogging(handle: *mut c_void, state: u32) -> u32;
}

impl WireGuardAdapter {
    pub fn create(name: &str, tunnel_type: &str) -> Result<Self, String> {
        let name_c = CString::new(name).map_err(|e| format!("Invalid name: {}", e))?;
        let type_c = CString::new(tunnel_type).map_err(|e| format!("Invalid type: {}", e))?;
        
        unsafe {
            let handle = WireGuardCreateAdapter(name_c.as_ptr(), type_c.as_ptr(), ptr::null());
            if handle.is_null() {
                return Err("Failed to create WireGuard adapter".to_string());
            }
            Ok(Self { handle })
        }
    }

    pub fn set_logging(&self, enabled: bool) -> Result<(), String> {
        unsafe {
            let result = WireGuardSetAdapterLogging(self.handle, if enabled { 1 } else { 0 });
            if result == 0 {
                return Err("Failed to set adapter logging".to_string());
            }
        }
        Ok(())
    }
}

impl Drop for WireGuardAdapter {
    fn drop(&mut self) {
        unsafe {
            WireGuardCloseAdapter(self.handle);
        }
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
        assert!(decision.allowed);
    }

    #[test]
    fn test_traffic_monitoring() {
        let bridge = WireGuardBridge::new();
        let decision = bridge.monitor_traffic("test", 500_000_000, 500_000_000); // 500MB each
        assert!(decision.allowed);

        let decision = bridge.monitor_traffic("test", 1_000_000_000, 1_000_000_000); // 1GB each
        assert!(!decision.allowed);
    }
}