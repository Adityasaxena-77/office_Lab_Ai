# Start the App

Open the project root folder in VS Code, then open **two terminals**.

## 1. Start the Backend

In Terminal 1:

```cmd
cd /d backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Run the `pip install` command only the first time. Backend API: `http://localhost:8000`.

## 2. Start the Frontend

In Terminal 2:

```cmd
cd /d frontend
npm install
npm run dev
```

Run `npm install` only the first time. Open `http://localhost:5173` in your browser.

Keep both terminals open while using the app. Press `Ctrl+C` in each terminal to stop it.