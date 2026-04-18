from django.core.management.base import BaseCommand
import random

class Command(BaseCommand):
    help = 'Seed the database with sample student data'

    def handle(self, *args, **options):
        from students.models import Student, Course
        # ensure default courses
        for code, name in [('ENG101','English'),('MATH101','Maths'),('PHY101','Physics')]:
            Course.objects.get_or_create(code=code, defaults={'name': name})

        first_names=['Alice','Bob','Charlie','Diana','Ethan','Fiona','George','Hannah','Ian','Julia','Kevin','Laura','Mike','Nina','Oscar']
        last_names=['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez']

        created=0
        for i in range(1,16):
            roll=f"S{i:03d}"
            if Student.objects.filter(roll_number=roll).exists():
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
            created+=1
        self.stdout.write(self.style.SUCCESS(f'Created {created} students. Total now {Student.objects.count()}'))
