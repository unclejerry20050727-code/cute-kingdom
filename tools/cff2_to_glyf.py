#!/usr/bin/env python3
"""靜態 CFF2 OTF → TrueType (glyf) TTF 轉換（cu2qu 三次貝茲→二次）。

用途：iOS 舊版 WebKit 對 CFF2/VF 的 woff2 渲染有已知怪異（glyph 錯位/亂碼），
TTF(glyf) 輪廓的 woff2 是相容性最好的網路字型路徑。
輸入必須是已 instance 的靜態字（無 fvar、無 CFF2 blend）。

用法： /tmp/fontenv/bin/python tools/cff2_to_glyf.py <in-static-cff2.otf> <out.ttf> [max_err]
"""
import sys
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen

def convert(in_path, out_path, max_err=1.0):
    font = TTFont(in_path)
    if 'fvar' in font:
        sys.exit('input still has fvar — must be static (instance first)')
    if 'CFF2' not in font:
        sys.exit('input has no CFF2 table')
    glyphSet = font.getGlyphSet()
    glyphOrder = font.getGlyphOrder()

    glyf = newTable('glyf')
    glyf.glyphs = {}
    glyf.glyphOrder = glyphOrder
    for name in glyphOrder:
        ttPen = TTGlyphPen(None)
        cu2quPen = Cu2QuPen(ttPen, max_err, reverse_direction=True)
        glyphSet[name].draw(cu2quPen)
        glyf[name] = ttPen.glyph()

    del font['CFF2']
    font['glyf'] = glyf
    loca = newTable('loca')
    loca.loca = [0] * (len(glyphOrder) + 1)
    font['loca'] = loca
    font['head'].glyphDataFormat = 0
    font['maxp'].version = 0x00010000  # TTF maxp
    for fld in ('maxPoints', 'maxContours', 'maxCompositePoints',
                'maxCompositeContours', 'maxComponentElements',
                'maxZones', 'maxTwilightPoints', 'maxStorage',
                'maxFunctionDefs', 'maxInstructionDefs', 'maxStackElements',
                'maxSizeOfInstructions'):
        setattr(font['maxp'], fld, 0)
    font['hhea'].maxZones = 1
    font['post'].version = 2.0
    font.save(out_path)
    print(f'ok: {len(glyphOrder)} glyphs -> {out_path}')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    err = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    convert(sys.argv[1], sys.argv[2], err)
