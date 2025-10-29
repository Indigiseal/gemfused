#!/usr/bin/env python3
"""Simple development server for Gemfused.

Serves the repository root so both /public and /src assets are reachable.
"""

from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path

DEFAULT_PORT = 5173


def run_server(port: int) -> None:
    root = Path(__file__).resolve().parent
    os.chdir(root)

    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('', port), handler) as httpd:
        print(f"Serving Gemfused at http://localhost:{port} (root: {root})")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Serve the Gemfused repo root for development.')
    parser.add_argument('-p', '--port', type=int, default=DEFAULT_PORT, help=f'Port to listen on (default: {DEFAULT_PORT}).')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    run_server(args.port)
