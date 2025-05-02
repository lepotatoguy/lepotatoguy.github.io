import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


file_path = "your_output_path/Extracted/whole.csv"


# === Collect comments and data ===
comment_lines = []
all_data_rows = []
current_step = None


with open(file_path, 'r') as f:
   for line in f:
       line = line.strip()
       if not line:
           continue


       # Check if the line is a comment, mainly a header line
       if line.startswith("#"):
           comment_lines.append(line)
           if line.startswith("# Timestep"):
               current_step = int(line.split()[2])
       else:
           # Process a data line
           line = line.replace('[', '').replace(']', '')
           parts = [p.strip() for p in line.split(',')]
           row = []
           for part in parts:
               row.extend(part.split())
           row = [float(x) for x in row]
           all_data_rows.append([current_step] + row)


# === Create DataFrame, based on the columns you have ===
columns = ['step', 'grid_x', 'grid_y', 'grid_z', 'vel_x', 'vel_y', 'vel_z', 'pressure']
df = pd.DataFrame(all_data_rows, columns=columns)


# Define output path
output_path = "your_output_path/Extracted/processed_data.csv"


# Save DataFrame to CSV
df.to_csv(output_path, index=False)