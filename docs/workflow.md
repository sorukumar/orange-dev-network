# Bitcoin Social Data Workflow

## Overview
This document outlines the step-by-step workflow for ingesting, processing, and analyzing Bitcoin social data. The process is designed to be incremental for efficiency.

## Prerequisites
- Python 3.x with required libraries (pandas, requests, etc.).
- Git installed.
- Access to external APIs and repositories.

## Step-by-Step Workflow

### 1. Initial Setup
- Clone the repository.
- Install dependencies: `pip install -r requirements.txt` (if exists).
- Configure aliases in `config/identity_mappings.json` for author mapping.

### 2. Full Ingestion (First Run)
Run the orchestrated ingestion script:
```
python scripts/ingest/run_all.py
```
This will:
- Ingest Bitcoin-dev mailing list from Git repos.
- Ingest Delving Bitcoin posts from API.
- Ingest BIPs from Git repo.
- Merge social data into `social_combined.parquet`.
- Validate data integrity.

### 3. Incremental Updates
For ongoing updates:
```
python scripts/ingest/run_all.py
```
- Checks state and fetches only new data.
- Updates merged dataset.

### 4. Categorization
Analyze threads for categories and BIP references:
```
python scripts/analysis/categorize_threads.py
```
- Processes `social_combined.parquet`.
- Outputs `social_combined_categorized.parquet` with added fields.

### 5. Analysis and Visualization
- Run specific analysis scripts (e.g., `summarize_social.py`).
- Generate network graphs in `lab/network-viz/`.
- Use categorized data for filtered insights.

## Troubleshooting
- If ingestion fails, check network/API access.
- For large datasets, ensure sufficient disk space.
- State file (`data/state.json`) can be reset for full re-ingestion.

## Maintenance
- Run weekly for incremental updates.
- Monitor data sizes and API limits.
- Update keywords in categorization as needed.