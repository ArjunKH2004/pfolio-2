from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
os.chdir(Path(__file__).parent/'dist'/'client')
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path=self.translate_path(self.path.split('?',1)[0])
        if not os.path.exists(path) and not self.path.startswith('/assets/'):
            self.path='/index.html'
        return super().do_GET()
ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
