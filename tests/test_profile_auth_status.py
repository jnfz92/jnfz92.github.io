"""Regression: el registro nunca debe perder el destino del mensaje de sesión."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ProfileAuthStatusTest(unittest.TestCase):
    def test_dashboard_status_is_retained_when_profile_is_rebuilt(self):
        source = (ROOT / "perfil.html").read_text(encoding="utf-8")
        block = re.search(r"\$\('privateDashboard'\)\.replaceChildren\((.*?)\);", source, re.S)
        self.assertIsNotNone(block, "El perfil debe conservar su construcción del panel privado")
        self.assertRegex(block.group(1), r"\bdashboardStatus\b",
                         "Sin dashboardStatus, registrarse con una sesión nueva falla al mostrar el mensaje")
        self.assertIn("dashboardStatus.id='dashboardStatus'", source)

if __name__ == "__main__":
    unittest.main()
