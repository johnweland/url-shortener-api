""" Core modules reused in the various Lambda Functions. """

from datetime import datetime, timezone

def get_current_time() -> str:
    """
    Get the current time in ISO format.

    Returns:
        str: The current time in ISO format, with the timezone offset replaced by 'Z'.
    """
    return (
        datetime.now(tz=timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
