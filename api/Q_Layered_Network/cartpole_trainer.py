from .DQN_Node_Agent import DQNAgent
import torch
import gym

class ReasoningModule:
    """
    A high-level module that encapsulates the reasoning process.
    It uses a DQNAgent to interact with the environment and learn.
    """
    def __init__(self, state_size, action_size):
        self.agent = DQNAgent(state_size, action_size)
        self.env = gym.make("CartPole-v1")  # Replace with your environment

    def train(self, episodes=1000):
        """
        Trains the underlying DQNAgent.
        """
        epsilon = 1.0
        epsilon_decay = 0.995
        min_epsilon = 0.01

        for episode in range(episodes):
            state = self.env.reset()
            state = torch.tensor(state, dtype=torch.float32).view(1, -1)
            total_reward = 0
            done = False

            while not done:
                action = self.agent.select_action(state, epsilon)
                next_state, reward, done, _ = self.env.step(action)
                next_state = torch.tensor(next_state, dtype=torch.float32).view(1, -1)

                self.agent.buffer.add(state, action, reward, next_state, done)
                self.agent.train()

                state = next_state
                total_reward += reward

            epsilon = max(min_epsilon, epsilon * epsilon_decay)
            print(f"Episode {episode + 1}, Total Reward: {total_reward}")

def train_layered_dqn():
    """
    Initializes and runs the training process for the layered DQN system.
    """
    state_size = 4  # Replace with your environment's state size
    action_size = 2  # Replace with your environment's action size

    reasoning_module = ReasoningModule(state_size, action_size)
    reasoning_module.train()

if __name__ == "__main__":
    train_layered_dqn()
