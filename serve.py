import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def send_head(self):
        requested_path = Path(self.path.split("?", 1)[0].split("#", 1)[0])
        path = Path(self.translate_path(self.path))
        if requested_path.suffix and path.exists():
            return super().send_head()

        self.path = "/index.html"
        return super().send_head()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Serve the finance tools locally over HTTP."
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host interface to bind to. Default: 127.0.0.1",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=4173,
        help="Port to listen on. Default: 4173",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    root = Path(__file__).resolve().parent
    dist = root / "dist"

    if not dist.exists():
        raise SystemExit("dist/ not found. Run `npm run build` first, or use `npm run dev` for the Vite dev server.")

    handler = partial(SpaHandler, directory=str(dist))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {dist} at http://{args.host}:{args.port}/")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
