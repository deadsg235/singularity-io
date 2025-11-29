import json
import torch
import torch.nn as nn
import numpy as np
import gym
from .DQN_Node_Agent import DQNAgent

# Define the reasoning environment
class ReasoningEnv(gym.Env):
    def __init__(self, training_data_path):
        super(ReasoningEnv, self).__init__()
        with open(training_data_path, 'r', encoding='utf-8') as f:
            self.training_data = json.load(f)

        self.current_index = 0
        self.action_space = gym.spaces.Discrete(10)  # Example: 10 possible actions
        self.observation_space = gym.spaces.Box(low=0, high=1, shape=(1, 128), dtype=np.float32)

        # Simple word to index mapping
        self.word_to_idx = {}
        self.idx_to_word = []
        self.build_vocab()

    def build_vocab(self):
        words = set()
        for item in self.training_data:
            for word in item['content'].split():
                words.add(word)
        self.idx_to_word = list(words)
        self.word_to_idx = {word: i for i, word in enumerate(self.idx_to_word)}

    def text_to_state(self, text):
        state = np.zeros(128)
        for i, word in enumerate(text.split()):
            if i < 128 and word in self.word_to_idx:
                state[i] = self.word_to_idx[word]
        return torch.tensor(state, dtype=torch.float32).view(1, -1)

    def reset(self):
        self.current_index = 0
        if not self.training_data:
            return torch.zeros(1, 128, dtype=torch.float32)
        return self.text_to_state(self.training_data[self.current_index]['content'])

    def step(self, action):
        # For simplicity, the reward is 1 if the action is correct, 0 otherwise
        # In a real scenario, this would be more complex
        reward = 1 if action == self.current_index % self.action_space.n else 0
        self.current_index += 1
        done = self.current_index >= len(self.training_data)
        if not done:
            next_state = self.text_to_state(self.training_data[self.current_index]['content'])
        else:
            next_state = torch.zeros(1, 128, dtype=torch.float32)

        return next_state, reward, done, {}

# Main training loop for reasoning DQN
def train_reasoning_dqn():
    training_data_path = 'api/Q_Layered_Network/training_data/training_data.json'
    try:
        env = ReasoningEnv(training_data_path)
    except FileNotFoundError:
        print(f"Error: Training data file not found at {training_data_path}")
        return
    
    state_size = 128
    action_size = env.action_space.n
    agent = DQNAgent(state_size, action_size)

    episodes = 100
    epsilon = 1.0
    epsilon_decay = 0.995
    min_epsilon = 0.01

    for episode in range(episodes):
        state = env.reset()
        total_reward = 0
        done = False

        while not done:
            action = agent.select_action(state.numpy(), epsilon) # Pass numpy array to select_action
            next_state, reward, done, _ = env.step(action)
            agent.buffer.add(state, action, reward, next_state, done)
            agent.train()
            state = next_state
            total_reward += reward

        epsilon = max(min_epsilon, epsilon * epsilon_decay)

        print(f"Episode {episode + 1}, Total Reward: {total_reward}")

    agent.save("reasoning_dqn_model.pth")

if __name__ == "__main__":
    train_reasoning_dqn()
