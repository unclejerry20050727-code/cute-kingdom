#!/usr/bin/env python3
"""產生 fonts/rhr.woff2：Resource Han Rounded (資源圓體 TW) 子集化 WOFF2。

用法：
  /tmp/fontenv/bin/python tools/make-font.py <RHR-CFF2-TW 完整 VF otf 路徑>

- 從 index.html / js/*.js / css/*.css 收集所有用到的字元（含 ASCII、CJK、全形符號）
- pyftsubset 子集化（保留 wght 200-900 變體軸 + ROND 圓度軸）
- 輸出 fonts/rhr.woff2（變體字，CSS 用 font-weight 選字重）

⚠️ 遊戲新增中文字後請重跑本腳本，否則新字元會 fallback 系統字體。
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2:
    sys.exit(__doc__)
src = sys.argv[1]

files = (glob.glob(os.path.join(ROOT, 'index.html'))
         + glob.glob(os.path.join(ROOT, 'js', '*.js'))
         + glob.glob(os.path.join(ROOT, 'css', '*.css')))
text = ''.join(open(f, encoding='utf-8').read() for f in files)

keep = []
for ch in sorted(set(text)):
    o = ord(ch)
    if (0x20 <= o <= 0x7E                      # ASCII 可印
            or 0x2000 <= o <= 0x206F           # 一般標點（— – ‘ ’ “ ” …）
            or 0x2190 <= o <= 0x21FF           # 箭頭
            or 0x2B00 <= o <= 0x2BFF           # ⬆⬇ 等
            or 0x2E80 <= o <= 0x9FFF           # CJK
            or 0xF900 <= o <= 0xFAFF
            or 0xFE30 <= o <= 0xFE4F           # CJK 相容形式
            or 0xFF00 <= o <= 0xFFEF):         # 全形
        keep.append(ch)
chars = ''.join(keep)
print(f'{len(files)} files -> {len(chars)} unique chars')

out = os.path.join(ROOT, 'fonts', 'rhr.woff2')
os.makedirs(os.path.dirname(out), exist_ok=True)
chars_file = os.path.join(ROOT, 'tools', '.chars.txt')
with open(chars_file, 'w', encoding='utf-8') as f:
    f.write(chars)
r = subprocess.run([sys.executable, '-m', 'fontTools.subset', src,
                    f'--text-file={chars_file}',
                    '--flavor=woff2', '--no-hinting',
                    f'--output-file={out}'])
sys.exit(r.returncode)
