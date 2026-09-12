"""영상/자막 파일 전송용 간단 HTTP 서버 (Range 지원 → 큰 파일 이어받기·브라우저 재생 가능)

사용: python tools/fileserver.py <폴더> [--bind IP] [--port 8082]
예:   python tools/fileserver.py F:\\per\\mp3 --bind 100.93.254.65
      → 다른 기기 브라우저에서 http://100.93.254.65:8082/ 열어 다운로드
"""
import argparse
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote


class RangeHandler(SimpleHTTPRequestHandler):
    """Range 요청(부분 전송)을 처리하는 핸들러"""

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        if not os.path.isfile(path):
            self.send_error(404, "File not found")
            return None

        size = os.path.getsize(path)
        ctype = self.guess_type(path)
        range_header = self.headers.get("Range")
        start, end = 0, size - 1
        partial = False
        if range_header:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                elif m.group(2):  # bytes=-N (마지막 N바이트)
                    start = max(size - int(m.group(2)), 0)
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return None
                partial = True

        f = open(path, "rb")
        self.send_response(206 if partial else 200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if partial:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        # 브라우저가 파일로 저장하도록 (mp4를 바로 재생하고 싶으면 ?play 붙이기)
        if "?play" not in self.path:
            name = os.path.basename(unquote(self.path.split("?")[0]))
            self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{name}")
        self.end_headers()
        f.seek(start)
        self._range = (start, end)
        return f

    def copyfile(self, source, outputfile):
        rng = getattr(self, "_range", None)
        if rng is None:
            return super().copyfile(source, outputfile)
        remaining = rng[1] - rng[0] + 1
        chunk = 1024 * 1024
        while remaining > 0:
            data = source.read(min(chunk, remaining))
            if not data:
                break
            outputfile.write(data)
            remaining -= len(data)

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.client_address[0], fmt % args))
        sys.stdout.flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("directory")
    ap.add_argument("--bind", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8082)
    args = ap.parse_args()
    os.chdir(args.directory)
    httpd = ThreadingHTTPServer((args.bind, args.port), RangeHandler)
    print(f"http://{args.bind}:{args.port}/  ({os.getcwd()})  종료: Ctrl+C", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
