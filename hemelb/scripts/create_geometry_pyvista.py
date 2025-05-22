import pyvista as pv

# Create a cylinder aligned along the Z-axis
cylinder = pv.Cylinder(
    center=(0.0, 0.0, 0.0),
    direction=(0.0, 0.0, 1.0),  # Z-axis
    radius=2.0,                # mm
    height=5.0,                # mm
    resolution=64,
    capping=True
)

# Export as STL
cylinder.save('cylinder.stl')

