"""Regresión: el perfil conserva el estado de sesión y la navegación por pestañas."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProfileAuthStatusTest(unittest.TestCase):
    def test_dashboard_status_is_retained_with_tabs(self):
        html = (ROOT / "perfil.html").read_text(encoding="utf-8")
        source = (ROOT / "assets" / "perfil.js").read_text(encoding="utf-8")
        self.assertIn('src="/assets/perfil.js', html)
        self.assertIn('id="privateDashboard"', html)
        self.assertIn('id="accountStatus"', html)
        self.assertIn("dashboardStatus.id='dashboardStatus'", source)
        self.assertIn("$('privateDashboard').prepend(dashboardStatus)", source)
        self.assertIn("const target=user?$('dashboardStatus'):$('accountStatus')", source)
        self.assertIn("target.textContent=s", source)
        self.assertIn("target.hidden=!s", source)

    def test_tab_layout_is_not_destroyed_by_client_script(self):
        html = (ROOT / "perfil.html").read_text(encoding="utf-8")
        source = (ROOT / "assets" / "perfil.js").read_text(encoding="utf-8")
        for tab in ("inicio", "estudiar", "resultados", "biblioteca", "cuenta"):
            with self.subTest(tab=tab):
                self.assertIn('id="profile-tab-' + tab + '"', html)
                self.assertIn('id="profile-panel-' + tab + '"', html)
        self.assertNotIn("$('privateDashboard').replaceChildren(", source)


if __name__ == "__main__":
    unittest.main()
