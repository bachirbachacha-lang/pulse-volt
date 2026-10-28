"""Seals consensus results so the paper broker only accepts ones the consensus engine issued.

The seal is an HMAC over the decision contents with a secret that exists only in
this process's memory. A ConsensusResult built by hand (or edited after the
fact) has no valid seal, so it cannot open a paper position. Defence in depth:
the controller is still the only caller of ``PaperBroker.submit``.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

from trading.core.schemas import ConsensusResult

_KEY = secrets.token_bytes(32)


def _digest(r: ConsensusResult) -> str:
    votes = sorted((d.agent, d.signal_id, d.verdict.value) for d in r.decisions)
    msg = f"{r.signal_id}|{r.approved}|{r.quantity!r}|{votes}".encode()
    return hmac.new(_KEY, msg, hashlib.sha256).hexdigest()


def seal(r: ConsensusResult) -> ConsensusResult:
    r.seal = _digest(r)
    return r


def is_sealed(r: ConsensusResult) -> bool:
    return bool(r.seal) and hmac.compare_digest(r.seal, _digest(r))
