from pathlib import Path
import subprocess

# Restore the last known working timeline wrapper before UX6.
subprocess.run(['git','checkout','78f7df5df4dcd32293ed7d0c0d5acb1357cdec33','--','index.html'], check=True)
print('Restored index.html from stable UX5 commit')
# retrigger rollback 2026-09-08 14:36 BRT
