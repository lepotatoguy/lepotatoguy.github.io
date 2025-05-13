#!/bin/bash
#SBATCH --job-name=cisc642_deform_lka
#SBATCH --output=test_output_%j.log
#SBATCH --error=test_error_%j.log
#SBATCH --time=50:00:00
#SBATCH --partition=gpu-t4
#SBATCH --gpus=1
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --mem=8G
#SBATCH --cpus-per-task=1
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=joyanta@udel.edu

# Load environment
vpkg_require cuda/11.3.1
vpkg_require anaconda/2024.02:python3
vpkg_require gcc/10.1

# Optional: activate virtual environment if torch is installed there
# source ~/myenv/bin/activate
#eval "$(conda shell.bash hook)"
conda activate d_lka_net_2d

# Run the test script
#python test_gpu.py
#cd /home/3932/deformableLKA/2D
cd /lustre/uschill-lab/users/3932/home/deformableLKA/2D
#python /home/3932/deformableLKA/2D/train_MaxViT_deform_LKA.py --root_path /home/3932/deformableLKA/2D/data/Synapse/train_npz --test_path /home/3932/deformableLKA/2D/data/Synapse/test_vol_h5 --batch_size 20 --eval_interval 20
python train_MaxViT_deform_LKA.py --root_path ./data/Synapse/train_npz --test_path ./data/Synapse/test_vol_h5 --batch_size 20 --eval_interval 20
