#!/usr/bin/env python3
"""Compare two saved outputs of villa10_live/01_fingerprint_readonly.lua (for example BEFORE and AFTER_R0, taken in
different Studio sessions). The first line (label, place) is ignored; every other line must be identical.
Also prints the digest that 01's own hash function gives for lines 2..end, so a saved text can be checked against
the value Studio printed.

Usage: python3 compare_fingerprints.py A.txt B.txt      exit code 0 = identical, 1 = different
"""
import sys


def digest(s):
    h1 = h2 = 0
    for b in s.encode():
        h1 = (h1 * 31 + b) % 1000000007
        h2 = (h2 * 131 + b) % 998244353
    return "%09d-%09d" % (h1, h2)


def body(path):
    lines = open(path, encoding="utf-8").read().rstrip("\n").split("\n")
    return lines[0], lines[1:]


def main(a, b):
    fa, la = body(a)
    fb, lb = body(b)
    print("A:", fa)
    print("B:", fb)
    print("A lines 2..end digest", digest("\n".join(la)), "| B lines 2..end digest", digest("\n".join(lb)))
    diffs = [(i + 2, x, y) for i, (x, y) in enumerate(zip(la, lb)) if x != y]
    if len(la) != len(lb):
        print("line counts differ:", len(la) + 1, len(lb) + 1)
    for n, x, y in diffs[:20]:
        print(f"line {n}:\n  A {x}\n  B {y}")
    same = not diffs and len(la) == len(lb)
    print("RESULT:", "IDENTICAL (apart from line 1)" if same else f"{len(diffs)} line(s) differ")
    return 0 if same else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
