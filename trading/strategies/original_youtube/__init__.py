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
    SetupStatus,
    default_definition,
)
from trading.strategies.original_youtube.structure import StructureEngine, Trend

__all__ = ["STRATEGY_NAME", "OriginalParams", "OriginalYoutubeScanner", "OriginalYoutubeStrategy", "ScanResult",
           "Setup", "SetupStatus", "StructureEngine", "Trend", "default_definition"]
