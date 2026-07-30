# FlixRecs | Content-Based AI Movie Recommendation System

A lightweight, professional, and responsive Content-Based Movie Recommendation System built using Python (Flask) on the backend and HTML/CSS/Vanilla JavaScript on the frontend. The system employs machine learning techniques (**TF-IDF** + **Cosine Similarity**) to recommend movies based on structural similarity (genres, director, cast, and plot details) and operates within a minimal memory footprint (< 300MB RAM), making it highly optimized for hosting on Render's Free Tier.

---

## 🚀 Features

- **Search Autocomplete**: Real-time title search recommendations via backend-supported fuzzy matching.
- **Top 10 Similar Recommendations**: Content-based suggestions alongside custom match percentages.
- **Explainable AI**: Personalized explanations (e.g. sharing directors, cast, genres) detailing *why* the movie was recommended.
- **Fine-grained Filtering**: Instant sidebar filters to refine recommendations by genre, release year range, and minimum rating.
- **Spotlight Hero Section**: Renders a random featured trending title on load.
- **Curated Rows**: Custom carousel components showing "Trending" and "Popular" movies.
- **Recent Searches**: Client-side storage of searches (`localStorage`) for easy retrieval.
- **Detail Overlays**: Modal pop-ups display crew, ratings, popularity, description, and direct recommendation options.

---

## 🛠️ Technical Stack & Architecture

```
                       +-------------------+
                       |    Web Browser    |  (HTML5, Vanilla CSS, JS)
                       +---------+---------+
                                 | HTTP REST APIs
                                 v
                       +---------+---------+
                       |    Flask App      |  (app.py)
                       +----+---------+----+
                            |         |
          Precomputes on    |         | Queries data
          startup once      v         v
                     +------+---+ +---+------+
                     |  TF-IDF  | |movies.csv|  (75 movies, metadata)
                     | Matrix & | +----------+
                     |Cosine Sim|
                     +----------+
```

### Content-Based Recommendation Engine
1. **Metadata Soup**: The model constructs a text signature ("soup") for each movie combining the values of `genre` (weighted 2x), `director` (weighted 2x), `cast`, and `description`.
2. **TF-IDF Vectorization**: A `TfidfVectorizer` (with English stop-words removed) calculates term frequency-inverse document frequency vectors across the collection.
3. **Similarity Index**: Computes a $75 \times 75$ similarity matrix using **Cosine Similarity**:
   $$\text{similarity}(A, B) = \cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|}$$
4. **Filtering and Post-processing**: The engine extracts the similarity scores for the query movie, sorts them, applies the requested filters (genre, year, rating), and crops the list to the top 10 matches.

---

## 📦 Directory Structure

```
recommendation-system/
├── app.py                  # Flask Application & ML recommendation logic
├── requirements.txt        # Backend dependencies
├── Procfile                # Render process runner
├── runtime.txt             # Python runtime environment version
├── README.md               # Documentation
├── data/
│   └── movies.csv          # Lightweight dataset (75 movies)
├── templates/
│   └── index.html          # Netflix-inspired frontend template
└── static/
    ├── style.css           # Premium responsive stylesheet (Dark Theme)
    └── script.js           # Client-side state & API controllers
```

---

## 🏃 Local Quickstart

### Prerequisites
- Python 3.10+
- `pip` package manager

### 1. Set Up Environment
Clone or navigate to the workspace directory:
```bash
cd recommendation-system
```

Create a virtual environment and activate it:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the App
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## ☁️ Deploying to Render (Free Tier)

This application is ready to deploy on **Render** using **Gunicorn**:

1. Create a new **Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository containing this project.
3. Set the following settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: `Free`
4. Deploy! The application will compile the TF-IDF model on startup in less than 5 seconds and occupy less than 80MB of RAM, well within Render's 512MB threshold.

---

## 📡 API Reference

### `GET /`
Serves the frontend client app.

### `GET /genres`
Returns list of unique genres present in the dataset.
- **Response**: `["Action", "Adventure", "Animation", ...]`

### `GET /popular`
Returns the top 10 movies sorted by popularity and trending state.
- **Response**:
  ```json
  {
    "popular": [ { "id": 2, "title": "The Dark Knight", ... } ],
    "trending": [ { "id": 1, "title": "Inception", ... } ]
  }
  ```

### `GET /suggest?q=<query>`
Returns matching movie autocomplete suggestions.
- **Response**:
  ```json
  [
    { "id": 1, "title": "Inception", "genre": "Sci-Fi...", "year": 2010, "rating": 8.8 }
  ]
  ```

### `POST /recommend`
Evaluates similarity profiles and returns filtered movie recommendations.
- **Payload**:
  ```json
  {
    "movie_id": 1,
    "title": "Inception",
    "genre": "Action",
    "year_start": 2000,
    "year_end": 2020,
    "min_rating": 7.5
  }
  ```
- **Response**:
  ```json
  {
    "query_movie": { "id": 1, "title": "Inception", ... },
    "recommendations": [
      {
        "id": 3,
        "title": "Interstellar",
        "genre": "Sci-Fi, Adventure, Drama",
        "similarity_percentage": 68.4,
        "explanation": "Recommended because both movies are directed by Christopher Nolan, and sharing the 'Sci-Fi' genre(s).",
        ...
      }
    ]
  }
  ```
