from pathlib import Path

p=Path('index.html')
s=p.read_text()
tag='<script src="/timeline_ux8.js?v=20260908-ux8-preview"></script>'
if tag not in s:
    if '</body>' not in s:
        raise SystemExit('Missing </body> in index.html')
    s=s.replace('</body>',tag+'\n</body>',1)
p.write_text(s)
print('UX8 preview injector installed')
