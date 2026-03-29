use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::time::{Duration, SystemTime};
use serde::{Deserialize, Serialize};
use crate::{GuardianDecision, RiskLevel, AIAction};
use crate::wireguard_bridge::{WireGuardConfig, NetworkPolicy};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRule {
    pub name: String,
    pub action: FirewallAction,
    pub direction: TrafficDirection,
    pub protocol: Protocol,
    pub local_port: Option<u16>,
    pub remote_port: Option<u16>,
    pub remote_ip: Option<IpAddr>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FirewallAction {
    Allow,
    Block,
    Monitor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrafficDirection {
    Inbound,
    Outbound,
    Both,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
    ICMP,
    Any,
}

#[derive(Debug, Clone)]
pub struct ConnectionInfo {
    pub remote_ip: IpAddr,
    pub remote_port: u16,
    pub protocol: Protocol,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub established_at: SystemTime,
    pub last_activity: SystemTime,
}

pub struct NetworkSecurity {
    firewall_rules: Vec<FirewallRule>,
    active_connections: HashMap<String, ConnectionInfo>,
    blocked_ips: Vec<IpAddr>,
    suspicious_activity: Vec<SuspiciousActivity>,
}

#[derive(Debug, Clone)]
struct SuspiciousActivity {
    ip: IpAddr,
    activity_type: String,
    timestamp: SystemTime,
    severity: RiskLevel,
}

impl NetworkSecurity {
    pub fn new() -> Self {
        Self {
            firewall_rules: Self::default_rules(),
            active_connections: HashMap::new(),
            blocked_ips: vec![],
            suspicious_activity: vec![],
        }
    }

    fn default_rules() -> Vec<FirewallRule> {
        vec![
            FirewallRule {
                name: "Block_Malicious_IPs".to_string(),
                action: FirewallAction::Block,
                direction: TrafficDirection::Both,
                protocol: Protocol::Any,
                local_port: None,
                remote_port: None,
                remote_ip: None,
            },
            FirewallRule {
                name: "Monitor_WireGuard_Traffic".to_string(),
                action: FirewallAction::Monitor,
                direction: TrafficDirection::Both,
                protocol: Protocol::UDP,
                local_port: Some(51820),
                remote_port: None,
                remote_ip: None,
            },
        ]
    }

    pub fn validate_connection(&mut self, remote_ip: IpAddr, remote_port: u16, protocol: Protocol) -> GuardianDecision {
        // Check if IP is blocked
        if self.blocked_ips.contains(&remote_ip) {
            return GuardianDecision {
                allowed: false,
                risk_level: RiskLevel::High,
                reason: format!("IP {} is blocked", remote_ip),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "network_connection_blocked".to_string(),
                    description: format!("Blocked connection to {}", remote_ip),
                    risk_factors: vec!["blocked_ip".to_string()],
                }),
            };
        }

        // Check for suspicious patterns
        if self.is_suspicious_connection(&remote_ip, remote_port) {
            self.add_suspicious_activity(remote_ip, "suspicious_connection_pattern".to_string(), RiskLevel::Medium);
            
            return GuardianDecision {
                allowed: false,
                risk_level: RiskLevel::Medium,
                reason: "Suspicious connection pattern detected".to_string(),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "network_connection_suspicious".to_string(),
                    description: format!("Suspicious connection to {}:{}", remote_ip, remote_port),
                    risk_factors: vec!["suspicious_pattern".to_string()],
                }),
            };
        }

        // Apply firewall rules
        for rule in &self.firewall_rules {
            if self.rule_matches(rule, &remote_ip, remote_port, &protocol) {
                match rule.action {
                    FirewallAction::Block => {
                        return GuardianDecision {
                            allowed: false,
                            risk_level: RiskLevel::Medium,
                            reason: format!("Blocked by firewall rule: {}", rule.name),
                            intervention_required: false,
                            logged_action: Some(AIAction {
                                action_type: "firewall_block".to_string(),
                                description: format!("Connection blocked by rule {}", rule.name),
                                risk_factors: vec!["firewall_rule".to_string()],
                            }),
                        };
                    },
                    FirewallAction::Monitor => {
                        // Allow but log for monitoring
                        break;
                    },
                    FirewallAction::Allow => {
                        break;
                    }
                }
            }
        }

        GuardianDecision {
            allowed: true,
            risk_level: RiskLevel::Low,
            reason: "Connection approved".to_string(),
            intervention_required: false,
            logged_action: Some(AIAction {
                action_type: "network_connection_approved".to_string(),
                description: format!("Approved connection to {}:{}", remote_ip, remote_port),
                risk_factors: vec![],
            }),
        }
    }

    pub fn monitor_wireguard_tunnel(&mut self, config: &WireGuardConfig, bytes_sent: u64, bytes_received: u64) -> GuardianDecision {
        let connection_key = format!("wg_{}", config.name);
        
        // Update connection info
        if let Some(conn) = self.active_connections.get_mut(&connection_key) {
            conn.bytes_sent += bytes_sent;
            conn.bytes_received += bytes_received;
            conn.last_activity = SystemTime::now();
        }

        // Check for data exfiltration patterns
        if self.detect_data_exfiltration(bytes_sent, bytes_received) {
            self.add_suspicious_activity(
                config.endpoint.parse().unwrap_or(IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0))),
                "potential_data_exfiltration".to_string(),
                RiskLevel::High
            );

            return GuardianDecision {
                allowed: false,
                risk_level: RiskLevel::High,
                reason: "Potential data exfiltration detected".to_string(),
                intervention_required: true,
                logged_action: Some(AIAction {
                    action_type: "data_exfiltration_detected".to_string(),
                    description: format!("High outbound traffic on tunnel {}", config.name),
                    risk_factors: vec!["data_exfiltration".to_string()],
                }),
            };
        }

        GuardianDecision {
            allowed: true,
            risk_level: RiskLevel::Low,
            reason: "Tunnel traffic normal".to_string(),
            intervention_required: false,
            logged_action: None,
        }
    }

    pub fn add_firewall_rule(&mut self, rule: FirewallRule) {
        self.firewall_rules.push(rule);
    }

    pub fn block_ip(&mut self, ip: IpAddr) {
        if !self.blocked_ips.contains(&ip) {
            self.blocked_ips.push(ip);
        }
    }

    pub fn unblock_ip(&mut self, ip: &IpAddr) {
        self.blocked_ips.retain(|blocked_ip| blocked_ip != ip);
    }

    pub fn get_suspicious_activities(&self) -> &[SuspiciousActivity] {
        &self.suspicious_activity
    }

    fn rule_matches(&self, rule: &FirewallRule, ip: &IpAddr, port: u16, protocol: &Protocol) -> bool {
        // Check remote IP
        if let Some(rule_ip) = &rule.remote_ip {
            if rule_ip != ip {
                return false;
            }
        }

        // Check remote port
        if let Some(rule_port) = rule.remote_port {
            if rule_port != port {
                return false;
            }
        }

        // Check protocol
        match (&rule.protocol, protocol) {
            (Protocol::Any, _) => true,
            (Protocol::TCP, Protocol::TCP) => true,
            (Protocol::UDP, Protocol::UDP) => true,
            (Protocol::ICMP, Protocol::ICMP) => true,
            _ => false,
        }
    }

    fn is_suspicious_connection(&self, ip: &IpAddr, port: u16) -> bool {
        // Check for known malicious ports
        let suspicious_ports = [22, 23, 135, 139, 445, 1433, 3389];
        if suspicious_ports.contains(&port) {
            return true;
        }

        // Check for rapid connection attempts from same IP
        let recent_activities = self.suspicious_activity.iter()
            .filter(|activity| {
                activity.ip == *ip && 
                activity.timestamp.elapsed().unwrap_or(Duration::from_secs(3600)) < Duration::from_secs(300)
            })
            .count();

        recent_activities > 5
    }

    fn detect_data_exfiltration(&self, bytes_sent: u64, bytes_received: u64) -> bool {
        // Simple heuristic: high outbound traffic compared to inbound
        if bytes_sent > 0 && bytes_received > 0 {
            let ratio = bytes_sent as f64 / bytes_received as f64;
            ratio > 10.0 && bytes_sent > 100_000_000 // 100MB threshold with 10:1 ratio
        } else {
            bytes_sent > 500_000_000 // 500MB pure outbound
        }
    }

    fn add_suspicious_activity(&mut self, ip: IpAddr, activity_type: String, severity: RiskLevel) {
        self.suspicious_activity.push(SuspiciousActivity {
            ip,
            activity_type,
            timestamp: SystemTime::now(),
            severity,
        });

        // Keep only recent activities (last 24 hours)
        let cutoff = SystemTime::now() - Duration::from_secs(86400);
        self.suspicious_activity.retain(|activity| activity.timestamp > cutoff);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_validation() {
        let mut security = NetworkSecurity::new();
        let ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1));
        
        let decision = security.validate_connection(ip, 80, Protocol::TCP);
        assert!(decision.allowed);

        security.block_ip(ip);
        let decision = security.validate_connection(ip, 80, Protocol::TCP);
        assert!(!decision.allowed);
    }

    #[test]
    fn test_data_exfiltration_detection() {
        let security = NetworkSecurity::new();
        
        // Normal traffic
        assert!(!security.detect_data_exfiltration(1000, 1000));
        
        // Suspicious outbound traffic
        assert!(security.detect_data_exfiltration(600_000_000, 0));
        assert!(security.detect_data_exfiltration(200_000_000, 10_000_000));
    }
}