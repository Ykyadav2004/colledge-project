from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.contrib import messages
from django.db.models import Count, Avg, Q
from django.utils import timezone
from .models import Student, Course, Attendance, Grade, AttendanceSession
from .forms import (
    StudentForm,
    CourseForm,
    AttendanceForm,
    GradeForm,
    BulkAttendanceForm,
    AttendanceSessionForm,
    AttendanceCodeForm,
)


def dashboard(request):
    """Dashboard view showing statistics"""
    total_students = Student.objects.filter(is_active=True).count()
    total_courses = Course.objects.count()
    total_attendance = Attendance.objects.count()

    # Recent students
    recent_students = Student.objects.filter(is_active=True).order_by('-created_at')[:5]

    # Attendance stats for today
    today = timezone.now().date()
    today_attendance = Attendance.objects.filter(date=today)
    present_today = today_attendance.filter(status='P').count()
    absent_today = today_attendance.filter(status='A').count()

    # Grade distribution
    grade_stats = Grade.objects.values('grade').annotate(count=Count('grade')).order_by('grade')

    context = {
        'total_students': total_students,
        'total_courses': total_courses,
        'total_attendance': total_attendance,
        'recent_students': recent_students,
        'present_today': present_today,
        'absent_today': absent_today,
        'grade_stats': grade_stats,
    }
    return render(request, 'students/dashboard.html', context)


# Student Views
def student_list(request):
    """List all students"""
    query = request.GET.get('q', '')
    students = Student.objects.all()

    if query:
        students = students.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(roll_number__icontains=query) |
            Q(email__icontains=query)
        )

    context = {'students': students, 'query': query}
    return render(request, 'students/student_list.html', context)


def student_detail(request, pk):
    """View student details"""
    student = get_object_or_404(Student, pk=pk)
    attendances = student.attendances.all()[:10]
    grades = student.grades.all()

    # Calculate attendance percentage
    total_attendance = student.attendances.count()
    present_count = student.attendances.filter(status='P').count()
    attendance_percentage = (present_count / total_attendance * 100) if total_attendance > 0 else 0

    context = {
        'student': student,
        'attendances': attendances,
        'grades': grades,
        'attendance_percentage': round(attendance_percentage, 1),
    }
    return render(request, 'students/student_detail.html', context)


def student_create(request):
    """Create a new student"""
    if request.method == 'POST':
        form = StudentForm(request.POST)
        if form.is_valid():
            student = form.save()
            messages.success(request, f'Student {student.full_name} created successfully!')
            return redirect('student_list')
    else:
        form = StudentForm()

    return render(request, 'students/student_form.html', {'form': form, 'title': 'Add New Student'})


def student_update(request, pk):
    """Update an existing student"""
    student = get_object_or_404(Student, pk=pk)

    if request.method == 'POST':
        form = StudentForm(request.POST, instance=student)
        if form.is_valid():
            form.save()
            messages.success(request, f'Student {student.full_name} updated successfully!')
            return redirect('student_detail', pk=pk)
    else:
        form = StudentForm(instance=student)

    return render(request, 'students/student_form.html', {'form': form, 'title': 'Edit Student', 'student': student})


def student_delete(request, pk):
    """Delete a student"""
    student = get_object_or_404(Student, pk=pk)

    if request.method == 'POST':
        name = student.full_name
        student.delete()
        messages.success(request, f'Student {name} deleted successfully!')
        return redirect('student_list')

    return render(request, 'students/student_confirm_delete.html', {'student': student})


# Course Views
def course_list(request):
    """List all courses"""
    courses = Course.objects.annotate(student_count=Count('students'))
    return render(request, 'students/course_list.html', {'courses': courses})


def course_detail(request, pk):
    """View course details"""
    course = get_object_or_404(Course, pk=pk)
    students = course.students.all()
    grades = course.grades.all()

    # Calculate average marks
    avg_marks = grades.aggregate(avg=Avg('marks'))['avg'] or 0

    context = {
        'course': course,
        'students': students,
        'grades': grades,
        'avg_marks': round(avg_marks, 2),
    }
    return render(request, 'students/course_detail.html', context)


def course_create(request):
    """Create a new course"""
    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save()
            messages.success(request, f'Course {course.name} created successfully!')
            return redirect('course_list')
    else:
        form = CourseForm()

    return render(request, 'students/course_form.html', {'form': form, 'title': 'Add New Course'})


