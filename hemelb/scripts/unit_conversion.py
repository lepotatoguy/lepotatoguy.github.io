# def lbm_unit_conversion(
#     R_phys_mm,
#     L_phys_mm,
#     lattice_points,
#     mu_phys,
#     rho_phys=1060.0,
#     U_phys=0.013,
#     U_lb_target=0.05
# ):
#     """
#     Compute Lattice Boltzmann parameters from physical inputs and output
#     geometry resolution, stability parameters, and maturity estimation.

#     Parameters:
#     - R_phys_mm: Cylinder radius in millimeters
#     - L_phys_mm: Cylinder length in millimeters
#     - lattice_points: Number of lattice nodes across the radius
#     - mu_phys: Dynamic viscosity in Pa·s (e.g., blood ~ 4e-3)
#     - rho_phys: Fluid density in kg/m³ (default: 1060 for blood)
#     - U_phys: Peak or average velocity in m/s
#     - U_lb_target: Desired lattice velocity (e.g., 0.01–0.1)

#     Outputs:
#     - Prints voxel size, time step, relaxation time, lattice dimensions
#     - Estimates physical time for velocity profile development
#     """

#     # ---------------------------
#     # Step 1: Convert units to SI
#     # ---------------------------
#     R_phys = R_phys_mm / 1000.0  # [m]
#     L_phys = L_phys_mm / 1000.0  # [m]

#     # ---------------------------
#     # Step 2: Compute lattice spacing
#     # ---------------------------
#     delta_x = R_phys / lattice_points  # voxel size [m]

#     # ---------------------------
#     # Step 3: Compute lattice time step to match desired U_lb
#     # ---------------------------
#     delta_t = (U_phys / U_lb_target) * delta_x  # time step [s]

#     # ---------------------------
#     # Step 4: Compute physical and lattice viscosities
#     # ---------------------------
#     nu_phys = mu_phys / rho_phys  # [m²/s]
#     nu_lb = nu_phys * delta_t / (delta_x ** 2)

#     # ---------------------------
#     # Step 5: Compute relaxation time τ (LBM stability parameter)
#     # ---------------------------
#     cs2 = 1 / 3
#     tau = nu_lb / cs2 + 0.5

#     # ---------------------------
#     # Step 6: Compute lattice geometry
#     # ---------------------------
#     R_lattice = lattice_points
#     L_lattice = int(L_phys / delta_x)
#     volume_lattice = 3.1416 * R_lattice**2 * L_lattice  # approximate

#     # ---------------------------
#     # Step 7: Estimate time to reach mature Poiseuille flow
#     # ---------------------------
#     t_develop_phys = R_phys**2 / nu_phys  # [s]
#     steps_required = int(t_develop_phys / delta_t)

#     # ---------------------------
#     # Step 8: Output
#     # ---------------------------
#     print("---- LBM Parameters ----")
#     print(f"Voxel size (Δx) [voxel_size in xml]:         {delta_x:.2e} m")
#     print(f"Time step (Δt) [step_length in xml]:          {delta_t:.2e} s")
#     print(f"Relaxation time (τ) [Preferable range should be 0.6<τ<1.5, don't go below 0.51]:     {tau:.3f}")
#     print(f"Lattice radius:          {R_lattice} sites")
#     print(f"Lattice length:          {L_lattice} sites")
#     print(f"Total lattice volume:    {int(volume_lattice)} sites (approx) [Total fluid voxels from gmy]")
#     print()
#     print("---- Flow Maturity Estimate ----")
#     print(f"Physical time to maturity:    {t_develop_phys:.3f} s")
#     print(f"Recommended steps for maturity [steps in xml]: {steps_required} steps (based on Δt)")

# # ---------------------------
# # Example usage with blood-like parameters
# # ---------------------------
# lbm_unit_conversion(
#     R_phys_mm=2.0,        # radius in mm
#     L_phys_mm=40.0,       # length in mm
#     lattice_points=40,    # resolution across radius, the more the better, but more computational cost
#     mu_phys=4e-3          # viscosity in Pa·s
# )


def auto_lbm_configuration(
    R_phys_mm,
    L_phys_mm,
    mu_phys
):
    """
    Auto-generate LBM simulation parameters from physical artery geometry.

    Inputs:
    - R_phys_mm: Radius of artery (mm)
    - L_phys_mm: Length of artery (mm)
    - mu_phys: Dynamic viscosity (Pa·s)

    Outputs:
    - Voxel size, time step, tau, lattice dimensions
    - Pressure gradient (in Pa and mmHg)
    - Steps for stable Poiseuille profile
    """

    import math

    # ----------- Constants ------------
    rho_phys = 1060.0           # kg/m³
    U_phys = 0.013              # m/s (typical arterial average)
    cs = 1 / math.sqrt(3)       # ≈ 0.577
    Ma_max = 0.1
    U_lb_target = Ma_max * cs   # ≈ 0.0577
    T_phys = 0.1                # 100 ms simulated time

    # ---------- Convert to SI ----------
    R_phys = R_phys_mm / 1000.0
    L_phys = L_phys_mm / 1000.0
    nu_phys = mu_phys / rho_phys

    # ---------- Simulation levels ----------
    levels = {
        'Low': 10,
        'Moderate': 20,
        'High': 40
    }

    print("===== LBM Auto-Configuration =====\n")

    for level, R_lattice in levels.items():
        delta_x = R_phys / R_lattice
        delta_t = (U_phys / U_lb_target) * delta_x
        nu_lb = nu_phys * delta_t / delta_x**2
        tau = 3 * nu_lb + 0.5
        L_lattice = int(L_phys / delta_x)
        volume = math.pi * R_lattice**2 * L_lattice
        steps = int(T_phys / delta_t)
        mature_steps = int((R_phys**2 / nu_phys) / delta_t)

        # Compute pressure gradient from Poiseuille law
        dp_dz_Pa_per_m = (8 * mu_phys * U_phys) / (R_phys**2)
        dp_dz_mmHg_per_m = dp_dz_Pa_per_m * 0.00750062
        dp_total_mmHg = dp_dz_mmHg_per_m * L_phys  # Total drop

        print(f"--- {level} Resolution ---")
        print(f"Voxel size (Δx):         {delta_x:.2e} m")
        print(f"Time step (Δt):          {delta_t:.2e} s")
        print(f"Relaxation time (τ):     {tau:.3f}")
        print(f"Lattice radius:          {R_lattice} sites")
        print(f"Lattice length:          {L_lattice} sites")
        print(f"Total lattice volume:    {int(volume)} sites (approx)")
        print(f"Lattice Mach number:     {(U_lb_target / cs):.3f}")
        print(f"Simulated time steps:    {steps}")
        print(f"Recommended maturity steps: {mature_steps}")
        print(f"Required pressure drop:  {dp_total_mmHg:.3f} mmHg (mean inlet - outlet)")
        
        # Stability warnings
        if tau < 0.51 or tau > 2.0:
            print("  ⚠ Warning: τ outside recommended range.")
        if volume > 1e7:
            print("  ⚠ Warning: High computational cost.")
        if R_lattice < 10:
            print("  ⚠ Warning: Radius too coarsely resolved.")
        print()

# Example use:
auto_lbm_configuration(
    R_phys_mm=2.0,
    L_phys_mm=40.0,
    mu_phys=4e-3
)



