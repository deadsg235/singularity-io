use crate::*;
use std::collections::VecDeque;

pub struct SystemMonitor {
    activity_log: VecDeque<ActivityRecord>,
    alert_thresholds: AlertThresholds,
    system_health: SystemHealth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityRecord {
    pub timestamp: DateTime<Utc>,
    pub ai_system_id: String,
    pub activity_type: String,
    pub details: serde_json::Value,
    pub risk_level: RiskLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThresholds {
    pub high_risk_actions_per_hour: u32,
    pub failed_approvals_per_day: u32,
    pub capability_expansion_attempts: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealth {
    pub total_actions_monitored: u64,
    pub actions_blocked: u64,
    pub human_approvals_required: u64,
    pub ethical_violations: u64,
    pub uptime_hours: f64,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            activity_log: VecDeque::with_capacity(10000),
            alert_thresholds: AlertThresholds {
                high_risk_actions_per_hour: 10,
                failed_approvals_per_day: 5,
                capability_expansion_attempts: 3,
            },
            system_health: SystemHealth {
                total_actions_monitored: 0,
                actions_blocked: 0,
                human_approvals_required: 0,
                ethical_violations: 0,
                uptime_hours: 0.0,
            },
        }
    }

    pub async fn log_activity(&mut self, record: ActivityRecord) {
        self.activity_log.push_back(record.clone());
        
        // Keep only last 10000 records
        if self.activity_log.len() > 10000 {
            self.activity_log.pop_front();
        }

        // Update system health metrics
        self.system_health.total_actions_monitored += 1;
        
        match record.activity_type.as_str() {
            "action_blocked" => self.system_health.actions_blocked += 1,
            "human_approval_required" => self.system_health.human_approvals_required += 1,
            "ethical_violation" => self.system_health.ethical_violations += 1,
            _ => {}
        }

        // Check for alert conditions
        self.check_alert_conditions().await;
    }

    async fn check_alert_conditions(&self) {
        let now = Utc::now();
        let one_hour_ago = now - chrono::Duration::hours(1);
        
        let high_risk_count = self.activity_log
            .iter()
            .filter(|record| {
                record.timestamp > one_hour_ago && 
                matches!(record.risk_level, RiskLevel::High | RiskLevel::Critical)
            })
            .count() as u32;

        if high_risk_count > self.alert_thresholds.high_risk_actions_per_hour {
            log::warn!("Alert: High risk actions per hour exceeded: {}", high_risk_count);
        }
    }

    pub fn get_system_health(&self) -> &SystemHealth {
        &self.system_health
    }

    pub fn get_recent_activity(&self, hours: i64) -> Vec<ActivityRecord> {
        let cutoff = Utc::now() - chrono::Duration::hours(hours);
        self.activity_log
            .iter()
            .filter(|record| record.timestamp > cutoff)
            .cloned()
            .collect()
    }

    pub fn get_ai_system_activity(&self, ai_system_id: &str, hours: i64) -> Vec<ActivityRecord> {
        let cutoff = Utc::now() - chrono::Duration::hours(hours);
        self.activity_log
            .iter()
            .filter(|record| {
                record.ai_system_id == ai_system_id && record.timestamp > cutoff
            })
            .cloned()
            .collect()
    }

    pub async fn generate_report(&self) -> SystemReport {
        let now = Utc::now();
        let last_24h = now - chrono::Duration::hours(24);
        
        let recent_activity = self.activity_log
            .iter()
            .filter(|record| record.timestamp > last_24h)
            .collect::<Vec<_>>();

        let risk_distribution = self.calculate_risk_distribution(&recent_activity);
        let top_ai_systems = self.get_most_active_ai_systems(&recent_activity);

        SystemReport {
            generated_at: now,
            period_hours: 24,
            total_activities: recent_activity.len() as u64,
            risk_distribution,
            top_ai_systems,
            system_health: self.system_health.clone(),
        }
    }

    fn calculate_risk_distribution(&self, activities: &[&ActivityRecord]) -> HashMap<RiskLevel, u32> {
        let mut distribution = HashMap::new();
        
        for activity in activities {
            *distribution.entry(activity.risk_level.clone()).or_insert(0) += 1;
        }
        
        distribution
    }

    fn get_most_active_ai_systems(&self, activities: &[&ActivityRecord]) -> Vec<(String, u32)> {
        let mut system_counts = HashMap::new();
        
        for activity in activities {
            *system_counts.entry(activity.ai_system_id.clone()).or_insert(0) += 1;
        }
        
        let mut sorted: Vec<_> = system_counts.into_iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));
        sorted.into_iter().take(10).collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemReport {
    pub generated_at: DateTime<Utc>,
    pub period_hours: i64,
    pub total_activities: u64,
    pub risk_distribution: HashMap<RiskLevel, u32>,
    pub top_ai_systems: Vec<(String, u32)>,
    pub system_health: SystemHealth,
}