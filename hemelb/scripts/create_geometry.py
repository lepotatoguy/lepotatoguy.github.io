import pyvista as pv

# Parameters
outer_radius = 1.0   # outer radius of the cylinder
inner_radius = 0.9   # inner radius (must be < outer_radius)
height = 5.0         # height of the cylinder
resolution = 100     # controls smoothness

# Create outer cylinder
outer_cylinder = pv.Cylinder(center=(0, 0, 0),
                             direction=(0, 0, 1),
                             radius=outer_radius,
                             height=height,
                             resolution=resolution)

# Create inner cylinder
inner_cylinder = pv.Cylinder(center=(0, 0, 0),
                             direction=(0, 0, 1),
                             radius=inner_radius,
                             height=height + 2 * outer_radius,  # extend to ensure full subtraction
                             resolution=resolution)

# Perform boolean difference (subtract inner from outer)
hollow_cylinder = outer_cylinder.boolean_difference(inner_cylinder)

# Visualize to verify
hollow_cylinder.plot()

# Save to STL
hollow_cylinder.save("hollow_cylinder.stl")

print("STL saved as 'hollow_cylinder.stl'")
