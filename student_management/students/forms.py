from django import forms
from .models import Student, Course, Attendance, Grade, AttendanceSession


class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = [
            'roll_number', 'first_name', 'last_name', 'email', 'phone',
            'gender', 'date_of_birth', 'address', 'courses', 'is_active'
        ]
        widgets = {
            'roll_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter Roll Number'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter First Name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter Last Name'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Enter Email'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter Phone Number'}),
            'gender': forms.Select(attrs={'class': 'form-select'}),
            'date_of_birth': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Enter Address'}),
            'courses': forms.SelectMultiple(attrs={'class': 'form-select', 'size': 5}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }


class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['name', 'code', 'credits', 'description']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter Course Name'}),
            'code': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter Course Code'}),
            'credits': forms.NumberInput(attrs={'class': 'form-control', 'min': 1, 'max': 10}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Enter Description'}),
        }


class AttendanceForm(forms.ModelForm):
    class Meta:
        model = Attendance
        fields = ['student', 'course', 'date', 'status', 'remarks']
        widgets = {
            'student': forms.Select(attrs={'class': 'form-select'}),
            'course': forms.Select(attrs={'class': 'form-select'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'remarks': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Remarks (optional)'}),
        }


class GradeForm(forms.ModelForm):
    class Meta:
        model = Grade
        fields = ['student', 'course', 'marks', 'exam_type', 'remarks']
        widgets = {
            'student': forms.Select(attrs={'class': 'form-select'}),
            'course': forms.Select(attrs={'class': 'form-select'}),
            'marks': forms.NumberInput(attrs={'class': 'form-control', 'min': 0, 'max': 100, 'step': '0.01'}),
            'exam_type': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g., Midterm, Final'}),
            'remarks': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Remarks (optional)'}),
        }


class BulkAttendanceForm(forms.Form):
    course = forms.ModelChoiceField(
        queryset=Course.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    date = forms.DateField(
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'})
    )


class AttendanceSessionForm(forms.ModelForm):
    class Meta:
        model = AttendanceSession
        fields = ['course', 'date']
        widgets = {
            'course': forms.Select(attrs={'class': 'form-select'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }


class AttendanceCodeForm(forms.Form):
    code = forms.CharField(
        max_length=32,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter attendance code or paste text from QR'})
    )
    roll_number = forms.CharField(
        max_length=20,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Your roll number'})
    )
    # hidden fields populated via JS geolocation
    latitude = forms.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        widget=forms.HiddenInput()
    )
    longitude = forms.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        widget=forms.HiddenInput()
    )
