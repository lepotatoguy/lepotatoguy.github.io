#!/bin/bash
#SBATCH --job-name=test_lka
#SBATCH --output=test_output_%j.log
#SBATCH --error=test_error_%j.log
#SBATCH --time=00:00:50
#SBATCH --partition=gpu-t4
#SBATCH --gpus=1
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --mem=8G
#SBATCH --cpus-per-task=1
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=joyanta@udel.edu

# Load anaconda
vpkg_require cuda/11.3.1
vpkg_require anaconda/2024.02:python3
vpkg_require gcc/10.1

# Activate your conda environment
# Make sure to create this environment before
conda activate d_lka_net_2d

# Run the test script
python test_gpu.py
