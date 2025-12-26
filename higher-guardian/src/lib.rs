use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub mod guardian;
pub mod ethics;
pub mod transaction;
pub mod monitoring;
pub mod wireguard_bridge_simple;

pub use guardian::*;
pub use ethics::*;
pub use transaction::*;
pub use monitoring::*;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RiskLevel {
    Low = 0,
    Moderate = 1,
    High = 2,
    Critical = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InterventionLevel {
    Monitor,
    Warn,
    RequireApproval,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAction {
    pub id: Uuid,
    pub ai_system_id: String,
    pub action_type: String,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub risk_assessment: Option<RiskAssessment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risk_level: RiskLevel,
    pub intervention_level: InterventionLevel,
    pub reasoning: String,
    pub confidence: f64,
    pub factors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardianDecision {
    pub action_id: Uuid,
    pub approved: bool,
    pub intervention_applied: InterventionLevel,
    pub reasoning: String,
    pub timestamp: DateTime<Utc>,
    pub human_override: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionGuard {
    pub max_amount: f64,
    pub daily_limit: f64,
    pub suspicious_patterns: Vec<String>,
    pub blacklisted_addresses: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthicalBoundary {
    pub principle: String,
    pub description: String,
    pub violation_threshold: f64,
    pub enforcement_level: InterventionLevel,
}

pub type GuardianResult<T> = Result<T, GuardianError>;

#[derive(Debug, thiserror::Error)]
pub enum GuardianError {
    #[error("AI action blocked: {0}")]
    ActionBlocked(String),
    #[error("Ethical violation detected: {0}")]
    EthicalViolation(String),
    #[error("Transaction limit exceeded: {0}")]
    TransactionLimitExceeded(String),
    #[error("Human approval required: {0}")]
    HumanApprovalRequired(String),
    #[error("System error: {0}")]
    SystemError(String),
}