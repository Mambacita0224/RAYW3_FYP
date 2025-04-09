import os
import subprocess

# still have bugs, need to fix

# Paths
# CONDA_SOURCE = "/csproject/fyp24_rayw3/miniconda3/etc/profile.d/conda.csh"
# ENV_NAME = "musicagent4"
API_DIR = "/Users/clioliang/Desktop/RAYW3_FYP-1/my-music-generator/api"
FRONTEND_DIR = "/Users/clioliang/Desktop/RAYW3_FYP-1/my-music-generator"

# def activate_env():
#     """Activates Conda environment using TCSH"""
#     os.system(f"source {CONDA_SOURCE}&& conda activate {ENV_NAME}")

def start_music_api():
    """Starts the Music API using TCSH"""
    subprocess.Popen(
        ["tcsh", "-c", f"cd {API_DIR} && python music_api.py"]
    )

def start_react_frontend():
    """Starts the React frontend using TCSH"""
    subprocess.Popen(
        ["tcsh", "-c", f"cd {FRONTEND_DIR} && npm run dev"]
    )

if __name__ == "__main__":
    # activate_env()
    start_music_api()
    start_react_frontend()
