
import json
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from collections import deque, namedtuple
import random
import gym

# Define the Q-network
class QNetwork(nn.Module):
    def __init__(self, state_size, action_size):
        super(QNetwork, self).__init__()
        self.fc1 = nn.Linear(state_size, 128)
        self.fc2 = nn.Linear(128, 128)
        self.fc3 = nn.Linear(128, action_size)

    def forward(self, state):
        x = torch.relu(self.fc1(state))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)

# Define the replay buffer
class ReplayBuffer:
    def __init__(self, buffer_size):
        self.buffer = deque(maxlen=buffer_size)
        self.experience = namedtuple("Experience", field_names=["state", "action", "reward", "next_state", "done"])

    def add(self, state, action, reward, next_state, done):
        experience = self.experience(state, action, reward, next_state, done)
        self.buffer.append(experience)

    def sample(self, batch_size):
        return random.sample(self.buffer, k=batch_size)

    def __len__(self):
        return len(self.buffer)

# Define the DQN agent
class DQNAgent:
    def __init__(self, state_size, action_size, learning_rate=0.001, gamma=0.99, buffer_size=10000, batch_size=64, tau=0.001):
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.batch_size = batch_size
        self.tau = tau

        self.q_network = QNetwork(state_size, action_size)
        self.target_network = QNetwork(state_size, action_size)
        self.target_network.load_state_dict(self.q_network.state_dict())
        self.optimizer = optim.Adam(self.q_network.parameters(), lr=learning_rate)
        self.buffer = ReplayBuffer(buffer_size)

    def select_action(self, state, epsilon):
        if np.random.rand() < epsilon:
            return np.random.choice(self.action_size)
        else:
            with torch.no_grad():
                q_values = self.q_network(state)
                return torch.argmax(q_values).item()

    def train(self):
        if len(self.buffer) < self.batch_size:
            return

        experiences = self.buffer.sample(self.batch_size)
        states, actions, rewards, next_states, dones = zip(*experiences)

        states = torch.cat(states)
        actions = torch.tensor(actions, dtype=torch.int64).view(-1, 1)
        rewards = torch.tensor(rewards, dtype=torch.float32).view(-1, 1)
        next_states = torch.cat(next_states)
        dones = torch.tensor(dones, dtype=torch.float32).view(-1, 1)

        q_values = self.q_network(states).gather(1, actions)

        next_q_values = self.target_network(next_states).detach()
        max_next_q_values = torch.max(next_q_values, dim=1, keepdim=True).values
        td_targets = rewards + self.gamma * (1 - dones) * max_next_q_values

        loss = nn.MSELoss()(q_values, td_targets)

        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        self.update_target_network()

    def update_target_network(self):
        for target_param, local_param in zip(self.target_network.parameters(), self.q_network.parameters()):
            target_param.data.copy_(self.tau * local_param.data + (1.0 - self.tau) * target_param.data)

    def save(self, path):
        torch.save(self.q_network.state_dict(), path)

    def load(self, path):
        self.q_network.load_state_dict(torch.load(path))
        self.target_network.load_state_dict(torch.load(path))

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
    training_data_path = 'C:/Users/deads/OneDrive/Documents/AGI/Q_Layered_Network/training_data/training_data.json'
    env = ReasoningEnv(training_data_path)
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
            action = agent.select_action(state, epsilon)
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
