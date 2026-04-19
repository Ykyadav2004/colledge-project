const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');

const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Electronics', 'Information Technology', 'Chemical Engineering', 'Physics', 'Mathematics', 'Chemistry'];

const firstNames = ['Rahul', 'Amit', 'Vijay', 'Sanjay', 'Ravi', 'Kunal', 'Punit', 'Ankit', 'Vikram', 'Deepak', 'Priya', 'Anjali', 'Kavita', 'Neha', 'Pooja', 'Rita', 'Sunita', 'Meera', 'Tara', 'Nisha', 'Arjun', 'Krishna', 'Ishaan', 'Aditya', 'Raj', 'Om', 'Yash', 'Dev', 'Aryan', 'Kabir', 'Sneha', 'Divya', 'Aisha', 'Fatima', 'Zara', 'Riya', 'Kiran', 'Tina', 'Ruby', 'Nancy', 'Rohit', 'Mohit', 'Nitin', 'Sahil', 'Ashish', 'Gaurav', 'Manish', 'Ajay', 'Sumit', 'Vivek'];

const lastNames = ['Sharma', 'Singh', 'Patel', 'Gupta', 'Kumar', 'Verma', 'Yadav', 'Reddy', 'Rao', 'Joshi', 'Shah', 'Mehta', 'Chopra', 'Kapoor', 'Malhotra', 'Khanna', 'Bhatia', 'Sinha', 'Mishra', 'Pandey'];

const studentRollPrefixes = ['CS', 'EE', 'ME', 'CE', 'IT', 'EC', 'CH', 'PH', 'MA', 'CY'];

function generateEmail(firstName, lastName, rollNumber, role) {
  return `${firstName.toLowerCase()}.${rollNumber.toLowerCase()}@college.edu`;
}

async function seedUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/student_erp');
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    console.log('Cleared existing users');

    const users = [];

    // Create 10 teachers
    for (let i = 0; i < 10; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[i % departments.length];
      const rollNumber = `TCH${String(1000 + i).padStart(4, '0')}`;
      const email = generateEmail(firstName, lastName, rollNumber, 'teacher');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      users.push({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'teacher',
        rollNumber,
        department,
        isActive: true
      });
    }

    // Create 50 students
    for (let i = 0; i < 50; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const prefix = studentRollPrefixes[departments.indexOf(department) % studentRollPrefixes.length];
      const rollNumber = `${prefix}${String(2024001 + i).padStart(7, '0')}`;
      const email = generateEmail(firstName, lastName, rollNumber, 'student');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      users.push({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'student',
        rollNumber,
        department,
        isActive: true
      });
    }

    await User.insertMany(users);
    console.log(`Created ${users.length} users (10 teachers, 50 students)`);

    console.log('\n=== LOGIN CREDENTIALS ===\n');
    console.log('TEACHERS (email / password):');
    for (let i = 0; i < 10; i++) {
      console.log(`  ${users[i].email} / password123`);
    }
    console.log('\nSTUDENTS (email / password):');
    for (let i = 10; i < 30; i++) {
      console.log(`  ${users[i].email} / password123`);
    }
    console.log('  ... (and 20 more students)');
    console.log('\n===========================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedUsers();