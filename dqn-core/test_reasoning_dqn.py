
import torch
import os
import time
from Reasoning_DQN import DQNAgent, QNetwork, ReasoningEnv

def test_dqn_calculation():
    # Define parameters used by the model
    state_size = 128
    action_size = 10 
    
    # Path to the saved model and training data
    model_path = "C:/Users/deads/OneDrive/Documents/AGI/Q_Layered_Network/reasoning_dqn_model.pth"
    training_data_path = 'C:/Users/deads/OneDrive/Documents/AGI/Q_Layered_Network/training_data/training_data.json'

    # 1. Check if the model file exists
    assert os.path.exists(model_path), f"Model file not found at {model_path}"

    # 2. Instantiate the DQNAgent and ReasoningEnv
    agent = DQNAgent(state_size, action_size)
    env = ReasoningEnv(training_data_path)

    # 3. Load the trained model
    try:
        agent.load(model_path)
    except Exception as e:
        assert False, f"Failed to load the model: {e}"

    # 4. Create a sample input tensor
    # The input should be a tensor of shape (1, state_size)
    sample_input = torch.randn(1, state_size)

    # 5. Pass the input to the model to get the Q-values
    with torch.no_grad():
        start_time = time.time()
        q_values = agent.q_network(sample_input)
        end_time = time.time()

    # 6. Verify the output
    # The output should be a tensor of shape (1, action_size)
    assert q_values.shape == (1, action_size), f"Expected output shape of (1, {action_size}), but got {q_values.shape}"

    # 7. Decode the action with the highest Q-value
    action_index = torch.argmax(q_values).item()
    decoded_action = env.idx_to_word[action_index]

    calculation_time = end_time - start_time
    print("DQN calculation test passed successfully!")
    print(f"Output Q-values: {q_values}")
    print(f"Decoded action: {decoded_action}")
    print(f"Calculation time: {calculation_time:.6f} seconds")

if __name__ == "__main__":
    test_dqn_calculation()
