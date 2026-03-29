import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import asyncio

@dataclass
class AnomalyScore:
    timestamp: datetime
    feature_vector: List[float]
    anomaly_score: float
    is_anomaly: bool
    confidence: float

class ThreatIntelligence:
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_history = []
        self.threat_patterns = {
            'ddos': {'packet_rate_threshold': 10000, 'connection_spike': 5.0},
            'port_scan': {'unique_ports_threshold': 100, 'time_window': 60},
            'data_exfiltration': {'upload_ratio_threshold': 10.0, 'volume_threshold': 1000000000},
            'brute_force': {'failed_attempts_threshold': 50, 'time_window': 300}
        }
        
    def extract_features(self, network_data: Dict) -> List[float]:
        """Extract features for anomaly detection"""
        features = [
            network_data.get('packet_rate', 0),
            network_data.get('connection_count', 0),
            network_data.get('bytes_sent', 0),
            network_data.get('bytes_received', 0),
            network_data.get('unique_ips', 0),
            network_data.get('unique_ports', 0),
            network_data.get('failed_connections', 0),
            network_data.get('protocol_diversity', 0),
            network_data.get('geographic_diversity', 0),
            network_data.get('time_variance', 0)
        ]
        return features
        
    def train_model(self, historical_data: List[Dict]):
        """Train the anomaly detection model"""
        if len(historical_data) < 50:
            return False
            
        feature_matrix = np.array([self.extract_features(data) for data in historical_data])
        
        # Handle missing values
        feature_matrix = np.nan_to_num(feature_matrix)
        
        # Scale features
        self.scaler.fit(feature_matrix)
        scaled_features = self.scaler.transform(feature_matrix)
        
        # Train isolation forest
        self.isolation_forest.fit(scaled_features)
        self.is_trained = True
        
        return True
        
    def detect_anomaly(self, network_data: Dict) -> AnomalyScore:
        """Detect anomalies in network data"""
        features = self.extract_features(network_data)
        
        if not self.is_trained:
            # Use rule-based detection if model not trained
            return self._rule_based_detection(features, network_data)
            
        # Scale features
        scaled_features = self.scaler.transform([features])
        
        # Get anomaly score
        anomaly_score = self.isolation_forest.decision_function(scaled_features)[0]
        is_anomaly = self.isolation_forest.predict(scaled_features)[0] == -1
        
        # Calculate confidence based on distance from decision boundary
        confidence = min(1.0, abs(anomaly_score) / 0.5)
        
        return AnomalyScore(
            timestamp=datetime.now(),
            feature_vector=features,
            anomaly_score=anomaly_score,
            is_anomaly=is_anomaly,
            confidence=confidence
        )
        
    def _rule_based_detection(self, features: List[float], network_data: Dict) -> AnomalyScore:
        """Fallback rule-based anomaly detection"""
        anomaly_indicators = []
        
        # Check for DDoS patterns
        if features[0] > self.threat_patterns['ddos']['packet_rate_threshold']:
            anomaly_indicators.append('high_packet_rate')
            
        # Check for port scanning
        if features[5] > self.threat_patterns['port_scan']['unique_ports_threshold']:
            anomaly_indicators.append('port_scan')
            
        # Check for data exfiltration
        if features[2] > 0 and features[3] > 0:
            ratio = features[2] / features[3] if features[3] > 0 else 0
            if ratio > self.threat_patterns['data_exfiltration']['upload_ratio_threshold']:
                anomaly_indicators.append('data_exfiltration')
                
        # Check for brute force
        if features[6] > self.threat_patterns['brute_force']['failed_attempts_threshold']:
            anomaly_indicators.append('brute_force')
            
        is_anomaly = len(anomaly_indicators) > 0
        anomaly_score = -len(anomaly_indicators) * 0.3 if is_anomaly else 0.1
        confidence = len(anomaly_indicators) / 4.0
        
        return AnomalyScore(
            timestamp=datetime.now(),
            feature_vector=features,
            anomaly_score=anomaly_score,
            is_anomaly=is_anomaly,
            confidence=confidence
        )
        
    def update_threat_patterns(self, new_patterns: Dict):
        """Update threat detection patterns"""
        self.threat_patterns.update(new_patterns)
        
    def get_threat_summary(self, time_window: int = 3600) -> Dict:
        """Get threat summary for the last time window (seconds)"""
        cutoff_time = datetime.now() - timedelta(seconds=time_window)
        
        recent_anomalies = [
            score for score in self.feature_history 
            if score.timestamp > cutoff_time and score.is_anomaly
        ]
        
        if not recent_anomalies:
            return {
                'total_anomalies': 0,
                'avg_confidence': 0.0,
                'threat_level': 'low',
                'recommendations': ['Continue normal monitoring']
            }
            
        avg_confidence = sum(score.confidence for score in recent_anomalies) / len(recent_anomalies)
        
        threat_level = 'critical' if avg_confidence > 0.8 else \
                      'high' if avg_confidence > 0.6 else \
                      'medium' if avg_confidence > 0.4 else 'low'
                      
        recommendations = self._generate_recommendations(recent_anomalies, threat_level)
        
        return {
            'total_anomalies': len(recent_anomalies),
            'avg_confidence': avg_confidence,
            'threat_level': threat_level,
            'recommendations': recommendations,
            'time_window': time_window
        }
        
    def _generate_recommendations(self, anomalies: List[AnomalyScore], threat_level: str) -> List[str]:
        """Generate security recommendations based on detected anomalies"""
        recommendations = []
        
        if threat_level == 'critical':
            recommendations.extend([
                'Activate emergency response protocol',
                'Block suspicious IP ranges',
                'Enable enhanced monitoring',
                'Notify security team immediately'
            ])
        elif threat_level == 'high':
            recommendations.extend([
                'Increase monitoring frequency',
                'Review firewall rules',
                'Check for unauthorized access',
                'Prepare incident response'
            ])
        elif threat_level == 'medium':
            recommendations.extend([
                'Monitor traffic patterns closely',
                'Review recent system changes',
                'Update threat signatures'
            ])
        else:
            recommendations.append('Continue normal monitoring')
            
        return recommendations

# Global threat intelligence instance
threat_intel = ThreatIntelligence()

async def analyze_network_traffic(network_data: Dict) -> Dict:
    """Analyze network traffic for threats"""
    try:
        # Detect anomalies
        anomaly_result = threat_intel.detect_anomaly(network_data)
        
        # Store in history
        threat_intel.feature_history.append(anomaly_result)
        
        # Keep only last 1000 records
        threat_intel.feature_history = threat_intel.feature_history[-1000:]
        
        # Get threat summary
        threat_summary = threat_intel.get_threat_summary()
        
        return {
            'anomaly_detected': anomaly_result.is_anomaly,
            'anomaly_score': anomaly_result.anomaly_score,
            'confidence': anomaly_result.confidence,
            'threat_summary': threat_summary,
            'timestamp': anomaly_result.timestamp.isoformat()
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'anomaly_detected': False,
            'confidence': 0.0
        }

def train_threat_model(historical_data: List[Dict]) -> bool:
    """Train the threat detection model with historical data"""
    return threat_intel.train_model(historical_data)