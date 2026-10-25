#!/usr/bin/env python3
"""重新生成 sw.js。改过 index.html 或 assets/ 之后跑一次：python3 tools/build-sw.py

版本号取自 index.html 与全部资源的内容摘要，内容不变版本就不变；
版本一变，玩家下次打开时浏览器会装新的 sw.js，清掉旧缓存。"""
import hashlib, json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
core = ['index.html', 'manifest.webmanifest', 'icon-32.png', 'icon-192.png', 'icon-512.png',
        'icon-maskable-512.png', 'apple-touch-icon.png']
assets = sorted('assets/%s/%s' % (d, f) for d in ('art', 'employees')
                for f in os.listdir(os.path.join(root, 'assets', d)) if f.endswith('.webp'))
h = hashlib.sha1()
for rel in core + assets:
    with open(os.path.join(root, rel), 'rb') as fh: h.update(rel.encode() + fh.read())
version = h.hexdigest()[:10]
tpl = open(os.path.join(root, 'tools', 'sw.template.js'), encoding='utf8').read()
out = tpl.replace('__VERSION__', version).replace('__CORE__', json.dumps(core)).replace('__ASSETS__', json.dumps(assets, indent=0))
open(os.path.join(root, 'sw.js'), 'w', encoding='utf8').write(out)
print('sw.js version', version, '·', len(core), 'core +', len(assets), 'assets')
