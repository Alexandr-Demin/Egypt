"""Build itch.io zip with POSIX forward-slash paths.

PowerShell's Compress-Archive produces backslash entries which Linux
servers (including itch.io's CDN) treat as flat filenames, causing 403
on path requests like src/main.js. This script uses Python's zipfile,
which writes forward slashes per ZIP spec.

Usage:
    python build-itch.py <output.zip>
"""
import os
import sys
import zipfile

OUT = sys.argv[1] if len(sys.argv) > 1 else 'egypt-itch.zip'
FILES = ['index.html', 'manifest.webmanifest', 'sw.js']
DIRS = ['src', 'styles', 'assets', 'vendor']

count = 0
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in FILES:
        if os.path.isfile(f):
            z.write(f, arcname=f)
            count += 1
    for d in DIRS:
        for root, _, files in os.walk(d):
            for name in files:
                p = os.path.join(root, name)
                arc = p.replace(os.sep, '/')
                z.write(p, arcname=arc)
                count += 1

print('Wrote', count, 'entries to', OUT, '(', os.path.getsize(OUT), 'bytes)')
