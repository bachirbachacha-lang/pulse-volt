"""ORIGINAL_YOUTUBE_STRATEGY: omarnowick's No Wick strategy, implemented as taught.

Keep this package unchanged as the reference. Put experiments in a separate package.
"""

from trading.strategies.original_youtube.strategy import (
    STRATEGY_NAME,
    OriginalParams,
    OriginalYoutubeScanner,
    OriginalYoutubeStrategy,
    ScanResult,
    Setup,
    SetupCategory,
    SetupStatus,
    default_definition,
)
from trading.strategies.original_youtube.structure import Phase, StructureEngine, Trend

__all__ = ["STRATEGY_NAME", "OriginalParams", "OriginalYoutubeScanner", "OriginalYoutubeStrategy", "ScanResult",
           "Phase", "Setup", "SetupCategory", "SetupStatus", "StructureEngine", "Trend", "default_definition"]
