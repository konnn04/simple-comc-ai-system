import os
import yaml
import json
import requests
from pathlib import Path
import tqdm

# Directory structure
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

def load_models_config():
    """Load models configuration from YAML file"""
    config_path = Path(__file__).parent / "models.yml"
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return None

def download_file(url, save_path):
    """Download a file from URL with progress bar"""
    print(f"Downloading {url} to {save_path}")
    
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    with open(save_path, 'wb') as file, tqdm.tqdm(
        desc=os.path.basename(save_path),
        total=total_size,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = file.write(data)
            bar.update(size)
    
    return save_path

def download_model_files(language='en', version='latest'):
    """Download all model files for a specific language and version"""
    config = load_models_config()
    if not config:
        print("Failed to load models configuration")
        return None
    
    # Get model info
    try:
        model_info = config['stt_models'][language][version]
    except KeyError:
        print(f"Model for language '{language}' version '{version}' not found in config")
        return None
    
    # Create language directory
    lang_dir = MODELS_DIR / language
    lang_dir.mkdir(exist_ok=True)
    
    # Download model files
    downloaded_files = {}
    
    # Download labels file
    if 'labels' in model_info:
        labels_url = model_info['labels']
        labels_path = lang_dir / "labels.json"
        download_file(labels_url, labels_path)
        downloaded_files['labels'] = str(labels_path)
    
    # Download JIT model (main model)
    if 'jit' in model_info:
        jit_url = model_info['jit']
        jit_path = lang_dir / "model.jit"
        download_file(jit_url, jit_path)
        downloaded_files['model'] = str(jit_path)
    
    # Save model info
    with open(lang_dir / "model_info.json", 'w') as f:
        json.dump({
            'language': language,
            'version': version,
            'files': downloaded_files,
            'original_info': model_info
        }, f, indent=2)
    
    print(f"\nDownloaded {language} model files to {lang_dir}")
    return downloaded_files

if __name__ == "__main__":
    # Download English model
    download_model_files('en', 'latest')