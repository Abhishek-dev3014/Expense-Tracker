"""HTTP smoke tests against the actual packaged Linux service; stdlib only."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(os.environ.get("FINTRACK_BUNDLE", Path(__file__).resolve().parents[1]))


class DeploymentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        cls.key = secrets.token_urlsafe(32)
        cls.base = f"http://127.0.0.1:{port}"
        env = {**os.environ, "X_ZOHO_CATALYST_LISTEN_PORT": str(port), "ML_SERVICE_API_KEY": cls.key}
        cls.server = subprocess.Popen([sys.executable, str(ROOT / "start.py")], cwd="/tmp", env=env)
        cls.addClassCleanup(cls.stop_server)
        for _ in range(100):
            if cls.server.poll() is not None:
                raise RuntimeError("Packaged service failed to start")
            try:
                with urlopen(cls.base + "/health", timeout=1) as response:
                    if response.status == 200:
                        return
            except (URLError, TimeoutError):
                time.sleep(0.1)
        raise RuntimeError("Service did not become healthy")

    @classmethod
    def stop_server(cls):
        cls.server.terminate()
        try:
            cls.server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            cls.server.kill()
            cls.server.wait()

    def request(self, path, payload=None, key=None):
        headers = {"Content-Type": "application/json"}
        if key is not None:
            headers["X-API-Key"] = key
        request = Request(self.base + path, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
        try:
            with urlopen(request, timeout=10) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_health_and_root_without_credentials(self):
        for path in ("/", "/health"):
            status, body = self.request(path)
            self.assertEqual(status, 200)
            self.assertEqual(body["status"], "ok")

    def test_predictions_require_correct_credentials(self):
        for key in (None, "wrong-key"):
            self.assertEqual(self.request("/predict", {"text": "Lunch at Subway"}, key)[0], 401)

    def test_real_model_prediction(self):
        status, body = self.request("/predict", {"text": "Lunch at Subway"}, self.key)
        self.assertEqual(status, 200)
        self.assertEqual(body["predicted_category"], "Food")
        self.assertFalse(body["needs_review"])
        self.assertGreaterEqual(body["confidence"], 0)
        self.assertLessEqual(body["confidence"], 1)

    def test_everyday_categories_and_bank_narrations(self):
        samples = {
            "uber travel": "Transport", "UPI/UBER@paytm/123456789": "Transport",
            "monthly house rent": "Rent", "school tuition fees": "Education",
            "milk and vegetables": "Grocery", "electricity bill": "Utilities",
            "Netflix subscription": "Entertainment", "bought a laptop": "Electronics",
            "Apollo pharmacy medicines": "Health", "Myntra shirt order": "Clothing",
            "Indigo flight ticket": "Travel", "Flipkart shopping": "Shopping",
        }
        status, body = self.request("/predict/batch", {"texts": list(samples)}, self.key)
        self.assertEqual(status, 200)
        self.assertEqual([p["predicted_category"] for p in body["predictions"]], list(samples.values()))
        for text in ("Unknown merchant xyzzy", "bank transfer to Rahul", "monthly subscription", "123 !!!"):
            status, body = self.request("/predict/batch", {"texts": [text]}, self.key)
            self.assertEqual(status, 200)
            self.assertEqual(body["predictions"][0]["predicted_category"], "General")
            self.assertTrue(body["predictions"][0]["needs_review"])
            self.assertEqual(body["predictions"][0]["confidence"], 0)

    def test_batch_authentication_and_limits(self):
        self.assertEqual(self.request("/predict/batch", {"texts": ["Uber"]})[0], 401)
        for texts in ([], ["x"] * 1001, [""], ["x" * 501]):
            self.assertEqual(self.request("/predict/batch", {"texts": texts}, self.key)[0], 422)

    def test_invalid_input(self):
        for body in ({}, {"text": ""}, {"text": "123 !!!"}, {"text": "x" * 501}):
            self.assertEqual(self.request("/predict", body, self.key)[0], 422)

    def test_catalyst_requires_a_secret(self):
        env = {**os.environ, "X_ZOHO_CATALYST_LISTEN_PORT": "9000", "ML_SERVICE_API_KEY": ""}
        result = subprocess.run([sys.executable, str(ROOT / "start.py")], cwd="/tmp", env=env, capture_output=True, timeout=20)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"ML_SERVICE_API_KEY", result.stderr)


if __name__ == "__main__":
    unittest.main()