def course_update(request, pk):
    """Update an existing course"""
    course = get_object_or_404(Course, pk=pk)

    if request.method == 'POST':
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            form.save()
            messages.success(request, f'Course {course.name} updated successfully!')
            return redirect('course_detail', pk=pk)
    else:
        form = CourseForm(instance=course)

    return render(request, 'students/course_form.html', {'form': form, 'title': 'Edit Course', 'course': course})


def course_delete(request, pk):
    """Delete a course"""
    course = get_object_or_404(Course, pk=pk)

    if request.method == 'POST':
        name = course.name
        course.delete()
        messages.success(request, f'Course {name} deleted successfully!')
        return redirect('course_list')

    return render(request, 'students/course_confirm_delete.html', {'course': course})


# ----- Attendance Views -----
def attendance_list(request):
    """List attendance records. Support filtering by date via ?date=YYYY-MM-DD."""
    attendances = Attendance.objects.select_related('student', 'course').all()
    filter_date = request.GET.get('date')
    if filter_date:
        attendances = attendances.filter(date=filter_date)
    # limit to reasonable number for display
    attendances = attendances.order_by('-date', '-created_at')[:100]
    context = {'attendances': attendances, 'filter_date': filter_date}
    return render(request, 'students/attendance_list.html', context)


def attendance_update_status(request, pk):
    """Change status of a single attendance record (P/A/L)."""
    att = get_object_or_404(Attendance, pk=pk)
    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in dict(Attendance.STATUS_CHOICES):
            att.status = new_status
            att.save()
            messages.success(request, 'Attendance status updated.')
        else:
            messages.error(request, 'Invalid status.')
    # preserve date filter in redirect if provided
    date_param = request.GET.get('date')
    if date_param:
        from django.urls import reverse
        return redirect(f"{reverse('attendance_list')}?date={date_param}")
    return redirect('attendance_list')



def attendance_session_list(request):
    """List generated attendance sessions (codes)"""
    sessions = AttendanceSession.objects.select_related('course').all()[:50]
    return render(request, 'students/attendance_session_list.html', {'sessions': sessions})


from django.db import IntegrityError


def attendance_session_create(request):
    """Create a new session / code for attendance"""
    initial = {}
    if request.GET.get('course'):
        initial['course'] = request.GET.get('course')

    if request.method == 'POST':
        form = AttendanceSessionForm(request.POST)
        if form.is_valid():
            try:
                session = form.save()
            except IntegrityError:
                # unique_together prevents two sessions for same course+date
                form.add_error(None, 'A code has already been generated for this course on the selected date.')
            else:
                messages.success(request, f'Session created with code {session.code}')
                return redirect('attendance_session_detail', pk=session.pk)
    else:
        form = AttendanceSessionForm(initial=initial)

    return render(request, 'students/attendance_session_form.html', {'form': form, 'title': 'Generate Attendance Code'})


def attendance_session_detail(request, pk):
    """Detail view showing code and QR link"""
    session = get_object_or_404(AttendanceSession, pk=pk)
    # compute remaining seconds for timer
    context = {'session': session, 'remaining': session.remaining_seconds}
    return render(request, 'students/attendance_session_detail.html', context)


def attendance_session_qr(request, pk):
    """Return PNG image for QR code representing the session code"""
    import qrcode
    from io import BytesIO

    session = get_object_or_404(AttendanceSession, pk=pk)
    # encode the full mark-attendance URL so scanning redirects to form with code prefilled
    from django.urls import reverse
    full_url = request.build_absolute_uri(reverse('mark_attendance_code')) + f"?code={session.code}"
    qr = qrcode.make(full_url)
    buffer = BytesIO()
    qr.save(buffer, format='PNG')
    return HttpResponse(buffer.getvalue(), content_type='image/png')


def attendance_session_delete(request, pk):
    """Delete an existing attendance session after confirmation."""
    session = get_object_or_404(AttendanceSession, pk=pk)
    if request.method == 'POST':
        session.delete()
        messages.success(request, 'Attendance code deleted.')
        return redirect('attendance_session_list')
    return render(request, 'students/attendance_session_confirm_delete.html', {'session': session})


def attendance_session_regenerate(request, pk):
    """Remove the old session and create a new one for the same course/date."""
    session = get_object_or_404(AttendanceSession, pk=pk)
    if request.method == 'POST':
        course = session.course
        date = session.date
        session.delete()
        new = AttendanceSession.objects.create(course=course, date=date)
        messages.success(request, f'New attendance code generated: {new.code}')
        return redirect('attendance_session_detail', pk=new.pk)
    return render(request, 'students/attendance_session_confirm_regenerate.html', {'session': session})


