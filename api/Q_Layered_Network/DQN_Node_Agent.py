import torch
import torch.nn as nn
import torch.optim as optim
import torch.onnx
from torch.autograd import Variable
import numpy as np
from collections import namedtuple, deque
import random

class QNetwork(nn.Module):
    """Neural Network for approximating Q-values."""
    def __init__(self, state_size, action_size):
        super(QNetwork, self).__init__()
        self.fc1 = nn.Linear(state_size, 128)
        self.fc2 = nn.Linear(128, 128)
        self.fc3 = nn.Linear(128, action_size)

    def forward(self, state):
        x = torch.relu(self.fc1(state))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)

class ReplayBuffer:
    """Fixed-size buffer to store experience tuples."""
    def __init__(self, buffer_size):
        self.memory = deque(maxlen=buffer_size)
        self.experience = namedtuple("Experience", field_names=["state", "action", "reward", "next_state", "done"])

    def add(self, state, action, reward, next_state, done):
        """Add a new experience to memory."""
        e = self.experience(state, action, reward, next_state, done)
        self.memory.append(e)

    def sample(self, batch_size):
        """Randomly sample a batch of experiences from memory."""
        return random.sample(self.memory, k=batch_size)

    def __len__(self):
        return len(self.memory)

class DQNAgent:
    """Interacts with and learns from the environment."""
    def __init__(self, state_size, action_size, gamma=0.99, batch_size=64, buffer_size=10000, lr=0.001, tau=0.001):
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.batch_size = batch_size
        self.tau = tau

        self.q_network = QNetwork(state_size, action_size)
        self.target_network = QNetwork(state_size, action_size)
        self.target_network.load_state_dict(self.q_network.state_dict())
        self.optimizer = optim.Adam(self.q_network.parameters(), lr=lr)

        self.buffer = ReplayBuffer(buffer_size)

    def select_action(self, state, epsilon):
        """Selects an action using an epsilon-greedy policy."""
        if np.random.rand() < epsilon:
            return np.random.choice(self.action_size)
        else:
            state = torch.tensor(state, dtype=torch.float32).view(1, -1)
            with torch.no_grad():
                q_values = self.q_network(state)
            return torch.argmax(q_values).item()

    def train(self):
        """Train the agent by replaying experiences from the buffer."""
        if len(self.buffer) < self.batch_size:
            return

        experiences = self.buffer.sample(self.batch_size)
        states, actions, rewards, next_states, dones = zip(*experiences)

        states = torch.cat([s for s in states if s is not None])
        actions = torch.tensor(actions, dtype=torch.int64).view(-1, 1)
        rewards = torch.tensor(rewards, dtype=torch.float32).view(-1, 1)
        next_states = torch.cat([s for s in next_states if s is not None])
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
        """Soft update of the target network's weights."""
        for target_param, local_param in zip(self.target_network.parameters(), self.q_network.parameters()):
            target_param.data.copy_(self.tau * local_param.data + (1.0 - self.tau) * target_param.data)

    def save(self, path):
        torch.save(self.q_network.state_dict(), path)

    def load(self, path):
        self.q_network.load_state_dict(torch.load(path))
        self.target_network.load_state_dict(torch.load(path))

    def export_to_onnx(self, onnx_file_path="dqn_node_model.onnx"):
        """Exports the Q-network to ONNX format."""
        dummy_input = Variable(torch.randn(1, self.state_size))
        torch.onnx.export(
            self.q_network,
            dummy_input,
            onnx_file_path,
            verbose=True,
            input_names=["input"],
            output_names=["output"],
        )
