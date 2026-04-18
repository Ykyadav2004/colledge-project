from django.contrib import admin
from .models import Student, Course, Attendance, Grade, AttendanceSession


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'credits', 'created_at']
    search_fields = ['code', 'name']
    list_filter = ['credits']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['roll_number', 'first_name', 'last_name', 'email', 'is_active', 'enrollment_date']
    search_fields = ['roll_number', 'first_name', 'last_name', 'email']
    list_filter = ['is_active', 'gender', 'enrollment_date']
    filter_horizontal = ['courses']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'date', 'status']
    search_fields = ['student__roll_number', 'student__first_name', 'course__code']
    list_filter = ['status', 'date', 'course']
    date_hierarchy = 'date'


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'marks', 'grade', 'exam_type', 'created_at']
    search_fields = ['student__roll_number', 'student__first_name', 'course__code']
    list_filter = ['grade', 'exam_type', 'course']


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ['course', 'date', 'code', 'created_at', 'expires_at']
    search_fields = ['course__code', 'code']
    list_filter = ['date', 'course']
    date_hierarchy = 'date'
    readonly_fields = ['created_at', 'expires_at']
    fieldsets = (
        (None, {'fields': ('course', 'date', 'code')}),
        ('Timestamps', {'fields': ('created_at', 'expires_at')}),
    )
