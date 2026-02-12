# Bitcoin Social Data Ingestion and Analysis Architecture

## Overview
This project ingests, processes, and analyzes social data from Bitcoin-related sources to provide insights into discussions, trends, and community dynamics. The system focuses on mailing lists and forums, with support for governance data (BIPs).

## Components

### Data Sources
- **Bitcoin-dev Mailing List**: Historical emails from the Bitcoin development mailing list, sourced from public-inbox Git repositories.
- **Delving Bitcoin Forum**: Posts and replies from the Delving Bitcoin discussion forum, fetched via API.
- **Bitcoin Improvement Proposals (BIPs)**: Governance documents from the BIP repository.

### Ingestion Layer
- **ingest_mailing_list.py**: Clones and parses Git repositories for email data, handling sharding and incremental updates.
- **ingest_delving.py**: Fetches topics and posts from the Delving API, with incremental fetching based on topic IDs.
- **ingest_bips.py**: Clones the BIP repository and parses proposal files into structured data.

### Processing Layer
- **merge_data.py**: Combines social data sources into a unified dataset, handling deduplication and field alignment.
- **categorize_threads.py**: Analyzes thread content to assign categories (e.g., segwit, consensus) and extract BIP references.

### Storage Layer
- **Data Format**: All data stored in Parquet format for efficient querying and analysis.
- **Location**: `data/raw/` for all ingested data (social and BIPs).
- **State Management**: JSON file (`data/state.json`) tracks incremental ingestion state.

### Analysis and Visualization
- **Scripts**: Various analysis scripts in `scripts/analysis/` for summarization, influence analysis, etc.
- **Visualization**: Interactive network graph served via `index.html` using data in `data/viz/`.

## Data Flow
1. **Ingestion**: Run individual or orchestrated ingestion scripts to fetch data.
2. **Merging**: Combine social data sources.
3. **Analysis**: Apply categorization and other analyses.
4. **Visualization**: Generate insights and graphs.

## Dependencies
- Python libraries: pandas, requests, gitpython, etc.
- External APIs: Delving Bitcoin API.
- Git repositories: Bitcoin mailing list archives, BIP repo.

## Scalability and Maintenance
- Incremental updates minimize reprocessing.
- Modular design allows adding new sources.
- Parquet format supports large datasets efficiently.