# Autonomous Logistics Risk & Intervention Platform — MLOps

Production-grade end-to-end MLOps system that **predicts shipment delays before dispatch** and **recommends operational interventions**. Built to demonstrate enterprise MLOps maturity: reproducibility, versioning, automation, deployment, monitoring, and auto-retraining.

> Dataset: [Customer Analytics — Prachi13](https://www.kaggle.com/datasets/prachi13/customer-analytics)
> Target: `Reached.on.Time_Y.N` (1 = delayed)
> **Zero-setup demo:** if no Kaggle creds and no CSV are present, `ingest.py` generates a deterministic synthetic dataset with the same schema — the entire pipeline runs cold on any machine.

---

## Architecture

```text
GitHub  ─push─▶  GitHub Actions
  │                ├── CI (tests + smoke-run full DVC pipeline)
  │                ├── Train (dvc repro → MLflow/DagsHub → dvc push)
  │                ├── Deploy (Docker build → Render)
  │                └── Retrain (cron → drift check → trigger Train)
  │
  ├──▶ DVC ──▶ DagsHub S3 (data + model artifacts)
  ├──▶ MLflow ──▶ DagsHub Tracking (params/metrics/runs/registry)
  │
  ▼
Docker (FastAPI + xgboost + shap)
  ▼
Render  ──▶  /predict /predict_batch /simulate /explain /summary /metrics /health
                       │
                       └──▶ React frontend (Lovable preview)
```

---

## Quickstart (local, zero credentials)

```bash
cd mlops
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Reproduce the full pipeline (synthetic data is auto-generated)
dvc init -q || true
dvc repro

# Serve the API
uvicorn api.main:app --reload --port 8000
# → http://localhost:8000/docs
```

To use the real Kaggle dataset, export `KAGGLE_USERNAME` and `KAGGLE_KEY` before `dvc repro` (the ingest stage downloads automatically).

To push experiments to DagsHub:

```bash
export MLFLOW_TRACKING_URI=https://dagshub.com/<USER>/<REPO>.mlflow
export MLFLOW_TRACKING_USERNAME=<USER>
export MLFLOW_TRACKING_PASSWORD=<DAGSHUB_TOKEN>
dvc repro train
```

---

## Docker

```bash
docker build -t logistics-risk:latest mlops/
docker run -p 8000:8000 logistics-risk:latest
```

The image trains a warmup model at build time so `/predict` works the moment the container starts. If `DVC_REMOTE_URL` is set, `start.sh` pulls the latest registered model before serving.

---

## Deployment (Render)

1. Push the repo to GitHub.
2. In Render → New → Blueprint, point to the repo. `mlops/render.yaml` is auto-detected.
3. Set the secrets you want (`MLFLOW_TRACKING_URI`, `MLFLOW_TRACKING_USERNAME`, `MLFLOW_TRACKING_PASSWORD`, `DVC_REMOTE_URL`) — or leave them empty for synthetic-data demo mode.
4. The GitHub Actions `Build & Deploy` workflow rebuilds and pings the Render deploy hook on every push to `main`.

---

## API

| Method | Endpoint                | Purpose                                       |
|--------|-------------------------|-----------------------------------------------|
| POST   | `/predict`              | Single shipment risk + action + delay days    |
| POST   | `/predict_batch`        | Batch scoring                                 |
| POST   | `/simulate`             | What-if intervention comparison               |
| POST   | `/explain`              | SHAP per-prediction contributions             |
| GET    | `/summary`              | Aggregated 24h KPIs + drift + registry        |
| GET    | `/metrics`              | Raw model/drift/registry JSON                 |
| GET    | `/health`               | Liveness + model version                      |
| GET    | `/predictions/recent`   | Tail of the prediction log                    |
| GET    | `/artifacts/{name}`     | Serve `confusion_matrix.png`, `feature_importance.png`, `shap_summary.png` |

---

## MLOps surface

- **DVC** — `dvc.yaml` orchestrates ingest → validate → preprocess → features → train → evaluate → register. Data, artifacts, metrics all versioned.
- **MLflow** — every training run logs params + metrics + the model artifact; promoted to the `latest` alias on the registry.
- **DagsHub** — DVC remote + MLflow tracking in one place.
- **GitHub Actions** — `ci.yml` (tests + smoke pipeline), `train.yml` (push-triggered retraining), `deploy.yml` (Docker + Render), `retrain.yml` (cron drift monitor that conditionally invokes `train.yml`).
- **Drift detection** — `src/monitor.py` computes PSI per numeric feature; breach → exit 1 → retrain workflow fires.
- **Auto-retraining** — `retrain.yml` reuses `train.yml` via `workflow_call`.
- **Hot-reload model loader** — `api/model_loader.py` reloads `model.pkl` whenever its mtime changes; no restart needed after `dvc pull`.
- **Cold-start safety net** — `start.sh` trains a model in-container if none exists, so the API is never broken.

---

## Judge talking points (60-second demo flow)

1. **Reproducibility:** `dvc repro` — one command rebuilds raw → features → model from scratch, even with zero credentials.
2. **Versioning:** open `dvc.lock` (data hashes), `artifacts/metrics.json` (model version), MLflow UI (run lineage).
3. **Live API:** `curl /predict` returns a risk score + a *specific business recommendation* (switch to Flight, assign priority handler, etc.).
4. **What-if simulation:** `/simulate` shows ops the exact risk delta from a proposed intervention before they commit.
5. **Explainability:** `/explain` returns per-prediction SHAP contributions — the model is not a black box.
6. **Monitoring & self-healing:** `/summary` shows live drift + 24h KPIs. The retrain cron triggers automatically when PSI > 0.2 or confidence drops below 0.55.
7. **Frontend:** the Lovable-hosted React dashboard wires all of this together — predict, batch, simulate, explain, monitor, and a recommendations playbook — pointing at this API via `VITE_API_URL`.
