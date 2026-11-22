# portfolio-v2

Personal site: https://avangogineni-projects.github.io/portfolio-v2/

Static pages served by GitHub Pages, sharing `style.css` and `app.js`:

- `/` (`index.html`): AI engineer version, with the AI CV.
- `/fullstack/` (`fullstack/index.html`): full-stack / software engineer version, with the software CV. Not linked from the main page; send it directly for software roles.

Each page holds its own text and project list (`P`); `app.js` renders the project index and the "Running now" board from `data/live.json`.

## Live readings

`scripts/snapshot.py` calls the public APIs of the running projects (Busskoll, Elvarsel, Tenderlens, Bolagsvakt), summarises them and writes `data/live.json`. The workflow `.github/workflows/snapshot.yml` runs it every 6 hours and commits the file when it changes. If one API fails, its previous reading is kept, so the board never goes blank.

```bash
python3 scripts/test_snapshot.py   # tests, no dependencies
python3 scripts/snapshot.py        # refresh data/live.json locally
```

## CVs

`cv/` holds the three CV versions built from the separate `resume` LaTeX folder. Rebuild there, then copy the PDFs here.
