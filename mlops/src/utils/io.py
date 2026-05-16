import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]

def load_params() -> dict:
    with open(ROOT / "params.yaml") as f:
        return yaml.safe_load(f)

def save_json(path: str | Path, data: dict) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w") as f:
        json.dump(data, f, indent=2, default=str)

def load_json(path: str | Path) -> dict:
    with open(path) as f:
        return json.load(f)
