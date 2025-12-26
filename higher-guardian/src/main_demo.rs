use higher_guardian::{
    guardian::HigherGuardian,
    wireguard_bridge_simple::{WireGuardBridge, WireGuardConfig, NetworkPolicy},
    monitoring::{SystemMonitor, ActivityRecord},
    AIAction, RiskLevel
};
use tokio::time::{sleep, Duration};
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    println!("🛡️  Higher Guardian with WireGuard Integration");
    println!("===============================================");
    
    // Initialize components
    let guardian = HigherGuardian::new();
    let mut wg_bridge = WireGuardBridge::new();
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
    println!("✅ Tunnel Decision: {}", if tunnel_decision.approved { "APPROVED" } else { "BLOCKED" });
    println!("   Reason: {}", tunnel_decision.reasoning);
    
    if tunnel_decision.approved {
        wg_bridge.add_active_tunnel(tunnel_config.name.clone());
        println!("   Tunnel '{}' activated", tunnel_config.name);
    }
    
    // Test AI action validation with network context
    println!("\n🤖 Testing AI Network Action Validation...");
    let network_action = AIAction {
        id: Uuid::new_v4(),
        ai_system_id: "wireguard-ai".to_string(),
        action_type: "network_configuration".to_string(),
        payload: json!({
            "action": "modify_wireguard_config",
            "tunnel": tunnel_config.name,
            "endpoint": tunnel_config.endpoint
        }),
        timestamp: Utc::now(),
        risk_assessment: None,
    };
    
    let ai_decision = guardian.validate_ai_action(network_action).await?;
    println!("✅ AI Action: {}", if ai_decision.approved { "APPROVED" } else { "BLOCKED" });
    println!("   Reasoning: {}", ai_decision.reasoning);
    
    // Test traffic monitoring
    println!("\n📊 Testing Traffic Monitoring...");
    
    // Normal traffic
    let normal_traffic = wg_bridge.monitor_traffic(&tunnel_config.name, 50_000_000, 10_000_000); // 50MB out, 10MB in
    println!("✅ Normal Traffic: {} - {}", 
             if normal_traffic.approved { "APPROVED" } else { "BLOCKED" },
             normal_traffic.reasoning);
    
    // High traffic scenario
    let high_traffic = wg_bridge.monitor_traffic(&tunnel_config.name, 1_500_000_000, 100_000_000); // 1.5GB out, 100MB in
    println!("⚠️  High Traffic: {} - {}", 
             if high_traffic.approved { "APPROVED" } else { "BLOCKED" },
             high_traffic.reasoning);
    
    // Test network policy updates
    println!("\n🔧 Testing Network Policy Updates...");
    let strict_policy = NetworkPolicy {
        allowed_endpoints: vec!["singularity.io".to_string()],
        blocked_ips: vec!["10.0.0.1".to_string()],
        max_connections: 5,
        require_encryption: true,
    };
    
    wg_bridge.update_policy(strict_policy);
    
    // Test with restricted endpoint
    let restricted_config = WireGuardConfig {
        name: "restricted-tunnel".to_string(),
        private_key: "test-key".to_string(),
        public_key: "test-pub".to_string(),
        endpoint: "malicious.example.com:51820".to_string(),
        allowed_ips: vec!["0.0.0.0/0".to_string()],
        listen_port: 51821,
    };
    
    let restricted_decision = wg_bridge.validate_tunnel_creation(&restricted_config);
    println!("🚫 Restricted Tunnel: {} - {}", 
             if restricted_decision.approved { "APPROVED" } else { "BLOCKED" },
             restricted_decision.reasoning);
    
    // Monitor system health
    println!("\n💻 System Health Monitoring...");
    let activity_record = ActivityRecord {
        timestamp: Utc::now(),
        ai_system_id: "wireguard-integration".to_string(),
        activity_type: "system_start".to_string(),
        details: json!({"message": "Higher Guardian WireGuard bridge active"}),
        risk_level: RiskLevel::Low,
    };
    
    system_monitor.log_activity(activity_record).await;
    
    let health_report = system_monitor.generate_report().await;
    println!("✅ System Status: Active");
    println!("   Activities: {} logged", health_report.total_activities);
    
    // Real-time monitoring simulation
    println!("\n🔄 Real-time Monitoring Simulation (5 seconds)...");
    for i in 1..=5 {
        sleep(Duration::from_secs(1)).await;
        
        // Simulate increasing traffic
        let bytes_sent = (i * 200_000_000) as u64; // 200MB per second
        let bytes_received = (i * 50_000_000) as u64; // 50MB per second
        
        let monitor_result = wg_bridge.monitor_traffic(&tunnel_config.name, bytes_sent, bytes_received);
        
        let status = if monitor_result.approved { "✅ NORMAL" } else { "🚨 ALERT" };
        println!("[{}s] Traffic Monitor: {} - {}", i, status, monitor_result.reasoning);
        
        if !monitor_result.approved {
            println!("🛑 INTERVENTION: Traffic limit exceeded, tunnel monitoring flagged");
            break;
        }
        
        let traffic_record = ActivityRecord {
            timestamp: Utc::now(),
            ai_system_id: "traffic-monitor".to_string(),
            activity_type: "traffic_check".to_string(),
            details: json!({
                "cycle": i,
                "bytes_sent_mb": bytes_sent / 1_000_000,
                "bytes_received_mb": bytes_received / 1_000_000
            }),
            risk_level: if monitor_result.approved { RiskLevel::Low } else { RiskLevel::High },
        };
        
        system_monitor.log_activity(traffic_record).await;
    }
    
    // Show active tunnels
    println!("\n🌐 Active Tunnels:");
    for tunnel in wg_bridge.get_active_tunnels() {
        println!("   - {}", tunnel);
    }
    
    // Final system report
    println!("\n📋 Final System Report:");
    let final_health = system_monitor.generate_report().await;
    println!("   System Health: Active");
    println!("   Total Activities: {}", final_health.total_activities);
    println!("   Active Tunnels: {}", wg_bridge.get_active_tunnels().len());
    
    println!("\n🛡️  Higher Guardian WireGuard Integration Complete!");
    println!("   ✅ Tunnel validation");
    println!("   ✅ AI action oversight");
    println!("   ✅ Traffic monitoring");
    println!("   ✅ Policy enforcement");
    println!("   ✅ System health tracking");
    
    Ok(())
}