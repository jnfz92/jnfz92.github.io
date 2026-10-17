"""Regression tests for static link and asset validation."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import check_routes as routes


class StaticReferenceTests(TestCase):
    def test_parser_finds_scripts_styles_images_and_html_links(self):
        parser = routes.References()
        parser.feed(
            '<a href="articulos.html">Biblioteca</a>'
            '<script src="assets/app.js"></script>'
            '<link rel="stylesheet" href="assets/site.css">'
            '<img src="images/cover.jpg" alt="">'
        )
        self.assertEqual(parser.targets, [
            ("link", "articulos.html"),
            ("asset", "assets/app.js"),
            ("asset", "assets/site.css"),
            ("asset", "images/cover.jpg"),
        ])

    def test_missing_script_reports_broken_asset(self):
        with TemporaryDirectory() as directory, patch.object(routes, "ROOT", Path(directory)):
            self.assertIn(
                "missing asset",
                routes.check_reference("index.html", "asset", "/assets/obsolete.js"),
            )

    def test_existing_assets_and_query_parameters(self):
        with TemporaryDirectory() as directory, patch.object(routes, "ROOT", Path(directory)):
            (Path(directory) / "assets").mkdir()
            (Path(directory) / "assets" / "navigation.js").write_text("/* ok */")
            self.assertIsNone(routes.check_reference(
                "index.html", "asset", "/assets/navigation.js?v=20261017"
            ))

    def test_ignore_external_and_liquid_resources(self):
        with TemporaryDirectory() as directory, patch.object(routes, "ROOT", Path(directory)):
            self.assertIsNone(routes.check_reference(
                "index.html", "asset", "https://cdn.jsdelivr.net/library.js"
            ))
            self.assertIsNone(routes.check_reference(
                "_layouts/default.html", "asset", "{{ '/assets/site.css' | relative_url }}"
            ))

    def test_detects_missing_css_url_asset(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assets").mkdir()
            (root / "assets" / "site.css").write_text(
                '.hero{background-image:url("../images/missing.svg")}'
            )
            with (
                patch.object(routes, "ROOT", root),
                patch.object(routes, "PAGES", []),
                patch.object(routes, "PARTIALS", []),
            ):
                problems = routes.check()
            self.assertEqual(len(problems), 1)
            self.assertIn("images/missing.svg", problems[0])
