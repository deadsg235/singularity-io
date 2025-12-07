import random
import onnxruntime
import numpy as np
import os

class QNetwork:
    def __init__(self, num_nodes=128, model_path=None): # Default to 128 nodes
        if model_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, 'Q_Layered_Network', 'dqn_node_model.onnx')
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
        try:
            state_array = np.array([node['state'] for node in self.nodes], dtype=np.float32)
            
            if len(state_array) < self.num_nodes:
                padded_state = np.pad(state_array, (0, self.num_nodes - len(state_array)), 'constant')
                return padded_state
            elif len(state_array) > self.num_nodes:
                return state_array[:self.num_nodes]
            else:
                return state_array
        except Exception as e:
            print(f"Error in _get_state_representation: {e}")
            raise # Re-raise to get full traceback if this is the issue

    def update_state(self):
        if self.game_state['game_over']:
            return

        if self.session:
            try:
                current_state = self._get_state_representation()
                print(f"Current State before reshape: {current_state.shape} -> {current_state}")
                
                model_input = current_state.reshape(1, self.num_nodes)
                print(f"Model Input after reshape: {model_input.shape} -> {model_input}")
                
                input_name = self.session.get_inputs()[0].name
                print(f"ONNX Input Name: {input_name}")
                
                result = self.session.run(None, {input_name: model_input})
                print(f"ONNX Model Output (raw): {result[0]}")
                action = np.argmax(result[0])
                print(f"Selected Action (node ID to make unstable): {action}")
                
                if 0 <= action < self.num_nodes:
                    if self.nodes[action]['state'] == 0:
                        self.nodes[action]['state'] = 1 # unstable
                        self.game_state['unstable_nodes'] += 1
                        print(f"Node {action} made unstable by ONNX model.")
                else:
                    print(f"Warning: ONNX model selected an out-of-bounds action: {action}. Falling back to random.")
                    self._randomly_make_node_unstable()

            except Exception as e:
                print(f"Critical Error during ONNX model inference or state update: {e}")
                import traceback
                traceback.print_exc() # Print full traceback
                self._randomly_make_node_unstable() # Fallback
        else:
            print("ONNX model session not loaded. Falling back to random action.")
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
                print(f"Node {node_id} randomly made unstable.")

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