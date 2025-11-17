import textwrap
from pathlib import Path
content = """
<PLACEHOLDER>
"""
Path('frontend/src/pages/AdminDashboard.tsx').write_text(textwrap.dedent(content), encoding='utf-8')
