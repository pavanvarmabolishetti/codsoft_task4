import json
import unittest
from app import app, movies_df

class TestRecommendationSystem(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_genres_endpoint(self):
        response = self.app.get('/genres')
        self.assertEqual(response.status_code, 200)
        genres = json.loads(response.data)
        self.assertIsInstance(genres, list)
        self.assertIn("Action", genres)
        self.assertIn("Sci-Fi", genres)
        print("[OK] /genres endpoint verified.")

    def test_popular_endpoint(self):
        response = self.app.get('/popular')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("popular", data)
        self.assertIn("trending", data)
        self.assertEqual(len(data["popular"]), 10)
        self.assertEqual(len(data["trending"]), 10)
        print("[OK] /popular endpoint verified.")

    def test_suggest_endpoint(self):
        response = self.app.get('/suggest?q=incep')
        self.assertEqual(response.status_code, 200)
        suggestions = json.loads(response.data)
        self.assertIsInstance(suggestions, list)
        self.assertTrue(any(s['title'] == 'Inception' for s in suggestions))
        print("[OK] /suggest endpoint verified.")

    def test_recommend_endpoint_basic(self):
        payload = {
            "title": "Inception"
        }
        response = self.app.post('/recommend', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("query_movie", data)
        self.assertIn("recommendations", data)
        self.assertEqual(data["query_movie"]["title"], "Inception")
        self.assertTrue(len(data["recommendations"]) <= 10)
        
        # Check recommendations format
        for rec in data["recommendations"]:
            self.assertIn("similarity_score", rec)
            self.assertIn("similarity_percentage", rec)
            self.assertIn("explanation", rec)
            self.assertIsInstance(rec["explanation"], str)
            self.assertGreater(len(rec["explanation"]), 0)
            
        print("[OK] /recommend endpoint (basic similarity) verified.")

    def test_recommend_endpoint_filtered(self):
        # We search for similar movies to Inception, filtering for Sci-Fi genre, rating >= 8.0
        payload = {
            "title": "Inception",
            "genre": "Sci-Fi",
            "min_rating": 8.0,
            "year_start": 2000,
            "year_end": 2026
        }
        response = self.app.post('/recommend', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        recs = data["recommendations"]
        
        for rec in recs:
            genres = [g.strip().lower() for g in rec["genre"].split(',')]
            self.assertIn("sci-fi", genres)
            self.assertGreaterEqual(rec["rating"], 8.0)
            self.assertGreaterEqual(rec["year"], 2000)
            self.assertLessEqual(rec["year"], 2026)
            
        print("[OK] /recommend endpoint (filtered similarity) verified.")

if __name__ == '__main__':
    unittest.main()
