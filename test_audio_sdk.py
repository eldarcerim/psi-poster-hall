"""Optional offline SDK compatibility checks. Never contacts a media server."""
import base64
import json
import unittest
from audio.authority import mint_livekit_token

try:
    import livekit.api
    AVAILABLE=True
except ImportError:
    AVAILABLE=False


@unittest.skipUnless(AVAILABLE,'Optional approved-gateway SDK is not installed')
class AudioSDKTest(unittest.TestCase):
    def mint(self,publish):
        value=mint_livekit_token({'identity':'opaque-fixture','room':'psi-fixture-booth-1',
                                 'can_publish':publish},
                                {'api_key':'fixture-not-live','api_secret':'fixture-key-not-live-at-least-32-bytes-long',
                                 'server_url':'wss://fixture.invalid'})
        return json.loads(base64.urlsafe_b64decode(value['token'].split('.')[1]+'=='))

    def test_offline_subscribe_only_room_grant(self):
        token=self.mint(False)
        self.assertEqual(token['video']['room'],'psi-fixture-booth-1')
        self.assertFalse(token['video']['canPublish'])
        self.assertTrue(token['video']['canSubscribe'])
        self.assertFalse(token['video']['canPublishData'])

    def test_offline_presenter_grant_allows_only_microphone_for_30_seconds(self):
        token=self.mint(True)
        self.assertTrue(token['video']['canPublish'])
        self.assertEqual(token['video']['canPublishSources'],['microphone'])
        self.assertEqual(token['exp']-token['nbf'],30)


if __name__=='__main__':unittest.main()
