# Social Media Footprint Analyzer

This project now includes a full-stack demo application:

- **Backend (Node.js HTTP server)** to store email-based visit data for social media, third-party, and other apps.
- **Frontend (HTML/JS + Chart.js)** to record visits and view a linear trend graph of the footprint algorithm score.

## Run locally

```bash
npm start
```

Open: `http://localhost:3000`

## API summary

- `POST /api/track` with JSON body:
  ```json
  {
    "email": "user@example.com",
    "appName": "Instagram",
    "category": "social_media"
  }
  ```
- `GET /api/users/:email/analytics`

Data is persisted in `data/store.json`.
