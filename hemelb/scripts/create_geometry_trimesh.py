# ! pip install trimesh
import trimesh
import numpy as np

# Create the cylinder along the Z-axis
cylinder = trimesh.creation.cylinder(
    #radius=5, 
    #height=200,
    radius=2, #mm
    #height=40,
    height=5, #mm
    sections=64,      # Resolution
    cap_ends=True
)

# # Rotate 90 degrees about Y-axis to align with Z
# rotation_y_to_z = trimesh.transformations.rotation_matrix(
#     angle=np.pi / 2,           # 90 degrees
#     direction=[0, 0, 1],       # rotate around Y-axis
#     point=[0, 0, 0]            # about origin
# )

# # Apply the transformation
# cylinder.apply_transform(rotation_y_to_z)

# cylinder.apply_translation(-cylinder.bounds.mean(axis=0))

# cylinder.apply_scale(0.001)  #convert mm to meters

# Export STL
cylinder.export('cylinder.stl')
