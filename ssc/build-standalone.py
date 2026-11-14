#!/usr/bin/env python3
"""Build ssc-edge.html: SSC Edge as one self-contained file.

Inlines data.js, app.js and the icon, drops the PWA manifest, and sets
window.SSC_STANDALONE so the app routes in memory, needs no service worker
and has no link back to the Life Game menu. Run from anywhere:
    python3 ssc/build-standalone.py
"""
import base64, pathlib, re

here = pathlib.Path(__file__).resolve().parent
html = (here / 'index.html').read_text()
icon = 'data:image/svg+xml;base64,' + base64.b64encode((here / 'icon.svg').read_bytes()).decode()

html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
html = re.sub(r'\s*<link rel="apple-touch-icon"[^>]*>', '', html)
html = html.replace('href="icon.svg"', f'href="{icon}"')
inline = lambda name: '<script>\n' + (here / name).read_text().replace('</script', '<\\/script') + '\n</script>'
html = html.replace('<script src="data.js"></script>', '<script>window.SSC_STANDALONE = true;</script>\n' + inline('data.js'))
html = html.replace('<script src="app.js"></script>', inline('app.js'))
assert 'src="' not in html.split('<body>')[1], 'an external script was left in'
(here / 'ssc-edge.html').write_text(html)
print('wrote', here / 'ssc-edge.html', len(html), 'bytes')
