#!/usr/bin/env python3
"""Reproducible chunk-level diff of two Roblox binary place files (.rbxl).

Usage: python3 rbxl_diff.py OLD.rbxl NEW.rbxl

Reads both files (read-only), decompresses every chunk (LZ4 or ZSTD) and reports:
  - SHA-256 of both files
  - for every class (INST) and every property (PROP): identical or different
  - for differing PROP chunks: how many instances differ, and the first few referents
Instances are matched by referent. Exit code 0 = no content difference, 1 = differences.
"""
import hashlib, struct, sys
import lz4.block, zstandard


def read_chunks(path):
    data = open(path, "rb").read()
    assert data[:8] == b"<roblox!", "not a binary place file"
    pos = 8 + 6 + 2  # magic, signature, version
    n_classes, n_inst = struct.unpack_from("<iI", data, pos)
    pos += 8 + 8
    chunks = []
    while pos < len(data):
        name = data[pos:pos + 4]
        clen, ulen, _ = struct.unpack_from("<III", data, pos + 4)
        pos += 16
        if clen == 0:
            body = data[pos:pos + ulen]
            pos += ulen
        else:
            raw = data[pos:pos + clen]
            pos += clen
            if raw[:4] == b"\x28\xb5\x2f\xfd":
                body = zstandard.ZstdDecompressor().decompress(raw, max_output_size=ulen)
            else:
                body = lz4.block.decompress(raw, uncompressed_size=ulen)
        chunks.append((name.decode("latin1"), body))
        if name == b"END\x00":
            break
    return hashlib.sha256(data).hexdigest(), len(data), n_classes, n_inst, chunks


def rd_str(b, p):
    n = struct.unpack_from("<I", b, p)[0]
    return b[p + 4:p + 4 + n].decode("utf-8", "replace"), p + 4 + n


def interleaved_i32(b, p, n):
    raw = b[p:p + 4 * n]
    out = []
    for i in range(n):
        v = (raw[i] << 24) | (raw[n + i] << 16) | (raw[2 * n + i] << 8) | raw[3 * n + i]
        out.append((v >> 1) ^ -(v & 1))
    return out


def index(path):
    sha, size, nc, ni, chunks = read_chunks(path)
    classes, props, other = {}, {}, {}
    for name, body in chunks:
        if name == "INST":
            cid = struct.unpack_from("<I", body, 0)[0]
            cname, p = rd_str(body, 4)
            p += 1  # object format byte
            count = struct.unpack_from("<I", body, p)[0]
            refs = interleaved_i32(body, p + 4, count)
            acc = 0
            ids = []
            for r in refs:
                acc += r
                ids.append(acc)
            classes[cid] = (cname, ids)
        elif name == "PROP":
            cid = struct.unpack_from("<I", body, 0)[0]
            pname, p = rd_str(body, 4)
            props[(cid, pname)] = body[p:]
        else:
            other.setdefault(name, []).append(body)
    return sha, size, nc, ni, classes, props, other


def main(a, b):
    A, B = index(a), index(b)
    print("OLD", a, "sha256", A[0], "bytes", A[1], "classes", A[2], "instances", A[3])
    print("NEW", b, "sha256", B[0], "bytes", B[1], "classes", B[2], "instances", B[3])
    diffs = 0
    nameA = {cid: v[0] for cid, v in A[4].items()}
    nameB = {cid: v[0] for cid, v in B[4].items()}
    byNameA = {v[0]: (cid, v[1]) for cid, v in A[4].items()}
    byNameB = {v[0]: (cid, v[1]) for cid, v in B[4].items()}
    for cname in sorted(set(byNameA) | set(byNameB)):
        if cname not in byNameA or cname not in byNameB:
            print("CLASS only in", "NEW" if cname in byNameB else "OLD", cname)
            diffs += 1
            continue
        ra, rb = byNameA[cname][1], byNameB[cname][1]
        if ra != rb:
            print(f"CLASS {cname}: instances {len(ra)} -> {len(rb)} (referent lists differ)")
            diffs += 1
    pa = {(nameA[c], p): v for (c, p), v in A[5].items()}
    pb = {(nameB[c], p): v for (c, p), v in B[5].items()}
    nprops = 0
    for key in sorted(set(pa) | set(pb)):
        nprops += 1
        if pa.get(key) != pb.get(key):
            va, vb = pa.get(key), pb.get(key)
            print(f"PROP {key[0]}.{key[1]}: {'missing in OLD' if va is None else len(va)} -> {'missing in NEW' if vb is None else len(vb)} bytes;",
                  "first differing byte at", next((i for i in range(min(len(va or b''), len(vb or b''))) if va[i] != vb[i]), None))
            diffs += 1
    for k in sorted(set(A[6]) | set(B[6])):
        if A[6].get(k) != B[6].get(k):
            print(f"CHUNK {k}: differs ({[len(x) for x in A[6].get(k, [])]} -> {[len(x) for x in B[6].get(k, [])]} bytes)")
            diffs += 1
    print(f"compared {len(set(byNameA) | set(byNameB))} classes, {nprops} class properties, chunks {sorted(set(A[6]) | set(B[6]))}")
    print("RESULT:", "IDENTICAL CONTENT" if diffs == 0 else f"{diffs} DIFFERENCE(S)")
    return 1 if diffs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
