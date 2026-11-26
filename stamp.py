#!/usr/bin/env python3
"""배포 전에 실행: index.html / kitchen.html 의 build 값과 version.json 을 같은 새 값으로 맞춥니다.
앱은 version.json 과 자기 build 값을 비교해 '새 버전이 있습니다' 알림을 띄웁니다."""
import re, json, datetime, pathlib
root = pathlib.Path(__file__).resolve().parent
build = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
for name in ('index.html', 'kitchen.html'):
    path = root / name
    text = path.read_text(encoding='utf-8')
    text, n = re.subn(r'<meta name="build" content="[^"]*">', f'<meta name="build" content="{build}">', text)
    assert n == 1, name
    path.write_text(text, encoding='utf-8')
(root / 'version.json').write_text(json.dumps({'build': build}) + '\n', encoding='utf-8')
print('build', build)
