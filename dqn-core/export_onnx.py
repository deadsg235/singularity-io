"""
export_onnx.py — Export the trained DQN checkpoint to ONNX for browser inference.

Run from repo root:
    python dqn-core/export_onnx.py

Produces: web/singularity-frontend/dqn_node_model.onnx
"""

import sys
import pathlib
import importlib.util

_root = pathlib.Path(__file__).parent
sys.path.insert(0, str(_root))
sys.path.insert(0, str(_root.parent))

spec = importlib.util.spec_from_file_location(
    "dqn_core", str(_root / "__init__.py"),
    submodule_search_locations=[str(_root)]
)
mod = importlib.util.module_from_spec(spec)
sys.modules["dqn_core"] = mod
spec.loader.exec_module(mod)

import torch
from dqn_core.network import LayeredQNetwork

CHECKPOINT = str(_root / "reasoning_dqn_model.pth")
OUTPUT     = str(_root.parent / "web" / "singularity-frontend" / "dqn_node_model.onnx")

print("Loading checkpoint:", CHECKPOINT)
ckpt = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)

net = LayeredQNetwork(state_size=128, action_size=10)
net.load_state_dict(ckpt["online"])
net.eval()

dummy = torch.zeros(1, 128)

print("Exporting to ONNX:", OUTPUT)
torch.onnx.export(
    net,
    dummy,
    OUTPUT,
    input_names=["state"],
    output_names=["q_values"],
    dynamic_axes={"state": {0: "batch"}, "q_values": {0: "batch"}},
    opset_version=17,
)
print("Export complete.")

# Quick sanity check
import onnxruntime as ort
import numpy as np
sess = ort.InferenceSession(OUTPUT, providers=["CPUExecutionProvider"])
test_input = np.zeros((1, 128), dtype=np.float32)
test_input[0, 0] = 185.0 / 300.0
test_input[0, 2] = 42.0 / 100.0
q = sess.run(None, {"state": test_input})[0]
actions = ["STRONG_BUY","BUY","WEAK_BUY","HOLD","WEAK_SELL","SELL","STRONG_SELL","INCREASE_POSITION","REDUCE_POSITION","EXIT"]
idx = int(q[0].argmax())
print("ONNX inference test:", actions[idx], "q-values:", [round(float(v), 3) for v in q[0]])
