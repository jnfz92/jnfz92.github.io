#!/usr/bin/env python3
"""Check Jekyll permalinks, local HTML links and referenced static assets."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://jnfz92.github.io"
PAGES = sorted(ROOT.glob("*.html")) + sorted((ROOT / "category").glob("*.html"))
PARTIALS = sorted((ROOT / "_includes").glob("*.html")) + sorted(
    (ROOT / "_layouts").glob("*.html")
)
ASSET_SUFFIXES = {
    ".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".pdf", ".json", ".ico", ".woff", ".woff2", ".ttf",
    ".mp3", ".m4a", ".mp4", ".webm", ".ogg",
}


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []

    def handle_starttag(self, tag, attrs):
        props = dict(attrs)
        if tag == "a" and props.get("href"):
            self.targets.append(("link", props["href"]))
        if tag == "link" and props.get("href"):
            self.targets.append(("asset", props["href"]))
        for asset_tag in ("script", "img", "source", "audio", "video", "iframe"):
            if tag == asset_tag and props.get("src"):
                self.targets.append(("asset", props["src"]))
        if tag == "video" and props.get("poster"):
            self.targets.append(("asset", props["poster"]))
        if tag in ("img", "source") and props.get("srcset"):
            for entry in props["srcset"].split(","):
                candidate = entry.strip().split()
                if candidate:
                    self.targets.append(("asset", candidate[0]))


def check_reference(source_path, kind, url):
    """Return a report for a missing in-repo target, or None."""
    # Jekyll/Liquid resolves these references only after site generation.
    if not url or "{{" in url or "{%" in url or url.startswith(("data:", "#")):
        return None
    resolved = urlparse(urljoin(HOST + "/" + source_path, url))
    if resolved.netloc != urlparse(HOST).netloc:
        return None
    target = unquote(resolved.path).lstrip("/")
    if not target or (kind == "link" and not target.endswith(".html")):
        return None
    if not target.endswith(".html") and Path(target).suffix.lower() not in ASSET_SUFFIXES:
        return None
    # Do not check old migrated article routes; 404.html handles these dynamically.
    if target.startswith("post/") and target.endswith(".html"):
        return None
    if not (ROOT / target).is_file():
        return f"{source_path}: missing {kind} {url!r} -> {target}"
    return None


def check():
    errors = []
    files_checked = PAGES + PARTIALS
    for page in files_checked:
        rel = page.relative_to(ROOT).as_posix()
        source = page.read_text(encoding="utf-8")
        if page in PAGES and rel != "index.html":
            frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n", source, re.S)
            expected = "/" + rel
            permalink = None
            if frontmatter:
                match = re.search(r"^permalink:\s*(\S+)\s*$", frontmatter.group(1), re.M)
                if match:
                    permalink = match.group(1)
            if permalink != expected:
                errors.append(f"{rel}: permalink is {permalink!r}, expected {expected!r}")

        refs = References()
        refs.feed(source)
        for kind, url in refs.targets:
            problem = check_reference(rel, kind, url)
            if problem:
                errors.append(problem)

    for css in (ROOT / "assets").glob("*.css"):
        rel = css.relative_to(ROOT).as_posix()
        source = css.read_text(encoding="utf-8")
        # Check url(...) references to fonts and images in stylesheets.
        for match in re.finditer(r"url\(\s*['\"]?([^)'\"]+)", source, re.I):
            problem = check_reference(rel, "asset", match.group(1).strip())
            if problem:
                errors.append(problem)

    return errors


if __name__ == "__main__":
    errors = check()
    if errors:
        print("ROUTE/ASSET CHECK FAILED:")
        for error in errors:
            print(" -", error)
        sys.exit(1)
    print(
        f"OK: {len(PAGES)} Jekyll pages and {len(PARTIALS)} partials/layouts "
        "have valid permalinks, links and local assets."
    )
