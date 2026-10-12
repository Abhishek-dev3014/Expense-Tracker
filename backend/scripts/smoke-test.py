#!/usr/bin/env python3
"""Read-only deployment checks; no accounts or transactions are created."""
import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def origin(value):
    parsed = urlsplit(value)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname
            or parsed.username or parsed.password or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment):
        raise argparse.ArgumentTypeError("Use an HTTP(S) origin without credentials or a path")
    return value.rstrip("/")


def request(base, path, method="GET", headers=None):
    try:
        with urlopen(Request(base + path, method=method, headers=headers or {}), timeout=60) as response:
            return response.status, response.headers, response.read()
    except HTTPError as error:
        return error.code, error.headers, error.read()


def check(condition, message):
    if not condition:
        raise ValueError(message)
    print("PASS: " + message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("api_origin", type=origin)
    parser.add_argument("frontend_origin", type=origin)
    args = parser.parse_args()
    status, headers, body = request(args.api_origin, "/api/health")
    check(headers.get("X-Powered-By", "").lower() != "express",
          "API runs the Spring Boot release. If Express is still live, update the existing "
          "Render service to Docker and deploy main; frontend redeploys cannot add the edit endpoint")
    check(status == 200, "API readiness returns HTTP 200")
    check(json.loads(body).get("status") == "ok", "MongoDB readiness is healthy")
    status, _, body = request(args.api_origin, "/actuator/health")
    check(status == 200, "Spring health endpoint exists; deploy the Spring Boot backend if it returns 404")
    check(json.loads(body).get("status") == "UP", "Spring health is UP")
    status, _, _ = request(args.api_origin, "/api/transactions")
    check(status == 401, "Private transactions require authentication")
    status, _, _ = request(args.api_origin, "/actuator/env")
    check(status in (401, 403), "Runtime environment is not publicly exposed")
    status, headers, _ = request(args.api_origin, "/api/transactions/000000000000000000000000", "OPTIONS", {
        "Origin": args.frontend_origin, "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "authorization,content-type"})
    check(status == 200 and headers.get("Access-Control-Allow-Origin") == args.frontend_origin
          and "PUT" in headers.get("Access-Control-Allow-Methods", "").split(","),
          "Configured frontend can send transaction edit requests (PUT)")
    for allowed, candidate in ((True, args.frontend_origin),
                               (False, "https://untrusted.invalid"),
                               (False, "http://localhost:5173")):
        status, headers, _ = request(args.api_origin, "/api/transactions", "OPTIONS", {
            "Origin": candidate, "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type"})
        if allowed:
            check(status == 200 and headers.get("Access-Control-Allow-Origin") == candidate,
                  "Configured frontend passes CORS preflight")
        else:
            check(status == 403 and headers.get("Access-Control-Allow-Origin") is None,
                  "Production rejects CORS origin " + candidate)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, URLError, TimeoutError) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        sys.exit(1)
