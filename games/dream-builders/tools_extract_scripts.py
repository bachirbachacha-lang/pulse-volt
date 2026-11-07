import struct, sys, os, re
try:
    import zstandard
except ImportError:
    zstandard = None
def lz4dec(src, size):
    dst = bytearray(); i = 0; n = len(src)
    while i < n:
        tok = src[i]; i += 1; ll = tok >> 4
        if ll == 15:
            while True:
                b = src[i]; i += 1; ll += b
                if b != 255: break
        dst += src[i:i+ll]; i += ll
        if i >= n: break
        off = src[i] | (src[i+1] << 8); i += 2; ml = tok & 15
        if ml == 15:
            while True:
                b = src[i]; i += 1; ml += b
                if b != 255: break
        ml += 4; st = len(dst) - off
        for k in range(ml): dst.append(dst[st+k])
    return bytes(dst)
data = open(sys.argv[1],'rb').read(); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
pos = 32; classes = {}; inst_class = {}; props = {}; parent = {}
def deint(b, n):
    vals = []
    for j in range(n):
        x = (b[j] << 24) | (b[n+j] << 16) | (b[2*n+j] << 8) | b[3*n+j]
        vals.append((x >> 1) ^ -(x & 1))
    return vals
def refs(b, n):
    v = deint(b, n); acc = 0; r = []
    for x in v: acc += x; r.append(acc)
    return r
while pos < len(data):
    name = data[pos:pos+4]; clen, ulen = struct.unpack('<II', data[pos+4:pos+12]); pos += 16
    if clen == 0: body = data[pos:pos+ulen]; pos += ulen
    else:
        raw = data[pos:pos+clen]; pos += clen
        body = zstandard.ZstdDecompressor().decompress(raw, max_output_size=ulen) if raw[:4] == b'\x28\xb5\x2f\xfd' else lz4dec(raw, ulen)
    if name == b'END\x00': break
    if name == b'INST':
        cid, = struct.unpack('<i', body[:4]); l, = struct.unpack('<I', body[4:8]); cn = body[8:8+l].decode(); p = 8+l+1
        n, = struct.unpack('<I', body[p:p+4]); p += 4
        rs = refs(body[p:p+4*n], n); classes[cid] = (cn, rs)
        for r in rs: inst_class[r] = cn
    elif name == b'PROP':
        cid, = struct.unpack('<i', body[:4]); l, = struct.unpack('<I', body[4:8]); pn = body[8:8+l].decode(); p = 8+l; t = body[p]; p += 1
        if t == 1 and pn in ('Name', 'Source'):
            rs = classes[cid][1]
            for r in rs:
                sl, = struct.unpack('<I', body[p:p+4]); props.setdefault(r, {})[pn] = body[p+4:p+4+sl].decode('utf-8', 'replace'); p += 4+sl
    elif name == b'PRNT':
        n, = struct.unpack('<I', body[1:5]); a = refs(body[5:5+4*n], n); b = refs(body[5+4*n:5+8*n], n)
        for c, pr in zip(a, b): parent[c] = pr
def full(r):
    parts = []
    while r in inst_class:
        parts.append(props.get(r, {}).get('Name', '?')); r = parent.get(r, -1)
    return '.'.join(reversed(parts))
n = 0
for r, cn in inst_class.items():
    if cn in ('Script', 'LocalScript', 'ModuleScript'):
        ext = {'Script': '.server.lua', 'LocalScript': '.client.lua', 'ModuleScript': '.module.lua'}[cn]
        fn = re.sub(r'[^\w.\-]', '_', full(r)) + ext
        open(os.path.join(out, fn), 'w').write(props.get(r, {}).get('Source', '')); n += 1
print(n)
