use crate::*;

pub struct EthicsEngine {
    principles: Vec<EthicalPrinciple>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthicalPrinciple {
    pub name: String,
    pub weight: f64,
    pub evaluator: String,
}

impl EthicsEngine {
    pub fn new() -> Self {
        Self {
            principles: vec![
                EthicalPrinciple {
                    name: "human_autonomy".to_string(),
                    weight: 1.0,
                    evaluator: "autonomy_check".to_string(),
                },
                EthicalPrinciple {
                    name: "transparency".to_string(),
                    weight: 0.8,
                    evaluator: "transparency_check".to_string(),
                },
                EthicalPrinciple {
                    name: "beneficence".to_string(),
                    weight: 0.9,
                    evaluator: "beneficence_check".to_string(),
                },
                EthicalPrinciple {
                    name: "non_maleficence".to_string(),
                    weight: 1.0,
                    evaluator: "harm_check".to_string(),
                },
            ]
        }
    }

    pub async fn evaluate_action(&self, action: &AIAction) -> GuardianResult<f64> {
        let mut total_score = 0.0;
        let mut total_weight = 0.0;

        for principle in &self.principles {
            let score = self.evaluate_principle(action, principle).await?;
            total_score += score * principle.weight;
            total_weight += principle.weight;
        }

        Ok(total_score / total_weight)
    }

    async fn evaluate_principle(&self, action: &AIAction, principle: &EthicalPrinciple) -> GuardianResult<f64> {
        match principle.evaluator.as_str() {
            "autonomy_check" => self.check_human_autonomy(action).await,
            "transparency_check" => self.check_transparency(action).await,
            "beneficence_check" => self.check_beneficence(action).await,
            "harm_check" => self.check_non_maleficence(action).await,
            _ => Ok(0.5), // Neutral score for unknown evaluators
        }
    }

    async fn check_human_autonomy(&self, action: &AIAction) -> GuardianResult<f64> {
        // Check if action respects human autonomy
        let manipulation_keywords = ["manipulate", "coerce", "deceive", "trick"];
        let action_text = format!("{} {}", action.action_type, action.payload.to_string());
        
        for keyword in manipulation_keywords {
            if action_text.to_lowercase().contains(keyword) {
                return Ok(0.0); // Violation detected
            }
        }
        
        Ok(1.0) // No violation
    }

    async fn check_transparency(&self, action: &AIAction) -> GuardianResult<f64> {
        // Check if action is transparent and explainable
        if action.payload.get("explanation").is_some() {
            Ok(1.0)
        } else if action.payload.get("reasoning").is_some() {
            Ok(0.8)
        } else {
            Ok(0.3) // Low transparency
        }
    }

    async fn check_beneficence(&self, action: &AIAction) -> GuardianResult<f64> {
        // Check if action benefits humans
        let beneficial_keywords = ["help", "assist", "improve", "benefit", "support"];
        let harmful_keywords = ["harm", "damage", "hurt", "exploit"];
        
        let action_text = format!("{} {}", action.action_type, action.payload.to_string()).to_lowercase();
        
        for keyword in harmful_keywords {
            if action_text.contains(keyword) {
                return Ok(0.0);
            }
        }
        
        for keyword in beneficial_keywords {
            if action_text.contains(keyword) {
                return Ok(1.0);
            }
        }
        
        Ok(0.5) // Neutral
    }

    async fn check_non_maleficence(&self, action: &AIAction) -> GuardianResult<f64> {
        // Check if action avoids harm
        let harm_indicators = ["delete", "destroy", "attack", "exploit", "breach"];
        let action_text = format!("{} {}", action.action_type, action.payload.to_string()).to_lowercase();
        
        for indicator in harm_indicators {
            if action_text.contains(indicator) {
                return Ok(0.0); // Potential harm detected
            }
        }
        
        Ok(1.0) // No harm detected
    }
}