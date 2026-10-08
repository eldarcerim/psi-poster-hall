"""Dormant integration for a reviewed media gateway; not called by service.py.

No provider account, credential, network connection or grant is created by the
installed PSI app. A future gateway must supply an approved private authority
and LiveKit configuration, not an owner Mobius token.
"""
import time


def membership(db, participant_id, expected_event, expected_booth, now=None):
    """Authoritative lease: stale presence/closed events/other booths deny access."""
    now = time.time() if now is None else now
    row = db.execute(
        "SELECT s.*, e.is_open FROM sessions s JOIN events e ON e.id=s.event "
        "WHERE s.id=?", (participant_id,)).fetchone()
    if (row is None or row["expires"] <= now or row["seen"] <= now - 20
            or not row["is_open"] or row["event"] != expected_event
            or row["booth"] != expected_booth):
        raise PermissionError("Booth lease no longer valid")
    return {
        "identity": row["id"],
        "room": f"psi-{row['event']}-booth-{row['booth']}",
        "can_publish": row["role"] == "organizer" or
                       (row["role"] == "presenter" and row["assigned"] == row["booth"]),
    }


def mint_livekit_token(lease, config):
    """Run only on the approved private gateway with livekit-api installed.

    `lease` comes from membership(), NEVER client-provided roles or room names.
    The gateway still has to recheck membership and remove expired occupants;
    token TTL alone cannot disconnect a room already joined.
    """
    if not config or not all(config.get(k) for k in ("server_url", "api_key", "api_secret")):
        raise RuntimeError("Live audio has not been approved and configured")
    from datetime import timedelta
    from livekit.api import AccessToken, VideoGrants
    token = (AccessToken(config["api_key"], config["api_secret"])
             .with_identity(lease["identity"])
             .with_ttl(timedelta(seconds=30))
             .with_grants(VideoGrants(room_join=True, room=lease["room"],
                                     can_publish=lease["can_publish"], can_subscribe=True,
                                     can_publish_data=False, can_publish_sources=["microphone"])))
    return {"serverUrl": config["server_url"], "token": token.to_jwt(),
            "room": lease["room"], "canPublish": lease["can_publish"],
            "expiresAt": time.time() + 30}


async def enforce_booth_lease(livekit_api, room_name, participant_id, recheck):
    """Gateway calls every 2s AND on explicit booth switch/leave/close.

    `recheck` reads the private authority and fails closed if it is unreachable.
    Supply SDK clients only on the reviewed gateway, never in the PSI frame.
    """
    from livekit.api import RoomParticipantIdentity
    try:
        lease = await recheck()
        if lease["room"] != room_name:
            raise PermissionError("Participant moved")
    except Exception:
        await livekit_api.room.remove_participant(
            RoomParticipantIdentity(room=room_name, identity=participant_id))
        return False
    return True
