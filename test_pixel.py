import json
import os
import sqlite3
import tempfile
import unittest

import service


class PixelServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        os.environ['APP_STORAGE_DIR'] = self.temp.name
        self.db = service.connect()

    def tearDown(self):
        self.db.close()
        self.temp.cleanup()

    def call(self, op, data):
        return service.handle({'schema': 1, 'method': 'POST', 'path': op, 'public': False,
                               'actor': {'scope': 'app', 'access': 'write', 'delegated': False}, 'body': data}, self.db)

    def test_appearance_round_trip_and_only_own_profile_changes(self):
        look = {'skin': 4, 'hair': 2, 'style': 3, 'shirt': 5, 'pants': 2}
        owner = self.call('create', {'name': 'Pixel test', 'count': 6, 'nameTag': 'Host', 'avatar': look})
        visitor = self.call('join', {'eventId': owner['eventId'], 'name': 'Visitor', 'avatar': {'shirt': 2}})
        result = self.call('sync', {'session': visitor['session']})
        host = next(p for p in result['participants'] if p['id'] == owner['participantId'])
        self.assertEqual(host['avatar'], look)
        self.assertEqual(host['name'], 'Host')
        self.call('profile', {'session': visitor['session'], 'name': 'Changed', 'avatar': {'shirt': 7}})
        result = self.call('sync', {'session': owner['session']})
        self.assertEqual(result['self']['avatar'], look)
        self.assertEqual(next(p for p in result['participants'] if p['id']==visitor['participantId'])['avatar']['shirt'], 7)
        with self.assertRaises(service.Problem):
            self.call('profile', {'session': visitor['session'], 'role': 'organizer', 'avatar': look})
        self.assertEqual(self.call('sync', {'session': visitor['session']})['self']['role'], 'participant')

    def test_untrusted_appearance_rejected_without_creating_event(self):
        for bad in ({'shirt': 99}, {'skin': True}, {'hair': 'red'}, {'style': -1}, {'role': 'organizer'}, []):
            with self.assertRaises(service.Problem):
                self.call('create', {'avatar': bad})
        self.assertEqual(self.call('events', {})['events'], [])

    def test_solid_position_rejected_and_every_booth_entry_is_reachable(self):
        owner = self.call('create', {'count': 24})
        first = self.call('sync', {'session': owner['session']})
        with self.assertRaises(service.Problem):
            self.call('sync', {'session': owner['session'], 'x': 155, 'y': 155})
        after = self.call('sync', {'session': owner['session']})
        self.assertEqual((after['self']['x'], after['self']['y']), (first['self']['x'], first['self']['y']))
        for n in range(1, 25):
            p = service.booth_position(n)
            state = self.call('sync', {'session': owner['session'], 'x': p['x'], 'y': p['y']+35, 'direction': 'up'})
            self.assertEqual(state['self']['booth'], n)
            self.assertEqual(state['self']['direction'], 'up')
        for n in range(1, 25):
            g = service.geometry(n)
            self.assertTrue(service.can_stand(n, g['width']/2, g['height']-85))

    def test_meet_assignment_is_organizer_only_and_validation_rolls_back(self):
        owner = self.call('create', {'count': 2})
        inv = self.call('invite', {'session': owner['session'], 'booth': 1})
        presenter = self.call('join', {'eventId': owner['eventId'], 'name': 'Presenter', 'invite': inv['invite']})
        link = 'https://meet.google.com/abc-defg-hij'
        self.call('edit-booth', {'session': owner['session'], 'booth': 1, 'meet_url': link})
        self.assertEqual(self.call('sync', {'session': presenter['session']})['booths'][0]['meet_url'], link)
        with self.assertRaises(service.Problem):
            self.call('edit-booth', {'session': presenter['session'], 'booth': 1, 'meet_url': ''})
        self.call('edit-booth', {'session': presenter['session'], 'booth': 1, 'title': 'Allowed own title', 'meet_url': link})
        for invalid in ('javascript:alert(1)', 'https://meet.google.com.evil.test/abc-defg-hij',
                        'https://user@meet.google.com/abc-defg-hij', 'http://meet.google.com/abc-defg-hij',
                        'https://meet.google.com/abc-defg-hij?secret=abc'):
            with self.assertRaises(service.Problem):
                self.call('edit-booth', {'session': owner['session'], 'booth': 1, 'meet_url': invalid, 'title': 'Must rollback'})
        state = self.call('sync', {'session': owner['session']})
        self.assertEqual(state['booths'][0]['title'], 'Allowed own title')
        self.assertEqual(state['booths'][0]['meet_url'], link)
        self.assertEqual(state['booths'][1]['meet_url'], '')

    def test_migration_keeps_existing_poster_question_and_legacy_appearance(self):
        owner = self.call('create', {'count': 1})
        self.call('sync', {'session': owner['session'], 'x': 155, 'y': 190})
        self.call('question', {'session': owner['session'], 'text': 'Keep this question'})
        self.db.execute("UPDATE booths SET poster_name='keep.pdf',poster_type='application/pdf',poster_data='fixture' WHERE event=?", (owner['eventId'],))
        self.db.commit()
        # Rebuild only the throwaway test sessions table in its original schema.
        self.db.execute('ALTER TABLE sessions DROP COLUMN avatar')
        self.db.execute('ALTER TABLE sessions DROP COLUMN direction')
        self.db.execute('ALTER TABLE booths DROP COLUMN meet_url')
        self.db.commit()
        self.db.close()
        self.db = service.connect()
        state = self.call('sync', {'session': owner['session']})
        self.assertEqual(state['questions'][0]['body'], 'Keep this question')
        self.assertTrue(state['booths'][0]['hasPoster'])
        self.assertEqual(state['booths'][0]['poster_name'], 'keep.pdf')
        self.assertEqual(state['self']['avatar'], service.avatar())
        self.db.close()
        self.db = service.connect()
        self.assertEqual(len(self.call('events', {})['events']), 1)


if __name__ == '__main__':
    unittest.main()
