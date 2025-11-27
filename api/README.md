# API (FastAPI Backend)

This directory contains the FastAPI application that serves as the backend for Singularity.io.

## Getting Started

1.  **Navigate to the API directory:**
    ```bash
    cd api
    ```
2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run the development server:**
    ```bash
    uvicorn main:app --reload
    ```
    The API will be accessible at `http://127.0.0.1:8000`.

## Endpoints

*   **GET `/`**: Returns a simple "Hello: World" message.
