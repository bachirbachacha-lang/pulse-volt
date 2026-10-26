"""Consensus engine: combines agent decisions into one go/no-go.

Default rule is unanimous approval with veto: any REJECT blocks the trade,
ABSTAIN counts as neither, and at least one APPROVE plus a risk decision with
a positive quantity is required.
"""

from __future__ import annotations

from trading.core.log import get_logger, log_event
from trading.core.schemas import AgentDecision, ConsensusResult, RiskDecision, Verdict

logger = get_logger("agents.consensus")


class ConsensusEngine:
    def __init__(self, required_agents: set[str] | None = None) -> None:
        self.required_agents = required_agents or set()

    def decide(self, signal_id: str, decisions: list[AgentDecision]) -> ConsensusResult:
        seen = {d.agent for d in decisions}
        missing = self.required_agents - seen
        rejects = [d for d in decisions if d.verdict == Verdict.REJECT]
        approves = [d for d in decisions if d.verdict == Verdict.APPROVE]
        risk = next((d for d in decisions if isinstance(d, RiskDecision)), None)

        if any(d.signal_id != signal_id for d in decisions):
            approved, reason = False, "decision for a different signal supplied"
        elif missing:
            approved, reason = False, f"missing decisions from {sorted(missing)}"
        elif rejects:
            approved, reason = False, "; ".join(f"{d.agent}: {d.reason}" for d in rejects)
        elif not approves:
            approved, reason = False, "no agent approved"
        elif risk is None or risk.verdict != Verdict.APPROVE or risk.quantity <= 0:
            approved, reason = False, "no approved risk decision with a positive quantity"
        else:
            approved, reason = True, "unanimous"

        result = ConsensusResult(signal_id=signal_id, approved=approved, decisions=decisions, reason=reason,
                                 quantity=risk.quantity if (approved and risk) else 0.0)
        log_event(logger, "consensus.decided", signal_id=signal_id, approved=approved, reason=reason,
                  votes={d.agent: d.verdict for d in decisions})
        return result
