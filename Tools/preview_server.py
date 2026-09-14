"""
preview_server.py — Local Standalone HTTP Development Server & Bundle Generator
Project 08: QR-Based Mobile Asset Survey App (v1.1.7e)
MUIDS Lab Oops OS — Science Department
"""

import os
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_SCRIPT_DIR = os.path.join(BASE_DIR, "App_Script")
OUTPUT_DIR = os.path.join(BASE_DIR, "Output")

def build_standalone_html():
    index_path = os.path.join(APP_SCRIPT_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Pattern to match: <?!= HtmlService.createHtmlOutputFromFile('styles').getContent(); ?>
    pattern = r"<\?!=\s*HtmlService\.createHtmlOutputFromFile\(['\"]([^'\"]+)['\"]\)\.getContent\(\);\s*\?>"

    def replace_include(match):
        module_name = match.group(1)
        module_file = os.path.join(APP_SCRIPT_DIR, f"{module_name}.html")
        if os.path.exists(module_file):
            with open(module_file, "r", encoding="utf-8") as mf:
                return mf.read()
        return f"<!-- Missing include: {module_name} -->"

    standalone = re.sub(pattern, replace_include, content)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "standalone_preview.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(standalone)
    
    docs_dir = os.path.join(BASE_DIR, "docs")
    if os.path.exists(docs_dir):
        docs_index = os.path.join(docs_dir, "index.html")
        with open(docs_index, "w", encoding="utf-8") as df:
            df.write(standalone)

    root_index = os.path.join(BASE_DIR, "index.html")
    with open(root_index, "w", encoding="utf-8") as rf:
        rf.write(standalone)
    
    print(f"[BUILD] Generated standalone preview bundle: {out_path}")
    return standalone

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            html = build_standalone_html()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
        else:
            super().do_GET()

def run_server(port=8088):
    build_standalone_html()
    server_address = ("", port)
    httpd = HTTPServer(server_address, PreviewHandler)
    print(f"\n=======================================================")
    print(f">> QR Asset Survey v1.1.7e Local Preview Server Active")
    print(f"   URL: http://localhost:{port}/")
    print(f"   Serving from: {APP_SCRIPT_DIR}")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    import sys
    if "--bundle-only" in sys.argv:
        build_standalone_html()
    else:
        run_server()
