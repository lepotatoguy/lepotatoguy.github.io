## Why I read it

My CISC642 final project at the University of Delaware (Department of Computer and Information Sciences): I presented the paper and replicated its 2D and 3D experiments. Replication code: [lepotatoguy/deformableLKA](https://github.com/lepotatoguy/deformableLKA).

## Problem

- Medical image segmentation underpins computer-aided diagnosis; precise anatomy can decide whether a patient needs an invasive operation.
- CNNs miss global context, so large organs are segmented poorly.
- Vision transformers capture global context but are expensive and miss local detail.
- Many architectures handle 3D scans slice by slice, ignoring continuity between slices and losing spatial information.

The question: how to capture global context and fine local detail together, efficiently, for both 2D and volumetric data?

## Idea: deformable large kernel attention

- **Large kernels** capture broad context, similar to the receptive field of self-attention, at much lower cost.
- **Deformable sampling**: a standard convolution samples a fixed grid; a deformable one learns offsets that shift the sampling points with the image content, so the kernel bends around curves, irregular shapes and boundaries. Like tracing a leaf with a soft net instead of a rigid square frame.
- **Deformable attention** in general: instead of every query attending to every position, each query learns a few sampling offsets and attends only there, the way a radiologist looks at the suspicious region rather than the whole scan equally.
- Two networks, D-LKA Net 2D and 3D; the 2D version uses a MaxViT backbone.

## Setup

- Data: Synapse multi-organ CT (2D), NIH Pancreas (3D).
- Training: 2D for 400 epochs, 3D with batch size 2 for 1000 epochs.
- Augmentation: rotation, scaling, cropping, intensity changes.
- Loss: Dice + cross-entropy.
- Metrics: Dice = 2TP / (2TP + FP + FN), higher is better; HD95 (95th percentile Hausdorff distance between predicted and true contours, robust to outliers), lower is better.

## Results: paper vs. my replication

| Setting | Paper | My replication |
|---|---|---|
| 2D Synapse | Dice ~84%, HD95 20.04 | Dice ~80.25%, HD95 15.76 |
| 3D Pancreas | Dice ~81%, HD95 7.59 | Dice ~78.97%, HD95 9.41 |

- I trained 2D with batch size 6; the authors use 20, which ran out of memory for me.
- Qualitatively (2D), D-LKA is best or second best on hard organs such as pancreas and gallbladder, with cleaner boundaries and fewer misclassifications than UNet and Swin-UNet.
- Qualitatively (3D), it captures the irregular pancreas shape with fewer artifacts and stays consistent across slices.
- The authors' ablations show deformable convolution improves results.

## Caveats

- High memory use; training the 2D model took me more than 2 days.
- Open directions: test on general, non-medical segmentation; build lightweight D-LKA variants for real-time clinical use.

The replication used the University of Delaware DARWIN computing system.
