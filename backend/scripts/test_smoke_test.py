"""Exercise deployment checks without contacting a service or database."""
import contextlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("smoke", Path(__file__).with_name("smoke-test.py"))
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)
FRONTEND = "https://app.example.test"


class DeploymentChecksTest(unittest.TestCase):
    def run_checks(self, responder):
        with patch.object(smoke, "request", side_effect=responder), \
                patch("sys.argv", ["smoke-test.py", "https://api.example.test", FRONTEND]), \
                contextlib.redirect_stdout(io.StringIO()):
            smoke.main()

    @staticmethod
    def healthy(base, path, method="GET", headers=None):
        if path == "/api/health":
            return 200, {}, b'{"status":"ok"}'
        if path == "/actuator/health":
            return 200, {}, b'{"status":"UP"}'
        if method == "OPTIONS":
            if headers["Origin"] != FRONTEND:
                return 403, {}, b""
            return 200, {"Access-Control-Allow-Origin": FRONTEND,
                         "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"}, b""
        return 401, {}, b""

    def test_current_backend_passes(self):
        self.run_checks(self.healthy)

    def test_legacy_express_health_is_not_a_successful_deployment(self):
        with self.assertRaisesRegex(ValueError, "update the existing Render service"):
            self.run_checks(lambda *args: (200, {"X-Powered-By": "Express"}, b'{"status":"ok"}'))

    def test_missing_spring_health_has_a_deployment_error(self):
        def missing(base, path, *args):
            if path == "/actuator/health":
                return 404, {}, b"<html>Cannot GET /actuator/health</html>"
            return self.healthy(base, path, *args)
        with self.assertRaisesRegex(ValueError, "deploy the Spring Boot backend"):
            self.run_checks(missing)

    def test_cors_must_allow_transaction_updates(self):
        def blocked(base, path, method="GET", headers=None):
            if method == "OPTIONS":
                return 200, {"Access-Control-Allow-Origin": FRONTEND,
                             "Access-Control-Allow-Methods": "GET,POST"}, b""
            return self.healthy(base, path, method, headers)
        with self.assertRaisesRegex(ValueError, r"edit requests \(PUT\)"):
            self.run_checks(blocked)


if __name__ == "__main__":
    unittest.main()
