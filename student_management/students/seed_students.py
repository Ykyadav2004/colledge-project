import random
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'student_management.settings')
django.setup()

from students.models import Student, Course

# ensure courses exist
for code, name in [('ENG101','English'),('MATH101','Maths'),('PHY101','Physics')]:
    Course.objects.get_or_create(code=code, defaults={'name': name})

first_names=['Alice','Bob','Charlie','Diana','Ethan','Fiona','George','Hannah','Ian','Julia','Kevin','Laura','Mike','Nina','Oscar']
last_names=['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez']

for i in range(1,16):
    roll=f"S{i:03d}"
    if Student.objects.filter(roll_number=roll).exists():
        print('Exists', roll)
        continue
    fn=random.choice(first_names)
    ln=random.choice(last_names)
    email=f"{fn.lower()}.{ln.lower()}{i}@example.com"
    dob=f"200{random.randint(0,9)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
    stu=Student.objects.create(
        roll_number=roll,
        first_name=fn,
        last_name=ln,
        email=email,
        date_of_birth=dob
    )
    courses=list(Course.objects.all())
    stu.courses.set(random.sample(courses, k=random.randint(1,len(courses))))
    stu.save()
    print('Created', stu)

print('Total students:', Student.objects.count())
