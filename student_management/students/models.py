import uuid

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Course(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    credits = models.IntegerField(default=3)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['code']


class Student(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    roll_number = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M')
    date_of_birth = models.DateField()
    address = models.TextField(blank=True)
    enrollment_date = models.DateField(auto_now_add=True)
    courses = models.ManyToManyField(Course, blank=True, related_name='students')
    is_active = models.BooleanField(default=True)
    photo = models.ImageField(upload_to='student_photos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.roll_number} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        ordering = ['roll_number']


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('P', 'Present'),
        ('A', 'Absent'),
        ('L', 'Late'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    remarks = models.CharField(max_length=200, blank=True)
    # optional GPS coordinates where student submitted the code
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Latitude where attendance was marked"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        help_text="Longitude where attendance was marked"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        base = f"{self.student.roll_number} - {self.course.code} - {self.date} {self.time} - {self.get_status_display()}"
        if self.latitude is not None and self.longitude is not None:
            base += f" @({self.latitude},{self.longitude})"
        return base
    @property
    def created_time(self):
        """Return the time portion of the creation timestamp."""
        return self.created_at.time() if self.created_at else None
    class Meta:
        ordering = ['-date']
        unique_together = ['student', 'course', 'date']


class AttendanceSession(models.Model):
    """Represents a timed attendance session for a course that students can
    join by entering a generated code or scanning a QR image. Session codes
    expire a short time after creation to prevent reuse."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sessions')
    date = models.DateField()
    code = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True)

    def __str__(self):
        return f"{self.course.code} - {self.date} [{self.code}]"

    def save(self, *args, **kwargs):
        from django.utils import timezone
        # generate a random code if not provided
        if not self.code:
            self.code = uuid.uuid4().hex[:8].upper()
        # set expiration two minutes from now if not already set
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=2)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        from django.utils import timezone
        return timezone.now() <= self.expires_at

    @property
    def remaining_seconds(self):
        from django.utils import timezone
        delta = self.expires_at - timezone.now()
        return max(int(delta.total_seconds()), 0)

    class Meta:
        ordering = ['-date']
        unique_together = ['course', 'date']


class Grade(models.Model):
    GRADE_CHOICES = [
        ('A+', 'A+ (90-100)'),
        ('A', 'A (85-89)'),
        ('B+', 'B+ (80-84)'),
        ('B', 'B (75-79)'),
        ('C+', 'C+ (70-74)'),
        ('C', 'C (65-69)'),
        ('D', 'D (60-64)'),
        ('F', 'F (Below 60)'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='grades')
    marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, blank=True)
    exam_type = models.CharField(max_length=50, default='Final')
    remarks = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-calculate grade based on marks
        marks = float(self.marks)
        if marks >= 90:
            self.grade = 'A+'
        elif marks >= 85:
            self.grade = 'A'
        elif marks >= 80:
            self.grade = 'B+'
        elif marks >= 75:
            self.grade = 'B'
        elif marks >= 70:
            self.grade = 'C+'
        elif marks >= 65:
            self.grade = 'C'
        elif marks >= 60:
            self.grade = 'D'
        else:
            self.grade = 'F'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.roll_number} - {self.course.code} - {self.grade}"

    class Meta:
        ordering = ['-created_at']
        unique_together = ['student', 'course', 'exam_type']
