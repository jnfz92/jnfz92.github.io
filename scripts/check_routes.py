#!/usr/bin/env python3
"""Check Jekyll page permalinks and local HTML targets before publishing."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://jnfz92.github.io"
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "category").glob("*.html"))


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.hrefs.extend(value for key, value in attrs if key == "href" and value)


def check():
    errors = []
    for page in PAGES:
        rel = page.relative_to(ROOT).as_posix()
        source = page.read_text(encoding="utf-8")
        if rel != "index.html":
            frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", source, re.S)
            expected = "/" + rel
            permalink = None
            if frontmatter:
                match = re.search(r"^permalink:\s*(\S+)\s*$", frontmatter.group(1), re.M)
                if match:
                    permalink = match.group(1)
            if permalink != expected:
                errors.append(f"{rel}: permalink is {permalink!r}, expected {expected!r}")

        links = Links()
        links.feed(source)
        for href in links.hrefs:
            resolved = urlparse(urljoin(HOST + "/" + rel, href))
            if resolved.netloc != urlparse(HOST).netloc:
                continue
            target = unquote(resolved.path).lstrip("/")
            if target.endswith(".html") and not (ROOT / target).is_file():
                errors.append(f"{rel}: broken HTML link {href!r} -> {target}")

    return errors


if __name__ == "__main__":
    errors = check()
    if errors:
        print("ROUTE CHECK FAILED:")
        for error in errors:
            print(" -", error)
        sys.exit(1)
    print(f"OK: {len(PAGES)} Jekyll pages have valid permalinks and local HTML links.")
