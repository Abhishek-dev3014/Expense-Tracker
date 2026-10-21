"""Check the published API image's ports and MongoDB health without cloud secrets."""
import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def verify(image):
    prefix = 'fintrack-smoke-' + uuid.uuid4().hex[:10]
    network, database = prefix + '-net', prefix + '-db'
    containers = []
    docker('network', 'create', network)
    try:
        docker('run', '-d', '--name', database, '--network', network, 'mongo:7.0')
        containers.append(database)
        # No PORT or Catalyst variable in the first case: the image default
        # must match its EXPOSE declaration and the AppSail console setting.
        for label, port, extra_env in (
            ('default', 9000, []),
            ('catalyst-override', 9001, ['-e', 'X_ZOHO_CATALYST_LISTEN_PORT=9001']),
        ):
            name = prefix + '-' + label
            docker('run', '-d', '--name', name, '--network', network,
                   '-p', f'127.0.0.1::{port}',
                   '-e', f'MONGO_URI=mongodb://{database}:27017/smoke',
                   '-e', 'JWT_SECRET=container-smoke-test-only',
                   '-e', 'FRONTEND_URL=https://example.com',
                   '-e', 'SPRING_PROFILES_ACTIVE=prod', *extra_env, image)
            containers.append(name)
            host_port = int(docker('port', name, f'{port}/tcp').rsplit(':', 1)[1])
            deadline = time.monotonic() + 10
            while True:
                # Inspect the container socket, rather than Docker's host-side
                # forwarding socket, which can accept connections too early.
                sockets = docker('exec', name, 'cat', '/proc/net/tcp').splitlines()[1:]
                if any(row.split()[1] == f'00000000:{port:04X}'
                       and row.split()[3] == '0A' for row in sockets):
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError(f'{label}: port {port} did not open in 10 seconds')
                time.sleep(0.2)
            deadline = time.monotonic() + 60
            while True:
                try:
                    with urllib.request.urlopen(
                        f'http://127.0.0.1:{host_port}/api/health', timeout=5
                    ) as response:
                        result = json.load(response)
                        if response.status == 200 and result.get('status') == 'ok':
                            break
                except (OSError, urllib.error.URLError, ValueError):
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError(f'{label}: API/MongoDB health did not become ready')
                time.sleep(0.5)
            print(f'{label}: port {port} and /api/health passed', flush=True)
            docker('stop', name)
    except Exception:
        for name in containers:
            print(docker('logs', name))
        raise
    finally:
        for name in reversed(containers):
            subprocess.run(['docker', 'rm', '-f', name], check=False,
                           stdout=subprocess.DEVNULL)
        docker('network', 'rm', network)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', default='fintrack-api:test')
    verify(parser.parse_args().image)
