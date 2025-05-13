import os
import socket
import torch
import subprocess

print("=== SYSTEM INFO ===")
print(f"Hostname: {socket.gethostname()}")
print(f"Fully Qualified Domain Name: {socket.getfqdn()}")

# Conda environment check
conda_env = os.environ.get("CONDA_DEFAULT_ENV", "Not detected")
print(f"Conda environment: {conda_env}")

# Python and PyTorch info
print("\n=== PYTHON & TORCH INFO ===")
print(f"Python Executable: {os.sys.executable}")
print(f"Python Version: {os.sys.version}")
print(f"PyTorch Version: {torch.__version__}")
print(f"CUDA Built With: {torch.version.cuda}")
print(f"CUDA available (torch.cuda.is_available()): {torch.cuda.is_available()}")

# Check GPU
if torch.cuda.is_available():
    print("\n=== GPU INFO ===")
    print(f"GPU Name: {torch.cuda.get_device_name(0)}")
    print(f"CUDA Runtime Version (from PyTorch): {torch.version.cuda}")
    print(f"cuDNN Version: {torch.backends.cudnn.version()}")
else:
    print("\n=== GPU DIAGNOSTICS ===")
    print("PyTorch could not detect a GPU.")
    
    # Optional: Try running nvidia-smi if available
    print("\nTrying to run `nvidia-smi`...")
    try:
        output = subprocess.check_output(["nvidia-smi"], stderr=subprocess.STDOUT, universal_newlines=True)
        print(output)
    except Exception as e:
        print("nvidia-smi failed or is not available in this environment.")
        print(f"Error: {e}")

