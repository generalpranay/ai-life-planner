"""
Configuration management for the AI Scheduler.

Loads configuration from environment variables with sensible defaults.
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass(frozen=True)
class DatabaseConfig:
    """Database connection configuration."""
    url: str = os.getenv("DATABASE_URL", "postgresql://postgres:change_me@localhost:5432/life_planner")
    

@dataclass(frozen=True)
class APIConfig:
    """API connection configuration."""
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    timeout: int = int(os.getenv("API_TIMEOUT", "30"))


@dataclass(frozen=True)
class SchedulerConfig:
    """Scheduler behavior configuration."""
    max_daily_work_hours: int = int(os.getenv("MAX_DAILY_WORK_HOURS", "10"))
    min_break_minutes: int = int(os.getenv("MIN_BREAK_MINUTES", "15"))
    preferred_hours_start: int = int(os.getenv("PREFERRED_STUDY_HOURS_START", "9"))
    preferred_hours_end: int = int(os.getenv("PREFERRED_STUDY_HOURS_END", "21"))
    max_block_duration: int = 120  # Max minutes per single block
    min_block_duration: int = 15   # Min minutes per single block


@dataclass(frozen=True)
class Config:
    """Main configuration container."""
    database: DatabaseConfig = DatabaseConfig()
    api: APIConfig = APIConfig()
    scheduler: SchedulerConfig = SchedulerConfig()


# Global config instance
config = Config()
