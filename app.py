import os
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request, render_template
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

# Cache variables
movies_df = None
tfidf_matrix = None
cosine_sim = None

def load_data():
    global movies_df, tfidf_matrix, cosine_sim
    csv_path = os.path.join(app.root_path, 'data', 'movies.csv')
    
    # Load dataset
    movies_df = pd.read_csv(csv_path)
    
    # Clean types
    movies_df['id'] = movies_df['id'].astype(int)
    movies_df['year'] = movies_df['year'].astype(int)
    movies_df['rating'] = movies_df['rating'].astype(float)
    movies_df['popularity'] = movies_df['popularity'].astype(int)
    movies_df['is_trending'] = movies_df['is_trending'].astype(int)
    
    # Fill NAs
    movies_df['genre'] = movies_df['genre'].fillna('')
    movies_df['director'] = movies_df['director'].fillna('')
    movies_df['cast'] = movies_df['cast'].fillna('')
    movies_df['description'] = movies_df['description'].fillna('')
    
    # Create text soup for Content-Based Filtering
    # Weight genres, directors, and actors slightly higher by repeating them in the soup
    movies_df['soup'] = (
        movies_df['genre'] + " " + 
        movies_df['genre'] + " " + 
        movies_df['director'] + " " + 
        movies_df['director'] + " " + 
        movies_df['cast'] + " " + 
        movies_df['description']
    )
    
    # Build TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(movies_df['soup'])
    
    # Pre-compute similarity matrix (only 75x75, extremely fast & memory efficient)
    cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

# Load data on startup
load_data()

def generate_explanation(query_movie, rec_movie):
    """Generates a human-friendly explanation of why a movie is recommended."""
    reasons = []
    
    # 1. Compare directors
    q_dir = query_movie['director'].strip().lower()
    r_dir = rec_movie['director'].strip().lower()
    if q_dir == r_dir and q_dir != '':
        reasons.append(f"directed by {query_movie['director']}")
        
    # 2. Compare cast members
    q_cast = [c.strip().lower() for c in query_movie['cast'].split(',') if c.strip()]
    r_cast = [c.strip().lower() for c in rec_movie['cast'].split(',') if c.strip()]
    common_cast = [c for c in q_cast if c in r_cast]
    if common_cast:
        # Match original capitalization of the first common cast member
        orig_cast = [c.strip() for c in query_movie['cast'].split(',') if c.strip().lower() == common_cast[0]]
        cast_name = orig_cast[0] if orig_cast else common_cast[0]
        reasons.append(f"starring {cast_name}")
        
    # 3. Compare genres
    q_genres = [g.strip().lower() for g in query_movie['genre'].split(',') if g.strip()]
    r_genres = [g.strip().lower() for g in rec_movie['genre'].split(',') if g.strip()]
    common_genres = [g for g in q_genres if g in r_genres]
    if common_genres:
        orig_genres = []
        for cg in common_genres:
            matches = [g.strip() for g in query_movie['genre'].split(',') if g.strip().lower() == cg]
            if matches:
                orig_genres.append(matches[0])
        genre_str = ", ".join(orig_genres[:2])
        reasons.append(f"sharing the '{genre_str}' genre(s)")
        
    if reasons:
        explanation = f"Recommended because both movies are " + ", and ".join(reasons) + "."
    else:
        explanation = "Recommended due to similar plot themes and overall atmospheric styles."
        
    return explanation

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/genres', methods=['GET'])
def get_genres():
    try:
        all_genres = set()
        for genres in movies_df['genre'].dropna():
            for g in genres.split(','):
                all_genres.add(g.strip())
        return jsonify(sorted(list(all_genres)))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/popular', methods=['GET'])
def get_popular():
    try:
        # Return popular and trending sections
        popular = movies_df.sort_values(by='popularity', ascending=False).head(10).to_dict(orient='records')
        trending = movies_df[movies_df['is_trending'] == 1].sort_values(by='rating', ascending=False).head(10).to_dict(orient='records')
        return jsonify({
            "popular": popular,
            "trending": trending
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/suggest', methods=['GET'])
def get_suggestions():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify([])
    
    # Filter movie titles that start with or contain the query
    matches = movies_df[movies_df['title'].str.lower().str.contains(query, na=False)]
    suggestions = matches[['id', 'title', 'genre', 'year', 'rating']].head(8).to_dict(orient='records')
    return jsonify(suggestions)

@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json or {}
        movie_id = data.get('movie_id')
        title_query = data.get('title', '').strip()
        
        # Filters
        genre_filter = data.get('genre', '').strip()
        year_start = data.get('year_start')
        year_end = data.get('year_end')
        min_rating = data.get('min_rating')
        
        # Locate target movie
        target_idx = None
        if movie_id is not None:
            matches = movies_df[movies_df['id'] == int(movie_id)]
            if not matches.empty:
                target_idx = matches.index[0]
        elif title_query:
            matches = movies_df[movies_df['title'].str.lower() == title_query.lower()]
            if not matches.empty:
                target_idx = matches.index[0]
            else:
                # Fuzzy fallback matching
                fuzzy_matches = movies_df[movies_df['title'].str.lower().str.contains(title_query.lower())]
                if not fuzzy_matches.empty:
                    target_idx = fuzzy_matches.index[0]
                    
        if target_idx is None:
            return jsonify({"error": "Movie not found. Please choose from suggestions."}), 404
            
        query_movie = movies_df.iloc[target_idx]
        
        # Compute recommendation similarities
        sim_scores = list(enumerate(cosine_sim[target_idx]))
        # Sort by similarity score descending
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        # Filter and construct list of recommendations
        recommendations = []
        for idx, score in sim_scores:
            if idx == target_idx:
                continue # Skip query movie itself
                
            candidate = movies_df.iloc[idx].to_dict()
            
            # Apply Filters
            if genre_filter:
                candidate_genres = [g.strip().lower() for g in candidate['genre'].split(',')]
                if genre_filter.lower() not in candidate_genres:
                    continue
                    
            if year_start is not None and candidate['year'] < int(year_start):
                continue
                
            if year_end is not None and candidate['year'] > int(year_end):
                continue
                
            if min_rating is not None and candidate['rating'] < float(min_rating):
                continue
                
            # Add similarity score & explanation
            candidate['similarity_score'] = float(score)
            candidate['similarity_percentage'] = round(float(score) * 100, 1)
            candidate['explanation'] = generate_explanation(query_movie, candidate)
            
            recommendations.append(candidate)
            
            # We want top 10 recommendations
            if len(recommendations) == 10:
                break
                
        return jsonify({
            "query_movie": query_movie.drop('soup').to_dict(),
            "recommendations": recommendations
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start local server on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
