#!/usr/bin/env python3
"""產生 fonts/rhr-500/700/900.woff2：Resource Han Rounded (資源圓體 TW) 靜態 glyf 子集 WOFF2。

用法：
  /tmp/fontenv/bin/python tools/make-font.py <RHR-CFF2-TW 完整 VF otf 路徑>

流程：
  1. 從 index.html / js/*.js / css/*.css 收集所有用到的字元
  2. pyftsubset 子集化完整 VF（去掉 layout features，免 instancer GPOS merge 問題）
  3. 每個字重 instance 成靜態（wght=500/700/900、ROND=100 預設圓度）
  4. tools/cff2_to_glyf.py 轉 CFF2 → TrueType(glyf) 輪廓
  5. 再子集化成 woff2 → fonts/rhr-500.woff2 / rhr-700.woff2 / rhr-900.woff2

為什麼不用單一個 VF woff2？
  iOS 舊版 WebKit 對 CFF2/VF 的 woff2 渲染有已知怪異（glyph 錯位/亂碼，例如
  「拍照」偶發顯示成「攻擊」）。TTF(glyf) 輪廓的 woff2 是相容性最好的網路字型路徑。
  三個靜態字重共 ~660KB，比單一 VF(727KB) 還小；瀏覽器會自動把 600→700、800→900。

⚠️ 遊戲新增中文字後請重跑本腳本，否則新字元會 fallback 系統字體。
   每次重跑後記得把 css/style.css 的 ?v= 版本號加一（強迫手機重新下載字型）。
"""
import glob
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2:
    sys.exit(__doc__)
src = sys.argv[1]
WEIGHTS = (500, 700, 900)

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

chars_file = os.path.join(ROOT, 'tools', '.chars.txt')
with open(chars_file, 'w', encoding='utf-8') as f:
    f.write(chars)

def run(*args):
    r = subprocess.run(list(args), capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr)
        sys.exit(r.returncode)

os.makedirs(os.path.join(ROOT, 'fonts'), exist_ok=True)
with tempfile.TemporaryDirectory() as td:
    # 1) 子集化完整 VF
    sub_vf = os.path.join(td, 'subset-vf.otf')
    run(sys.executable, '-m', 'fontTools.subset', src,
        f'--text-file={chars_file}', '--layout-features=""', '--no-hinting',
        f'--output-file={sub_vf}')
    print('1/4 subset VF ok')

    # 2)-4) 每字重：instance → glyf → woff2
    from fontTools.varLib.instancer import instantiateVariableFont
    from fontTools.ttLib import TTFont
    for i, w in enumerate(WEIGHTS, 2):
        st_otf = os.path.join(td, f'static-{w}.otf')
        f = TTFont(sub_vf)
        f2 = instantiateVariableFont(f, {"wght": w, "ROND": 100})
        f2.save(st_otf)
        print(f'2/{i} instanced wght={w}')

        ttf = os.path.join(td, f'static-{w}.ttf')
        run(sys.executable, os.path.join(ROOT, 'tools', 'cff2_to_glyf.py'),
            st_otf, ttf, '1.0')
        print(f'3/{i} glyf wght={w}')

        out = os.path.join(ROOT, 'fonts', f'rhr-{w}.woff2')
        run(sys.executable, '-m', 'fontTools.subset', ttf,
            f'--text-file={chars_file}', '--flavor=woff2',
            f'--output-file={out}')
        print(f'4/{i} woff2 wght={w} -> {os.path.getsize(out)} bytes')

# 清理舊的單一 VF 檔（若存在）
old = os.path.join(ROOT, 'fonts', 'rhr.woff2')
if os.path.exists(old):
    os.remove(old)
    print('removed old fonts/rhr.woff2')
print('done.')
