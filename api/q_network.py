import random
import onnxruntime
import numpy as np

class QNetwork:
    def __init__(self, num_nodes=128, model_path='Q_Layered_Network/dqn_node_model.onnx'): # Default to 128 nodes
        self.num_nodes = num_nodes
        self.nodes = []
        self.connections = []
        self.game_state = {
            'score': 0,
            'game_over': False,
            'unstable_nodes': 0
        }
        self.model_path = model_path
        self.session = None
        self._initialize_network()
        self._load_model()

    def _load_model(self):
        try:
            self.session = onnxruntime.InferenceSession(self.model_path)
            input_name = self.session.get_inputs()[0].name
            input_shape = self.session.get_inputs()[0].shape
            print(f"ONNX model loaded from {self.model_path}")
            print(f"Model Input Name: {input_name}")
            print(f"Model Input Shape: {input_shape}")
            # Verify that the model's expected input size matches our num_nodes
            if len(input_shape) == 2 and input_shape[1] != self.num_nodes:
                 print(f"Warning: Model input size {input_shape[1]} does not match QNetwork num_nodes {self.num_nodes}.")
                 print("Attempting to proceed, but unexpected behavior may occur.")
        except Exception as e:
            print(f"Error loading ONNX model: {e}")
            self.session = None

    def _initialize_network(self):
        print(f"Initializing Q-network with {self.num_nodes} nodes.")
        for i in range(self.num_nodes):
            self.nodes.append({'id': i, 'x': random.random() * 800, 'y': random.random() * 600, 'state': 0}) # 0: inactive, 1: unstable

    def _get_state_representation(self):
        # Return a 1D array of the node states, padded or truncated to self.num_nodes
        state_array = np.array([node['state'] for node in self.nodes], dtype=np.float32)
        
        # Pad with zeros if less than self.num_nodes (which should be 128)
        if len(state_array) < self.num_nodes:
            padded_state = np.pad(state_array, (0, self.num_nodes - len(state_array)), 'constant')
            return padded_state
        # Truncate if more than self.num_nodes (shouldn't happen if num_nodes is correctly set)
        elif len(state_array) > self.num_nodes:
            return state_array[:self.num_nodes]
        else:
            return state_array

    def update_state(self):
        if self.game_state['game_over']:
            return

        if self.session:
            current_state = self._get_state_representation()
            
            # Reshape the state to (1, 128) as required by the ONNX model
            model_input = current_state.reshape(1, self.num_nodes)
            
            try:
                input_name = self.session.get_inputs()[0].name
                result = self.session.run(None, {input_name: model_input})
                action = np.argmax(result[0])
                
                # Make the selected node unstable, ensuring 'action' is within bounds
                if 0 <= action < self.num_nodes and self.nodes[action]['state'] == 0:
                    self.nodes[action]['state'] = 1 # unstable
                    self.game_state['unstable_nodes'] += 1

            except Exception as e:
                print(f"Error during model inference: {e}")
                # Fallback to random action if model fails
                self._randomly_make_node_unstable()

        else:
            # Fallback to random action if model is not loaded
            self._randomly_make_node_unstable()


        # Check for game over
        if self.game_state['unstable_nodes'] > self.num_nodes * 0.2:
            self.game_state['game_over'] = True
            print("Game Over!")

    def _randomly_make_node_unstable(self):
        if random.random() < 0.1: # 10% chance per update
            node_id = random.randint(0, self.num_nodes - 1)
            if self.nodes[node_id]['state'] == 0:
                self.nodes[node_id]['state'] = 1
                self.game_state['unstable_nodes'] += 1

    def get_network_state(self):
        # Convert numeric state to string for frontend
        frontend_nodes = []
        for node in self.nodes:
            new_node = node.copy()
            if new_node['state'] == 0:
                new_node['state'] = 'inactive'
            elif new_node['state'] == 1:
                new_node['state'] = 'unstable'
            frontend_nodes.append(new_node)

        return {
            "nodes": frontend_nodes,
            "connections": self.connections,
            "game_state": self.game_state
        }

    def perturb_node(self, node_id: int):
        if 0 <= node_id < self.num_nodes:
            if self.nodes[node_id]['state'] == 1: # unstable
                self.nodes[node_id]['state'] = 0 # inactive
                self.game_state['score'] += 10
                self.game_state['unstable_nodes'] -= 1
                print(f"Stabilized node {node_id}. Score: {self.game_state['score']}")

    def reset_game(self):
        self.game_state['score'] = 0
        self.game_state['game_over'] = False
        self.game_state['unstable_nodes'] = 0
        self._initialize_network()


# Instantiate the network with the correct number of nodes
q_network_instance = QNetwork(num_nodes=128)