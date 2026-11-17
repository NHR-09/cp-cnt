#!/usr/bin/env python3
"""
Multi-Port SDN Command Center Gateway
Runs dedicated port listeners for each window:
  - Port 3001 -> Window 1: Red Team Control Center (/attacker)
  - Port 3002 -> Window 2: SDN Middleware & Control (/sdn)
  - Port 3003 -> Window 3: Apex Cloud Store Target (/victim)
"""

import http.server
import socketserver
import urllib.request
import threading
import sys

TARGET_HOST = "http://localhost:3000"

def make_proxy_handler(window_path):
    class WindowProxyHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            # If requesting root of this port, serve the dedicated window path
            req_path = self.path
            if req_path == "/" or req_path == "":
                req_path = window_path

            url = f"{TARGET_HOST}{req_path}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': self.headers.get('User-Agent', 'MultiPortProxy')})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    content = resp.read()
                    self.send_response(resp.status)
                    for header, val in resp.getheaders():
                        if header.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                            self.send_header(header, val)
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
            except Exception as e:
                self.send_response(302)
                self.send_header('Location', f"{TARGET_HOST}{window_path}")
                self.end_headers()

        def do_POST(self):
            # Pass POST requests (if any) directly to TARGET_HOST
            content_len = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_len) if content_len > 0 else None
            url = f"{TARGET_HOST}{self.path}"
            try:
                req = urllib.request.Request(url, data=post_body, headers={'Content-Type': self.headers.get('Content-Type', 'application/json')})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    content = resp.read()
                    self.send_response(resp.status)
                    for header, val in resp.getheaders():
                        if header.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                            self.send_header(header, val)
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
            except Exception as e:
                self.send_response(500)
                self.end_headers()

        def log_message(self, format, *args):
            pass  # Suppress proxy noise

    return WindowProxyHandler

def serve_port(port, path):
    handler = make_proxy_handler(path)
    # Enable SO_REUSEADDR
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"[MultiPort] Port {port} listening -> {path}")
            httpd.serve_forever()
    except Exception as e:
        print(f"[MultiPort] Failed on port {port}: {e}")

if __name__ == "__main__":
    t1 = threading.Thread(target=serve_port, args=(3001, "/attacker"), daemon=True)
    t2 = threading.Thread(target=serve_port, args=(3002, "/sdn"), daemon=True)
    t3 = threading.Thread(target=serve_port, args=(3003, "/victim"), daemon=True)

    t1.start()
    t2.start()
    t3.start()

    print("[MultiPort] Ports 3001 (/attacker), 3002 (/sdn), and 3003 (/victim) active.")
    try:
        t1.join()
        t2.join()
        t3.join()
    except KeyboardInterrupt:
        sys.exit(0)

