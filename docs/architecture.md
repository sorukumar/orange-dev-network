# Orange Dev Network - Frontend Architecture

This repository (`orange-dev-network`) is strictly the **frontend visualization layer** for the Orange Dev ecosystem.

## Data Source
All data processing, ingestion, and graph generation pipelines have been migrated to the **[orange-dev-data](https://github.com/sorukumar/orange-dev-data)** repository. 
If you are an LLM or human developer looking to modify how data is fetched from the Bitcoin-dev mailing list, Delving Bitcoin, or how the influence metrics are calculated, please refer to the `orange-dev-data` repository.

## Frontend Stack
- **HTML/JS/CSS**: Vanilla web technologies for maximum performance.
- **D3.js**: Used for rendering the interactive force-directed graph (Technical Influence Map).
- **GitHub Pages**: The site is statically hosted via GitHub pages.

## Key Files
- `index.html` / `network.html`: The main entry points for the network visualizations.
- `profile.html`: Displays detailed metrics and connections for individual developers.
- `directory.html`: A searchable directory of contributors.
- `pulse.html`: A view of recent activity and trending topics.

All JSON artifacts that power these visualizations are generated upstream by `orange-dev-data` and either fetched at runtime or updated periodically in this repository.