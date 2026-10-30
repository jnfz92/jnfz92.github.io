#!/usr/bin/env python3
"""Comprobaciones estáticas de navegación y catálogo de Easy English."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
def read(path):
    return (root / path).read_text(encoding="utf-8")
errors = []

def check(condition, message):
    if not condition:
        errors.append(message)

catalog = read("assets/articulos-supabase.js")
library = read("articulos.html")
home = read("index.html")
header = read("_includes/header.html")
curriculum = re.search(r"const curriculum=\[([\s\S]*?)\];", catalog)
check(bool(curriculum), "Falta la ruta de aprendizaje.")
if curriculum:
    slugs = re.findall(r"'([a-z0-9-]+)'", curriculum.group(1))
    check(len(slugs) == len(set(slugs)), "Slugs duplicados en la ruta.")
    check(len(slugs) >= 80, "La ruta de aprendizaje parece incompleta.")
else:
    slugs = []
fallback = re.findall(r'href="leer\.html\?slug=([a-z0-9-]+)"', library)
check(len(fallback) == len(set(fallback)), "Tarjetas duplicadas en la biblioteca.")
check(set(fallback).issubset(set(slugs)), "La biblioteca contiene slugs ajenos a la ruta.")
check(len(fallback) >= 75, "El catálogo HTML de respaldo tiene pocas tarjetas.")
check('data-filter="writing"' in library, "Falta el filtro de Writing.")
check('id="articleLevel"' in library, "Falta el filtro de nivel.")
check('id="articleSort"' in library, "Falta el selector de orden.")
check('class="ee-more"' in header, "Falta el submenú compacto.")
check('aria-controls="ee-primary-navigation"' in header, "Falta la relación accesible del menú.")

navigation_versions = set()
for path in ["index.html","articulos.html","curso.html","examenes.html","practicar.html","writings.html","speaking-lab.html","leer.html"]:
    html = read(path)
    versions = re.findall(r'(?:/)?assets/navigation\\.js\\?v=([a-zA-Z0-9._-]+)', html)
    check(bool(versions), f"Falta la navegación compartida: {path}")
    navigation_versions.update(versions)
    check("<main" in html, f"Falta el contenido principal: {path}")
    check("<title" in html, f"Falta título HTML: {path}")

check(len(navigation_versions) == 1, f"Versiones de navegación inconsistentes: {sorted(navigation_versions)}")
check('<urlset' in read("sitemap.xml"), "Falta el sitemap.")
check('Sitemap:' in read("robots.txt"), "El robots.txt no declara el sitemap.")

if errors:
    print("Se han detectado problemas:")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"OK: {len(slugs)} rutas, {len(fallback)} tarjetas y navegación consistente.")
