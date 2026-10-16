"""Exercise deployment ordering/failure handling without cloud credentials."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('deploy.sh').resolve()


class DeployTests(unittest.TestCase):
    def run_deploy(self, mode='success'):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            stub = '''#!/usr/bin/env bash
printf '%s %s\\n' "${0##*/}" "$*" >> "$CALLS"
case "${0##*/}" in
  catalyst)
    if [[ "$MODE" == cli_failure ]]; then
      echo 'AppSail Deploy failed'
      exit 0
    fi
    echo 'Catalyst AppSail Deploy completed successfully'
    ;;
  curl) [[ "$MODE" != health_failure ]] || exit 22 ;;
esac
'''
            for tool in ('docker', 'catalyst', 'curl'):
                path = root / tool
                path.write_text(stub)
                path.chmod(0o755)
            env = {
                **os.environ,
                'PATH': str(root) + os.pathsep + os.environ['PATH'],
                'CALLS': str(root / 'calls'), 'MODE': mode,
                'CATALYST_TOKEN': 'fake-test-token', 'CATALYST_PROJECT_ID': '123',
                'DOCKERHUB_USERNAME': 'test', 'GITHUB_SHA': 'a' * 40,
                'AI_URL': 'https://ai.example', 'API_URL': 'https://api.example',
            }
            result = subprocess.run(['bash', str(SCRIPT)], env=env, capture_output=True, text=True)
            calls = (root / 'calls').read_text()
            self.assertNotIn('fake-test-token', result.stdout + result.stderr + calls)
            return result, calls

    def test_deploys_ai_before_api_and_checks_both(self):
        result, calls = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertLess(calls.index('--name fintrack-ai'), calls.index('https://ai.example/health'))
        self.assertLess(calls.index('https://ai.example/health'), calls.index('--name fintrack-api'))
        self.assertIn('https://api.example/api/health', calls)
        self.assertIn('--dc in', calls)

    def test_zero_exit_cli_failure_stops_release(self):
        result, calls = self.run_deploy('cli_failure')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('--name fintrack-api', calls)
        self.assertNotIn('curl ', calls)

    def test_unhealthy_ai_stops_api_deployment(self):
        result, calls = self.run_deploy('health_failure')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('--name fintrack-api', calls)


if __name__ == '__main__':
    unittest.main()