def mark_attendance_with_code(request):
    """Allow student to enter a code (or scan) and roll number to record presence"""
    initial = {}
    # if QR encoded URL passed code parameter, prefill it
    if request.GET.get('code'):
        initial['code'] = request.GET.get('code')
    if request.method == 'POST':
        form = AttendanceCodeForm(request.POST)
        if form.is_valid():
            code = form.cleaned_data['code'].strip()
            roll = form.cleaned_data['roll_number'].strip()
            # optional location data
            latitude = form.cleaned_data.get('latitude')
            longitude = form.cleaned_data.get('longitude')
            try:
                session = AttendanceSession.objects.get(code=code)
            except AttendanceSession.DoesNotExist:
                messages.error(request, 'Invalid attendance code.')
                return redirect('mark_attendance_code')
            # check expiration
            if not session.is_valid:
                messages.error(request, 'Attendance code has expired.')
                return redirect('mark_attendance_code')
            try:
                student = Student.objects.get(roll_number=roll)
            except Student.DoesNotExist:
                messages.error(request, 'Roll number not found.')
                return redirect('mark_attendance_code')
            # create attendance record if not exists
            defaults = {'status': 'P'}
            if latitude is not None:
                defaults['latitude'] = latitude
            if longitude is not None:
                defaults['longitude'] = longitude
            try:
                att, created = Attendance.objects.get_or_create(
                    student=student,
                    course=session.course,
                    date=session.date,
                    defaults=defaults
                )
            except Exception as exc:  # catch OperationalError when column missing
                from django.db import OperationalError
                if isinstance(exc, OperationalError):
                    # very likely the migration wasn't applied; retry without coords
                    att, created = Attendance.objects.get_or_create(
                        student=student,
                        course=session.course,
                        date=session.date,
                        defaults={'status': 'P'}
                    )
                else:
                    raise
            if not created:
                messages.warning(request, 'Attendance already recorded for you.')
            else:
                messages.success(request, 'Your attendance has been marked. Thank you!')
            # after processing code entry, show attendance list so roll number is visible
            return redirect('attendance_list')
    else:
        form = AttendanceCodeForm(initial=initial)
    return render(request, 'students/attendance_code.html', {'form': form})


def attendance_create(request):
    """Create attendance record"""
    if request.method == 'POST':
        form = AttendanceForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Attendance recorded successfully!')
            return redirect('attendance_list')
    else:
        form = AttendanceForm()

    return render(request, 'students/attendance_form.html', {'form': form, 'title': 'Mark Attendance'})


def bulk_attendance(request):
    """Mark attendance for multiple students"""
    if request.method == 'POST':
        course_id = request.POST.get('course')
        date = request.POST.get('date')
        course = get_object_or_404(Course, pk=course_id)
        students = course.students.all()

        for student in students:
            status = request.POST.get(f'status_{student.id}', 'A')
            Attendance.objects.update_or_create(
                student=student,
                course=course,
                date=date,
                defaults={'status': status}
            )

        messages.success(request, f'Attendance marked for {students.count()} students!')
        return redirect('attendance_list')

    form = BulkAttendanceForm()
    return render(request, 'students/bulk_attendance.html', {'form': form})


def get_course_students(request, course_id):
    """AJAX view to get students for a course"""
    course = get_object_or_404(Course, pk=course_id)
    students = course.students.all()
    return render(request, 'students/partials/student_checkboxes.html', {'students': students})


# Grade Views
def grade_list(request):
    """List all grades"""
    grades = Grade.objects.select_related('student', 'course').all()
    return render(request, 'students/grade_list.html', {'grades': grades})


def grade_create(request):
    """Create a grade record"""
    if request.method == 'POST':
        form = GradeForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Grade recorded successfully!')
            return redirect('grade_list')
    else:
        form = GradeForm()

    return render(request, 'students/grade_form.html', {'form': form, 'title': 'Add Grade'})


def grade_update(request, pk):
    """Update a grade"""
    grade = get_object_or_404(Grade, pk=pk)

    if request.method == 'POST':
        form = GradeForm(request.POST, instance=grade)
        if form.is_valid():
            form.save()
            messages.success(request, 'Grade updated successfully!')
            return redirect('grade_list')
    else:
        form = GradeForm(instance=grade)

    return render(request, 'students/grade_form.html', {'form': form, 'title': 'Edit Grade', 'grade': grade})


def grade_delete(request, pk):
    """Delete a grade"""
    grade = get_object_or_404(Grade, pk=pk)

    if request.method == 'POST':
        grade.delete()
        messages.success(request, 'Grade deleted successfully!')
        return redirect('grade_list')

    return render(request, 'students/grade_confirm_delete.html', {'grade': grade})
