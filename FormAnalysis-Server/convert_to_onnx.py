import os
import json
import numpy as np
import xgboost as xgb
from onnxmltools.convert import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType

MODELS_DIR = "./models_v2"
ONNX_DIR   = "./models_onnx"
MANIFEST   = "./model_meta_v2/manifest.json"

os.makedirs(ONNX_DIR, exist_ok=True)

with open(MANIFEST) as f:
    manifest = json.load(f)

feature_dim = manifest["feature_dim"]  # 124
results = {}

for exercise, info in manifest["exercises"].items():
    model_path = os.path.join(MODELS_DIR, info["model_file"])
    print(f"Converting: {exercise}...")

    # Load as Booster
    booster = xgb.Booster()
    booster.load_model(model_path)

    # Convert to ONNX
    initial_type = [("float_input", FloatTensorType([None, feature_dim]))]
    onnx_model = convert_xgboost(booster, initial_types=initial_type)

    # Save
    onnx_filename = info["model_file"].replace("_xgb_v2.json", "_v2.onnx")
    onnx_path = os.path.join(ONNX_DIR, onnx_filename)
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    results[exercise] = onnx_filename
    print(f"  ✅ Saved: {onnx_filename}")

# Save updated manifest
onnx_manifest = {
    "version": "v2_onnx",
    "feature_dim": feature_dim,
    "exercises": {}
}
for exercise, info in manifest["exercises"].items():
    onnx_manifest["exercises"][exercise] = {
        "model_file": results[exercise],
        "cv_accuracy": info["cv_accuracy"],
        "n_original": info["n_original"],
    }

with open("./model_meta_v2/manifest_onnx.json", "w") as f:
    json.dump(onnx_manifest, f, indent=2)

print(f"\nDone — {len(results)} models converted to {ONNX_DIR}/")
print("Manifest saved to model_meta_v2/manifest_onnx.json")