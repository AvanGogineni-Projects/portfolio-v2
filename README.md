# portfolio-v2

Personal site: https://avangogineni-projects.github.io/portfolio-v2/

A static page (`index.html`, `style.css`) served by GitHub Pages. The "Running now" board reads `data/live.json`.

## Live readings

`scripts/snapshot.py` calls the public APIs of the running projects (Busskoll, Elvarsel, Tenderlens, Bolagsvakt), summarises them and writes `data/live.json`. The workflow `.github/workflows/snapshot.yml` runs it every 6 hours and commits the file when it changes. If one API fails, its previous reading is kept, so the board never goes blank.

```bash
python3 scripts/test_snapshot.py   # tests, no dependencies
python3 scripts/snapshot.py        # refresh data/live.json locally
```

## CVs

`cv/` holds the three CV versions built from the separate `resume` LaTeX folder. Rebuild there, then copy the PDFs here.
