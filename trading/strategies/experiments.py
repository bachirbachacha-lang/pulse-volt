"""Experimental variants of ORIGINAL_YOUTUBE_STRATEGY.

Rules:
* ORIGINAL_YOUTUBE_STRATEGY is never edited. Each experiment is a separate,
  named version (EXPERIMENT_01, EXPERIMENT_02, ...) defined only by parameter
  overrides on top of the original, plus the hypothesis that motivated it.
* A hypothesis must come from a failure analysis on DEVELOPMENT data and be
  checked on VALIDATION. The untouched TEST period is never used to choose
  between experiments.

No experiments are registered yet: there are no real-data results to base a
hypothesis on.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

from trading.core.schemas import StrategyDefinition
from trading.strategies.base import register
from trading.strategies.original_youtube.strategy import OriginalParams, OriginalYoutubeStrategy


@dataclass(frozen=True)
class Experiment:
    name: str
    hypothesis: str
    evidence: str  # which development-period analysis motivated it
    overrides: dict


EXPERIMENTS: dict[str, Experiment] = {}


def register_experiment(exp: Experiment) -> None:
    if not exp.name.startswith("EXPERIMENT_"):
        raise ValueError("experiment names must look like EXPERIMENT_01")
    if exp.name in EXPERIMENTS:
        raise ValueError(f"{exp.name} already registered")
    OriginalParams(**exp.overrides)  # validates the override keys
    EXPERIMENTS[exp.name] = exp
    register(exp.name)(type(exp.name, (OriginalYoutubeStrategy,), {}))


def experiment_definition(name: str, symbols: list[str], interval: str) -> StrategyDefinition:
    exp = EXPERIMENTS[name]
    params = {**asdict(OriginalParams()), **exp.overrides}
    return StrategyDefinition(name=name, version="0.1.0", symbols=symbols, interval=interval, params=params,
                              description=f"{exp.hypothesis} (evidence: {exp.evidence})")
