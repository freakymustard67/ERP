import os
from dataclasses import dataclass, field


DEFAULT_THREAD_ID = "340282366841710301281176154729206641683"
DEFAULT_SCHOOL_ID = "875"
DEFAULT_BASE = "https://mob.parentconnect.in/ssdiary/parentApp"


def _csv(value: str) -> list[str]:
    return [p.strip() for p in value.split(",") if p.strip()]


def _ints(value: str) -> list[int]:
    out: list[int] = []
    for p in _csv(value):
        try:
            out.append(int(p))
        except ValueError:
            pass
    return out or [1511360]


@dataclass
class Config:
    ig_user: str = ""
    ig_pass: str = ""
    thread_ids: list[str] = field(default_factory=lambda: [DEFAULT_THREAD_ID])
    session_file: str = "data/ig_session.json"
    carmel_phone: str = ""
    carmel_school_id: str = DEFAULT_SCHOOL_ID
    carmel_base: str = DEFAULT_BASE
    carmel_lms_base: str = "https://ssdiary.com/ssdiary/Lms"
    state_file: str = "data/sent_circulars.json"
    student_ids: list[int] = field(default_factory=lambda: [1511360])

    @classmethod
    def from_env(cls) -> "Config":
        threads_raw = os.environ.get("IG_THREAD_IDS", DEFAULT_THREAD_ID)
        return cls(
            ig_user=os.environ.get("IG_USER", ""),
            ig_pass=os.environ.get("IG_PASS", ""),
            thread_ids=_csv(threads_raw) or [DEFAULT_THREAD_ID],
            session_file=os.environ.get("IG_SESSION_FILE", "data/ig_session.json"),
            carmel_phone=os.environ.get("CARMEL_PHONE", ""),
            carmel_school_id=os.environ.get("CARMEL_SCHOOL_ID", DEFAULT_SCHOOL_ID),
            carmel_base=os.environ.get("CARMEL_BASE", DEFAULT_BASE),
            carmel_lms_base=os.environ.get(
                "CARMEL_LMS_BASE", "https://ssdiary.com/ssdiary/Lms"
            ),
            state_file=os.environ.get("STATE_FILE", "data/sent_circulars.json"),
            student_ids=_ints(os.environ.get("CARMEL_STUDENT_IDS", "1511360")),
        )
