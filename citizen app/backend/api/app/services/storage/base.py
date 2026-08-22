"""
Storage abstraction. Citizen photos/videos/report evidence never touch
Postgres directly (section 3/38) — they go through whichever
`StorageService` implementation is active, and only the returned URL is
persisted on the row.
"""
from abc import ABC, abstractmethod


class StorageError(Exception):
    pass


class StorageService(ABC):
    @abstractmethod
    async def upload(self, *, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Persist the file and return a publicly reachable URL."""
        raise NotImplementedError

    @abstractmethod
    async def delete(self, url: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def demote(self, url: str) -> None:
        """Storage-optimization for evidence that didn't clear the
        hazard-worthy confidence bar (see `app/api/v1/fleet/observations.py`
        — a fleet frame the model gave *some* confidence to, just not
        enough to promote to a Hazard). Rather than keep a full-resolution
        color JPEG for something that's not going into any hazard's
        evidence trail, this converts the stored image to a small
        grayscale thumbnail in place (same URL, far smaller file) — cheap
        enough to keep around for anomaly review (§Data Anomalies) without
        the storage cost of the original.

        Deliberately does NOT delete the file outright: under normal
        operation the mobile client already filters these out before ever
        uploading (see fleetoperator's `DetectionTracker` — a sub-threshold
        detection never reaches this endpoint), so anything landing here is
        itself a signal worth keeping a trace of, not discarding entirely.
        A scheduled hard-delete after a retention window is a natural
        follow-up once this codebase has a job scheduler (see DEFERRED.md)
        — `delete()` above is what that job would call.
        """
        raise NotImplementedError
