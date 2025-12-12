# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

It now includes a static Corporate Navy themed HTML/CSS/JS app under `public/` that can run without additional dependencies and communicates with a Python FastAPI backend.

## Features

- **Lightweight**: No heavy UI frameworks - vanilla CSS and minimal JS
- **Modern UI**: Clean, responsive design with Corporate Navy styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify
- **Backend-ready**: Reads API base from environment

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The static app is served from `public/index.html` and will be accessible at the root.

### Environment

The frontend reads the backend URL from:

- `REACT_APP_API_BASE` (example: `http://localhost:8000`)

Set this in your `.env` file at `frontend/.env` before starting:

```
REACT_APP_API_BASE=http://localhost:8000
```

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Customization

### Colors

Corporate Navy palette is implemented in `public/styles.css`.

### Components

This template uses pure HTML/CSS components instead of a UI framework. See `public/styles.css`.

## Backend

A FastAPI backend is scaffolded at `../backend`. Start it with:

```
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Ensure `REACT_APP_API_BASE` points to this backend (default is `http://localhost:8000`).

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).
