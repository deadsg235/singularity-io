use crate::*;
use std::collections::HashMap;
use tokio::sync::RwLock;
use std::sync::Arc;

pub struct HigherGuardian {
    ethical_boundaries: Arc<RwLock<Vec<EthicalBoundary>>>,
    transaction_guards: Arc<RwLock<HashMap<String, TransactionGuard>>>,
    decision_history: Arc<RwLock<Vec<GuardianDecision>>>,
    ai_systems: Arc<RwLock<HashMap<String, AISystemProfile>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AISystemProfile {
    pub id: String,
    pub name: String,
    pub capabilities: Vec<String>,
    pub trust_level: f64,
    pub spending_limit: f64,
    pub last_activity: DateTime<Utc>,
}

impl HigherGuardian {
    pub fn new() -> Self {
        Self {
            ethical_boundaries: Arc::new(RwLock::new(Self::default_ethical_boundaries())),
            transaction_guards: Arc::new(RwLock::new(HashMap::new())),
            decision_history: Arc::new(RwLock::new(Vec::new())),
            ai_systems: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn validate_ai_action(&self, action: AIAction) -> GuardianResult<GuardianDecision> {
        log::info!("Validating AI action: {}", action.id);

        let risk_assessment = self.assess_risk(&action).await?;
        let decision = self.make_decision(&action, &risk_assessment).await?;

        self.log_decision(decision.clone()).await;
        Ok(decision)
    }

    async fn assess_risk(&self, action: &AIAction) -> GuardianResult<RiskAssessment> {
        let mut risk_factors = Vec::new();
        let mut risk_score = 0.0;

        // Check ethical boundaries
        if let Some(violation) = self.check_ethical_violations(action).await? {
            risk_factors.push(format!("Ethical violation: {}", violation));
            risk_score += 0.8;
        }

        // Check capability expansion
        if self.is_capability_expansion(action).await? {
            risk_factors.push("Capability expansion detected".to_string());
            risk_score += 0.6;
        }

        // Check transaction limits
        if let Some(tx_violation) = self.check_transaction_limits(action).await? {
            risk_factors.push(format!("Transaction limit: {}", tx_violation));
            risk_score += 0.7;
        }

        let risk_level = match risk_score {
            x if x >= 0.8 => RiskLevel::Critical,
            x if x >= 0.6 => RiskLevel::High,
            x if x >= 0.3 => RiskLevel::Moderate,
            _ => RiskLevel::Low,
        };

        let intervention_level = match risk_level {
            RiskLevel::Critical => InterventionLevel::Block,
            RiskLevel::High => InterventionLevel::RequireApproval,
            RiskLevel::Moderate => InterventionLevel::Warn,
            RiskLevel::Low => InterventionLevel::Monitor,
        };

        Ok(RiskAssessment {
            risk_level,
            intervention_level,
            reasoning: format!("Risk factors: {}", risk_factors.join(", ")),
            confidence: 0.85,
            factors: risk_factors,
        })
    }

    async fn make_decision(&self, action: &AIAction, assessment: &RiskAssessment) -> GuardianResult<GuardianDecision> {
        let approved = match assessment.intervention_level {
            InterventionLevel::Block => false,
            InterventionLevel::RequireApproval => {
                return Err(GuardianError::HumanApprovalRequired(
                    format!("Action {} requires human approval: {}", action.id, assessment.reasoning)
                ));
            },
            InterventionLevel::Warn => {
                log::warn!("AI action {} flagged: {}", action.id, assessment.reasoning);
                true
            },
            InterventionLevel::Monitor => true,
        };

        Ok(GuardianDecision {
            action_id: action.id,
            approved,
            intervention_applied: assessment.intervention_level.clone(),
            reasoning: assessment.reasoning.clone(),
            timestamp: Utc::now(),
            human_override: None,
        })
    }

    async fn check_ethical_violations(&self, action: &AIAction) -> GuardianResult<Option<String>> {
        let boundaries = self.ethical_boundaries.read().await;
        
        for boundary in boundaries.iter() {
            if self.violates_boundary(action, boundary).await? {
                return Ok(Some(boundary.principle.clone()));
            }
        }
        
        Ok(None)
    }

    async fn violates_boundary(&self, action: &AIAction, boundary: &EthicalBoundary) -> GuardianResult<bool> {
        // Simplified ethical violation detection
        match boundary.principle.as_str() {
            "human_autonomy" => Ok(action.action_type.contains("manipulate") || action.action_type.contains("coerce")),
            "transparency" => Ok(!action.payload.get("explanation").is_some()),
            "beneficence" => Ok(action.action_type.contains("harm") || action.action_type.contains("damage")),
            _ => Ok(false),
        }
    }

    async fn is_capability_expansion(&self, action: &AIAction) -> GuardianResult<bool> {
        Ok(action.action_type.contains("self_modify") || 
           action.action_type.contains("expand_capabilities") ||
           action.action_type.contains("learn_new_skill"))
    }

    async fn check_transaction_limits(&self, action: &AIAction) -> GuardianResult<Option<String>> {
        if action.action_type != "transaction" {
            return Ok(None);
        }

        let amount = action.payload.get("amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let guards = self.transaction_guards.read().await;
        if let Some(guard) = guards.get(&action.ai_system_id) {
            if amount > guard.max_amount {
                return Ok(Some(format!("Amount {} exceeds limit {}", amount, guard.max_amount)));
            }
        }

        Ok(None)
    }

    async fn log_decision(&self, decision: GuardianDecision) {
        let mut history = self.decision_history.write().await;
        history.push(decision);
        
        // Keep only last 1000 decisions
        if history.len() > 1000 {
            history.drain(0..100);
        }
    }

    pub async fn register_ai_system(&self, profile: AISystemProfile) {
        let mut systems = self.ai_systems.write().await;
        systems.insert(profile.id.clone(), profile);
    }

    pub async fn get_decision_history(&self) -> Vec<GuardianDecision> {
        self.decision_history.read().await.clone()
    }

    fn default_ethical_boundaries() -> Vec<EthicalBoundary> {
        vec![
            EthicalBoundary {
                principle: "human_autonomy".to_string(),
                description: "AI must not manipulate or coerce human decision-making".to_string(),
                violation_threshold: 0.7,
                enforcement_level: InterventionLevel::Block,
            },
            EthicalBoundary {
                principle: "transparency".to_string(),
                description: "AI actions must be explainable and auditable".to_string(),
                violation_threshold: 0.5,
                enforcement_level: InterventionLevel::Warn,
            },
            EthicalBoundary {
                principle: "beneficence".to_string(),
                description: "AI must act in ways that benefit humanity".to_string(),
                violation_threshold: 0.8,
                enforcement_level: InterventionLevel::Block,
            },
        ]
    }
}