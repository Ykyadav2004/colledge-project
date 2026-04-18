from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('', views.dashboard, name='dashboard'),

    # Student URLs
    path('students/', views.student_list, name='student_list'),
    path('students/add/', views.student_create, name='student_create'),
    path('students/<int:pk>/', views.student_detail, name='student_detail'),
    path('students/<int:pk>/edit/', views.student_update, name='student_update'),
    path('students/<int:pk>/delete/', views.student_delete, name='student_delete'),

    # Course URLs
    path('courses/', views.course_list, name='course_list'),
    path('courses/add/', views.course_create, name='course_create'),
    path('courses/<int:pk>/', views.course_detail, name='course_detail'),
    path('courses/<int:pk>/edit/', views.course_update, name='course_update'),
    path('courses/<int:pk>/delete/', views.course_delete, name='course_delete'),

    # Attendance URLs
    path('attendance/', views.attendance_list, name='attendance_list'),
    path('attendance/add/', views.attendance_create, name='attendance_create'),
    path('attendance/bulk/', views.bulk_attendance, name='bulk_attendance'),
    path('attendance/<int:pk>/status/', views.attendance_update_status, name='attendance_update_status'),
    path('attendance/course/<int:course_id>/students/', views.get_course_students, name='get_course_students'),
    # code-based / QR sessions
    path('attendance/sessions/', views.attendance_session_list, name='attendance_session_list'),
    path('attendance/sessions/add/', views.attendance_session_create, name='attendance_session_create'),
    path('attendance/sessions/<int:pk>/', views.attendance_session_detail, name='attendance_session_detail'),
    path('attendance/sessions/<int:pk>/qr/', views.attendance_session_qr, name='attendance_session_qr'),
    path('attendance/sessions/<int:pk>/delete/', views.attendance_session_delete, name='attendance_session_delete'),
    path('attendance/sessions/<int:pk>/regenerate/', views.attendance_session_regenerate, name='attendance_session_regenerate'),
    path('attendance/enter/', views.mark_attendance_with_code, name='mark_attendance_code'),

    # Grade URLs
    path('grades/', views.grade_list, name='grade_list'),
    path('grades/add/', views.grade_create, name='grade_create'),
    path('grades/<int:pk>/edit/', views.grade_update, name='grade_update'),
    path('grades/<int:pk>/delete/', views.grade_delete, name='grade_delete'),
]
