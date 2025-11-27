import random
import onnxruntime
import numpy as np

class QNetwork:
    def __init__(self, num_nodes, model_path='Q_Layered_Network/dqn_node_model.onnx'):
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
            print(f"ONNX model loaded from {self.model_path}")
        except Exception as e:
            print(f"Error loading ONNX model: {e}")
            self.session = None

    def _initialize_network(self):
        print(f"Initializing Q-network with {self.num_nodes} nodes.")
        for i in range(self.num_nodes):
            self.nodes.append({'id': i, 'x': random.random() * 800, 'y': random.random() * 600, 'state': 0}) # 0: inactive, 1: unstable

    def _get_state_representation(self):
        # Return a 1D array of the node states
        return np.array([node['state'] for node in self.nodes], dtype=np.float32)

    def update_state(self):
        if self.game_state['game_over']:
            return

        # Use the ONNX model to select an action (which node to make unstable)
        if self.session:
            current_state = self._get_state_representation()
            # The input name and shape should match the model.
            # I'm assuming the input name is 'input' and the shape is (1, num_nodes).
            # This might need to be adjusted based on the actual model.
            try:
                input_name = self.session.get_inputs()[0].name
                input_shape = self.session.get_inputs()[0].shape
                # Ensure the input shape is correct, even if it is dynamic.
                # Here we are assuming a 1D array that will be reshaped.
                # This is a major assumption and likely needs to be refined.
                if len(input_shape) > 1 and input_shape[1] == self.num_nodes:
                     current_state = current_state.reshape(input_shape)

                result = self.session.run(None, {input_name: current_state})
                action = np.argmax(result[0])
                
                # Make the selected node unstable
                if self.nodes[action]['state'] == 0:
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
            if node['state'] == 0:
                new_node['state'] = 'inactive'
            elif node['state'] == 1:
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


# Instantiate the network
q_network_instance = QNetwork(num_nodes=100)