"""개발용 로컬 서버: 캐시 없이(Cache-Control: no-store) 항상 최신 파일을 줌.
python -m http.server 는 Last-Modified만 보내서 브라우저가 옛 JS/CSS를 캐시에서 쓰는 일이 잦다 (헤드리스 테스트 때 헷갈림).
사용: python tools/devserver.py [포트=8080]  → http://127.0.0.1:8080/index.html?nosw=1 (nosw = 서비스워커 등록 안 함)
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):  # 조용히
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = Path(__file__).resolve().parent.parent
    handler = partial(NoCacheHandler, directory=str(root))
    with ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'http://127.0.0.1:{port}/index.html?nosw=1  (no-store, Ctrl+C로 종료)', flush=True)
        httpd.serve_forever()


if __name__ == '__main__':
    main()
