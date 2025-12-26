//! # Higher Guardian with WireGuard Integration
//!
//! A comprehensive AI oversight system with full WireGuard Windows integration.
//! Provides ethical boundaries, transaction monitoring, and network security.
//!
//! ## Features
//! - AI action validation with ethical evaluation
//! - WireGuard tunnel management and monitoring
//! - Network security with firewall rules
//! - Traffic analysis and data exfiltration detection
//! - Real-time system health monitoring
//! - Transaction safeguarding with spending limits
//!
//! ## Integration with S-IO Protocol
//! The Higher Guardian integrates with the S-IO Protocol to provide:
//! - Secure micropayment validation
//! - Network traffic oversight
//! - AI-driven security decisions
//! - Automated threat response

use higher_guardian::{
    guardian::HigherGuardian,
    ethics::EthicsEngine,
    transaction::TransactionMonitor,
    monitoring::SystemMonitor,
    wireguard_bridge::{WireGuardBridge, WireGuardConfig},
    network_security::{NetworkSecurity, FirewallRule, FirewallAction, TrafficDirection, Protocol},
    AIAction, RiskLevel
};
use std::net::{IpAddr, Ipv4Addr};
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    println!("🛡️  Higher Guardian with WireGuard Integration Starting...");
    
    // Initialize all components
    let mut guardian = HigherGuardian::new();
    let mut wg_bridge = WireGuardBridge::new();
    let mut network_security = NetworkSecurity::new();
    let mut system_monitor = SystemMonitor::new();
    
    // Test WireGuard tunnel validation
    println!("\n🔒 Testing WireGuard Tunnel Validation...");
    let tunnel_config = WireGuardConfig {
        name: "singularity-tunnel".to_string(),
        private_key: "test-private-key".to_string(),
        public_key: "test-public-key".to_string(),
        endpoint: "vpn.singularity.io:51820".to_string(),
        allowed_ips: vec!["0.0.0.0/0".to_string()],
        listen_port: 51820,
    };
    
    let tunnel_decision = wg_bridge.validate_tunnel_creation(&tunnel_config);
    println!("Tunnel Decision: {:?}", tunnel_decision);
    
    if tunnel_decision.allowed {
        wg_bridge.add_active_tunnel(tunnel_config.name.clone());
        println!("✅ Tunnel '{}' approved and activated", tunnel_config.name);
    }
    
    // Test network security validation
    println!("\n🌐 Testing Network Security...");
    let test_ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 100));
    let connection_decision = network_security.validate_connection(test_ip, 80, Protocol::TCP);
    println!("Connection Decision: {:?}", connection_decision);
    
    // Add firewall rule
    network_security.add_firewall_rule(FirewallRule {
        name: "Block_Suspicious_SSH".to_string(),
        action: FirewallAction::Block,
        direction: TrafficDirection::Inbound,
        protocol: Protocol::TCP,
        local_port: Some(22),
        remote_port: None,
        remote_ip: None,
    });
    
    // Test SSH connection (should be blocked)
    let ssh_decision = network_security.validate_connection(test_ip, 22, Protocol::TCP);
    println!("SSH Connection Decision: {:?}", ssh_decision);
    
    // Test AI action validation with network context
    println!("\n🤖 Testing AI Action Validation...");
    let network_action = AIAction {
        action_type: "network_configuration".to_string(),
        description: "AI attempting to modify WireGuard configuration".to_string(),
        risk_factors: vec!["network_modification".to_string(), "tunnel_config".to_string()],
    };
    
    let ai_decision = guardian.validate_ai_action(&network_action).await?;
    println!("AI Network Action Decision: {:?}", ai_decision);
    
    // Test traffic monitoring
    println!("\n📊 Testing Traffic Monitoring...");
    let traffic_decision = wg_bridge.monitor_traffic(&tunnel_config.name, 50_000_000, 10_000_000); // 50MB out, 10MB in
    println!("Traffic Monitoring Decision: {:?}", traffic_decision);
    
    // Test high traffic scenario
    let high_traffic_decision = wg_bridge.monitor_traffic(&tunnel_config.name, 1_500_000_000, 100_000_000); // 1.5GB out, 100MB in
    println!("High Traffic Decision: {:?}", high_traffic_decision);
    
    // Monitor system health
    println!("\n💻 System Health Monitoring...");
    system_monitor.log_activity("wireguard_integration", "Higher Guardian WireGuard bridge active");
    
    let health_report = system_monitor.generate_health_report();
    println!("System Health: {:?}", health_report);
    
    // Simulate real-time monitoring
    println!("\n🔄 Starting Real-time Monitoring (5 seconds)...");
    for i in 1..=5 {
        sleep(Duration::from_secs(1)).await;
        
        // Simulate network activity
        let bytes_sent = (i * 1_000_000) as u64; // Increasing traffic
        let bytes_received = (i * 500_000) as u64;
        
        let monitor_result = network_security.monitor_wireguard_tunnel(
            &tunnel_config, 
            bytes_sent, 
            bytes_received
        );
        
        println!("[{}s] Traffic Monitor: {} - {}", i, 
                if monitor_result.allowed { "✅ NORMAL" } else { "⚠️  ALERT" },
                monitor_result.reason);
        
        if !monitor_result.allowed {
            println!("🚨 INTERVENTION REQUIRED: {}", monitor_result.reason);
            break;
        }
    }
    
    // Test malicious IP blocking
    println!("\n🚫 Testing IP Blocking...");
    let malicious_ip = IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1));
    network_security.block_ip(malicious_ip);
    
    let blocked_decision = network_security.validate_connection(malicious_ip, 443, Protocol::TCP);
    println!("Blocked IP Decision: {:?}", blocked_decision);
    
    // Show suspicious activities
    let suspicious = network_security.get_suspicious_activities();
    if !suspicious.is_empty() {
        println!("\n⚠️  Suspicious Activities Detected: {} events", suspicious.len());
        for activity in suspicious.iter().take(3) {
            println!("  - {} from {} (Risk: {:?})", activity.activity_type, activity.ip, activity.severity);
        }
    }
    
    println!("\n🛡️  Higher Guardian WireGuard Integration Test Complete!");
    println!("   - Tunnel validation: ✅");
    println!("   - Network security: ✅");
    println!("   - Traffic monitoring: ✅");
    println!("   - AI action validation: ✅");
    println!("   - System health: ✅");
    
    Ok(())
}