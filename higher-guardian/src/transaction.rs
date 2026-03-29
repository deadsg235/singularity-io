use crate::*;
use std::collections::HashMap;

pub struct TransactionMonitor {
    spending_limits: HashMap<String, f64>,
    daily_limits: HashMap<String, f64>,
    daily_spending: HashMap<String, f64>,
    suspicious_patterns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: Uuid,
    pub ai_system_id: String,
    pub amount: f64,
    pub recipient: String,
    pub transaction_type: String,
    pub timestamp: DateTime<Utc>,
}

impl TransactionMonitor {
    pub fn new() -> Self {
        Self {
            spending_limits: HashMap::new(),
            daily_limits: HashMap::new(),
            daily_spending: HashMap::new(),
            suspicious_patterns: vec![
                "rapid_succession".to_string(),
                "round_numbers".to_string(),
                "unusual_recipient".to_string(),
            ],
        }
    }

    pub async fn validate_transaction(&mut self, transaction: &Transaction) -> GuardianResult<bool> {
        // Check spending limits
        if let Some(&limit) = self.spending_limits.get(&transaction.ai_system_id) {
            if transaction.amount > limit {
                return Err(GuardianError::TransactionLimitExceeded(
                    format!("Amount {} exceeds limit {} for AI system {}", 
                           transaction.amount, limit, transaction.ai_system_id)
                ));
            }
        }

        // Check daily limits
        if let Some(&daily_limit) = self.daily_limits.get(&transaction.ai_system_id) {
            let current_daily = self.daily_spending.get(&transaction.ai_system_id).unwrap_or(&0.0);
            if current_daily + transaction.amount > daily_limit {
                return Err(GuardianError::TransactionLimitExceeded(
                    format!("Daily limit exceeded: {} + {} > {}", 
                           current_daily, transaction.amount, daily_limit)
                ));
            }
        }

        // Check for suspicious patterns
        if self.is_suspicious_pattern(transaction).await? {
            return Err(GuardianError::HumanApprovalRequired(
                "Suspicious transaction pattern detected".to_string()
            ));
        }

        // Update daily spending
        let daily_total = self.daily_spending.entry(transaction.ai_system_id.clone()).or_insert(0.0);
        *daily_total += transaction.amount;

        Ok(true)
    }

    pub fn set_spending_limit(&mut self, ai_system_id: String, limit: f64) {
        self.spending_limits.insert(ai_system_id, limit);
    }

    pub fn set_daily_limit(&mut self, ai_system_id: String, limit: f64) {
        self.daily_limits.insert(ai_system_id, limit);
    }

    async fn is_suspicious_pattern(&self, transaction: &Transaction) -> GuardianResult<bool> {
        // Check for round numbers (potential indicator of automated/scripted behavior)
        if transaction.amount.fract() == 0.0 && transaction.amount >= 1000.0 {
            return Ok(true);
        }

        // Check for unusual recipients (simplified check)
        if transaction.recipient.len() < 10 || transaction.recipient.contains("unknown") {
            return Ok(true);
        }

        // Additional pattern checks would go here
        Ok(false)
    }

    pub fn reset_daily_spending(&mut self) {
        self.daily_spending.clear();
    }

    pub fn get_spending_summary(&self, ai_system_id: &str) -> Option<SpendingSummary> {
        Some(SpendingSummary {
            ai_system_id: ai_system_id.to_string(),
            daily_spent: *self.daily_spending.get(ai_system_id).unwrap_or(&0.0),
            daily_limit: *self.daily_limits.get(ai_system_id).unwrap_or(&0.0),
            transaction_limit: *self.spending_limits.get(ai_system_id).unwrap_or(&0.0),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpendingSummary {
    pub ai_system_id: String,
    pub daily_spent: f64,
    pub daily_limit: f64,
    pub transaction_limit: f64,
}