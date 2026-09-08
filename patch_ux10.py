from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace("frame.src='/legacy-index.html?v=20260908-ux5';","frame.src='/legacy-index.html?v=20260908-ux10';")
s=s.replace('<script src="/timeline_ux8.js?v=20260908-ux8-preview"></script>','<script src="/timeline_ux10.js?v=20260908-ux10-clickfix"></script>')
if '/timeline_ux10.js?v=20260908-ux10-clickfix' not in s:
    raise SystemExit('UX10 script reference not installed')
p.write_text(s,encoding='utf-8')
print('index.html patched to UX10')
