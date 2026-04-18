from django.test import TestCase
from django.urls import reverse
from .models import Course, Student, AttendanceSession, Attendance


class AttendanceCodeTests(TestCase):
    def setUp(self):
        # create or reuse a course and a student
        self.course, _ = Course.objects.get_or_create(code='MATH101', defaults={'name': 'Math'})
        self.student = Student.objects.create(
            roll_number='R001',
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            date_of_birth='2000-01-01'
        )

    def test_session_and_marking(self):
        # create session
        session = AttendanceSession.objects.create(course=self.course, date='2026-02-23')
        self.assertIsNotNone(session.code)
        # mark attendance via POST
        url = reverse('mark_attendance_code')
        response = self.client.post(url, {
            'code': session.code,
            'roll_number': self.student.roll_number,
            'latitude': '12.345678',
            'longitude': '98.765432'
        })
        self.assertEqual(response.status_code, 302)  # redirect
        # record should exist with location
        att = Attendance.objects.get(student=self.student, course=self.course, date=session.date)
        self.assertEqual(att.status, 'P')
        self.assertAlmostEqual(float(att.latitude), 12.345678, places=6)
        self.assertAlmostEqual(float(att.longitude), 98.765432, places=6)

    def test_code_expiration(self):
        # create session and force it expired
        session = AttendanceSession.objects.create(course=self.course, date='2026-02-23')
        # manually push expires_at back
        from django.utils import timezone
        session.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        session.save()
        url = reverse('mark_attendance_code')
        response = self.client.post(url, {'code': session.code, 'roll_number': self.student.roll_number})
        self.assertEqual(response.status_code, 302)
        # no attendance should be created
        self.assertFalse(Attendance.objects.filter(student=self.student).exists())

    def test_invalid_code(self):
        url = reverse('mark_attendance_code')
        response = self.client.post(url, {'code': 'BAD123', 'roll_number': self.student.roll_number})
        # should redirect back without creating any attendance
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Attendance.objects.filter(student=self.student).exists())

    def test_generate_duplicate_session(self):
        """Trying to create two sessions for same course+date should fail cleanly."""
        url = reverse('attendance_session_create')
        data = {'course': self.course.pk, 'date': '2026-02-23'}
        # first creation succeeds
        resp1 = self.client.post(url, data)
        self.assertEqual(resp1.status_code, 302)
        # second attempt should not redirect, should re-render form with error
        resp2 = self.client.post(url, data)
        self.assertEqual(resp2.status_code, 200)
        # form should show a unique constraint message
        self.assertContains(resp2, 'already')  # either our custom or Django's default
    def test_delete_and_regenerate_session(self):
        # create a session
        sess = AttendanceSession.objects.create(course=self.course, date='2026-02-23')
        # delete via POST
        del_url = reverse('attendance_session_delete', args=[sess.pk])
        resp = self.client.post(del_url)
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(AttendanceSession.objects.filter(pk=sess.pk).exists())
        # regeneration: create again then regenerate
        sess2 = AttendanceSession.objects.create(course=self.course, date='2026-02-23')
        regen_url = reverse('attendance_session_regenerate', args=[sess2.pk])
        resp2 = self.client.post(regen_url)
        self.assertEqual(resp2.status_code, 302)
        # new session should exist, old removed
        self.assertFalse(AttendanceSession.objects.filter(pk=sess2.pk).exists())
        self.assertTrue(AttendanceSession.objects.exclude(pk=sess2.pk).filter(course=self.course).exists())

    def test_date_filter_shows_only_selected_day(self):
        # create attendance records on two different dates
        a1 = Attendance.objects.create(
            student=self.student,
            course=self.course,
            date='2026-02-22',
            status='P'
        )
        a2 = Attendance.objects.create(
            student=self.student,
            course=self.course,
            date='2026-02-23',
            status='P'
        )
        url = reverse('attendance_list')
        resp = self.client.get(url, {'date': '2026-02-22'})
        self.assertEqual(resp.status_code, 200)
        # only a1 should be in context
        attendances = resp.context['attendances']
        self.assertEqual(len(attendances), 1)
        self.assertEqual(attendances[0].date.isoformat(), '2026-02-22')

    def test_marking_saves_time(self):
        session = AttendanceSession.objects.create(course=self.course, date='2026-02-23')
        url = reverse('mark_attendance_code')
        resp = self.client.post(url, {
            'code': session.code,
            'roll_number': self.student.roll_number,
            'latitude': '',
            'longitude': ''
        })
        self.assertEqual(resp.status_code, 302)
        att = Attendance.objects.get(student=self.student, course=self.course, date=session.date)
        self.assertIsNotNone(att.created_time)

    def test_update_attendance_status(self):
        # create attendance for a day
        att = Attendance.objects.create(
            student=self.student,
            course=self.course,
            date='2026-02-23',
            status='P'
        )
        url = reverse('attendance_update_status', args=[att.pk])
        resp = self.client.post(url, {'status': 'A'})
        self.assertEqual(resp.status_code, 302)
        att.refresh_from_db()
        self.assertEqual(att.status, 'A')
        # if a date filter parameter is given it should be preserved
        resp2 = self.client.post(url + '?date=2026-02-23', {'status': 'P'})
        self.assertEqual(resp2.url, reverse('attendance_list') + '?date=2026-02-23')

    def test_default_courses_exist(self):
        codes = set(Course.objects.values_list('code', flat=True))
        for expected in ['ENG101', 'MATH101', 'PHY101']:
            self.assertIn(expected, codes)
