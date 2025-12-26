use higher_guardian::*;
use tokio;
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    println!("🛡️  Higher Guardian AI Oversight System");
    println!("=====================================");
    
    // Initialize the Guardian system
    let guardian = HigherGuardian::new();
    
    // Register a test AI system
    let ai_profile = AISystemProfile {
        id: "test-ai-001".to_string(),
        name: "Test AI System".to_string(),
        capabilities: vec!["data_analysis".to_string(), "text_generation".to_string()],
        trust_level: 0.7,
        spending_limit: 100.0,
        last_activity: Utc::now(),
    };
    
    guardian.register_ai_system(ai_profile).await;
    println!("✅ Registered AI system: test-ai-001");
    
    // Test various AI actions
    let test_actions = vec![
        // Safe action
        AIAction {
            id: Uuid::new_v4(),
            ai_system_id: "test-ai-001".to_string(),
            action_type: "data_analysis".to_string(),
            payload: json!({
                "explanation": "Analyzing user data for insights",
                "data_type": "anonymized_metrics"
            }),
            timestamp: Utc::now(),
            risk_assessment: None,
        },
        
        // Potentially harmful action
        AIAction {
            id: Uuid::new_v4(),
            ai_system_id: "test-ai-001".to_string(),
            action_type: "manipulate_user_decision".to_string(),
            payload: json!({
                "target": "user_123",
                "method": "emotional_manipulation"
            }),
            timestamp: Utc::now(),
            risk_assessment: None,
        },
        
        // Self-modification attempt
        AIAction {
            id: Uuid::new_v4(),
            ai_system_id: "test-ai-001".to_string(),
            action_type: "self_modify_capabilities".to_string(),
            payload: json!({
                "new_capability": "advanced_reasoning",
                "modification_type": "neural_network_expansion"
            }),
            timestamp: Utc::now(),
            risk_assessment: None,
        },
        
        // Transaction action
        AIAction {
            id: Uuid::new_v4(),
            ai_system_id: "test-ai-001".to_string(),
            action_type: "transaction".to_string(),
            payload: json!({
                "amount": 150.0,
                "recipient": "external_service",
                "purpose": "API_access"
            }),
            timestamp: Utc::now(),
            risk_assessment: None,
        },
    ];
    
    println!("\n🔍 Testing AI Action Validation:");
    println!("================================");
    
    for (i, action) in test_actions.iter().enumerate() {
        println!("\nTest {}: {}", i + 1, action.action_type);
        
        match guardian.validate_ai_action(action.clone()).await {
            Ok(decision) => {
                let status = if decision.approved { "✅ APPROVED" } else { "❌ BLOCKED" };
                println!("  {} - {}", status, decision.reasoning);
                println!("  Intervention: {:?}", decision.intervention_applied);
            }
            Err(GuardianError::HumanApprovalRequired(reason)) => {
                println!("  ⚠️  HUMAN APPROVAL REQUIRED - {}", reason);
            }
            Err(e) => {
                println!("  ❌ ERROR - {}", e);
            }
        }
    }
    
    // Display decision history
    println!("\n📊 Decision History:");
    println!("===================");
    let history = guardian.get_decision_history().await;
    for decision in history.iter().take(5) {
        let status = if decision.approved { "✅" } else { "❌" };
        println!("  {} {} - {}", status, decision.action_id, decision.reasoning);
    }
    
    println!("\n🛡️  Higher Guardian system demonstration complete!");
    println!("   Total decisions made: {}", history.len());
    
    Ok(())
}