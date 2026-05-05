const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Court = require('./models/Court');

const courts = [
  { name: 'Smash Arena', address: 'Shankar Nagar, Nagpur', lat: 21.1520, lng: 79.0950, sports: ['Badminton', 'Pickleball'], pricePerHour: 80, rating: 4.8, totalCourts: 4 },
  { name: 'Olympic Badminton Club', address: 'Dharampeth, Nagpur', lat: 21.1475, lng: 79.0870, sports: ['Badminton'], pricePerHour: 60, rating: 4.3, totalCourts: 2 },
  { name: 'City Sports Complex', address: 'Ramdaspeth, Nagpur', lat: 21.1440, lng: 79.0820, sports: ['Badminton', 'Basketball', 'Football'], pricePerHour: 100, rating: 4.6, totalCourts: 6 },
  { name: 'Nagpur Basketball Court', address: 'Sitabuldi, Nagpur', lat: 21.1500, lng: 79.0800, sports: ['Basketball'], pricePerHour: 120, rating: 4.1, totalCourts: 2 },
  { name: 'Green Park Courts', address: 'Civil Lines, Nagpur', lat: 21.1560, lng: 79.0910, sports: ['Pickleball', 'Tennis'], pricePerHour: 150, rating: 4.5, totalCourts: 3 },
  { name: 'PICT Sports Ground', address: 'Dhankawadi, Pune', lat: 18.4570, lng: 73.8490, sports: ['Football', 'Basketball', 'Badminton'], pricePerHour: 50, rating: 4.0, totalCourts: 5 },
  { name: 'Pune Badminton Academy', address: 'Kothrud, Pune', lat: 18.5074, lng: 73.8077, sports: ['Badminton', 'Pickleball'], pricePerHour: 90, rating: 4.7, totalCourts: 3 },
  { name: 'Katraj Sports Hub', address: 'Katraj, Pune', lat: 18.4561, lng: 73.8525, sports: ['Badminton', 'Basketball'], pricePerHour: 70, rating: 4.2, totalCourts: 4 },
  { name: 'CIDCO Sports Arena', address: 'N-3 CIDCO, Aurangabad', lat: 19.8875, lng: 75.3245, sports: ['Badminton', 'Cricket', 'Volleyball'], pricePerHour: 65, rating: 4.4, totalCourts: 3 },
  { name: 'Guru Nanak Badminton Arena', address: 'N-3 CIDCO, Aurangabad', lat: 19.8882, lng: 75.3241, sports: ['Badminton', 'Volleyball'], pricePerHour: 75, rating: 4.2, totalCourts: 4 },
  { name: 'Aurangabad Sports Complex', address: 'N-4 CIDCO, Aurangabad', lat: 19.8895, lng: 75.3260, sports: ['Badminton', 'Cricket'], pricePerHour: 80, rating: 4.5, totalCourts: 5 },
  { name: 'Sambhaji Nagar Indoor Stadium', address: 'CIDCO, Aurangabad', lat: 19.8855, lng: 75.3220, sports: ['Badminton', 'Tennis'], pricePerHour: 95, rating: 4.3, totalCourts: 3 }
];

const demoUsers = [
  { name: 'Rahul Sharma', email: 'rahul@demo.com', password: 'demo1234', address: 'Shankar Nagar, Nagpur', lat: 21.1520, lng: 79.0950, sports: ['Badminton', 'Pickleball'], preferredMatchType: 'Singles', skillLevel: 'Intermediate', availability: 'Now' },
  { name: 'Priya Kulkarni', email: 'priya@demo.com', password: 'demo1234', address: 'Sitabuldi, Nagpur', lat: 21.1500, lng: 79.0800, sports: ['Badminton', 'Tennis'], preferredMatchType: 'Doubles', skillLevel: 'Beginner', availability: 'Now' },
  { name: 'Arjun Mehta', email: 'arjun@demo.com', password: 'demo1234', address: 'Ramdaspeth, Nagpur', lat: 21.1440, lng: 79.0820, sports: ['Badminton', 'Basketball'], preferredMatchType: 'Teams', skillLevel: 'Advanced', availability: 'Evening' },
  { name: 'Sneha Patil', email: 'sneha@demo.com', password: 'demo1234', address: 'Civil Lines, Nagpur', lat: 21.1560, lng: 79.0910, sports: ['Pickleball', 'Tennis'], preferredMatchType: 'Singles', skillLevel: 'Intermediate', availability: 'Weekend' },
  { name: 'Vikram Joshi', email: 'vikram@demo.com', password: 'demo1234', address: 'Dharampeth, Nagpur', lat: 21.1475, lng: 79.0870, sports: ['Football', 'Basketball'], preferredMatchType: 'Teams', skillLevel: 'Intermediate', availability: 'Now' },
  { name: 'Ananya Singh', email: 'ananya@demo.com', password: 'demo1234', address: 'Kothrud, Pune', lat: 18.5074, lng: 73.8077, sports: ['Badminton', 'Pickleball'], preferredMatchType: 'Doubles', skillLevel: 'Beginner', availability: 'Evening' },
  { name: 'Pooja Patil', email: 'pooja@demo.com', password: 'demo1234', address: 'Katraj, Pune', lat: 18.4563, lng: 73.8529, sports: ['Badminton', 'Tennis'], preferredMatchType: 'Doubles', skillLevel: 'Intermediate', availability: 'Now' },
  { name: 'Ravi Deshmukh', email: 'ravi@demo.com', password: 'demo1234', address: 'N-3 CIDCO, Aurangabad', lat: 19.8875, lng: 75.3245, sports: ['Badminton', 'Cricket'], preferredMatchType: 'Teams', skillLevel: 'Intermediate', availability: 'Now' },
  { name: 'Neha Patil', email: 'neha@demo.com', password: 'demo1234', address: 'N-3 CIDCO, Aurangabad', lat: 19.8870, lng: 75.3235, sports: ['Badminton', 'Cricket'], preferredMatchType: 'Doubles', skillLevel: 'Intermediate', availability: 'Now' },
  { name: 'Saurabh Reddy', email: 'saurabh@demo.com', password: 'demo1234', address: 'CIDCO, Aurangabad', lat: 19.8885, lng: 75.3252, sports: ['Badminton', 'Volleyball'], preferredMatchType: 'Singles', skillLevel: 'Beginner', availability: 'Now' }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Court.deleteMany({});
  await Court.insertMany(courts);
  console.log(`Seeded ${courts.length} courts`);

  await User.deleteMany({ email: { $in: demoUsers.map(u => u.email) } });
  for (const u of demoUsers) {
    await User.create({
      name: u.name,
      email: u.email,
      password: u.password,
      location: { address: u.address, lat: u.lat, lng: u.lng },
      sports: u.sports,
      preferredMatchType: u.preferredMatchType || 'Singles',
      skillLevel: u.skillLevel,
      availability: u.availability
    });
  }
  console.log(`Seeded ${demoUsers.length} demo users`);
  console.log('\nDemo login: rahul@demo.com / demo1234');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(console.error);
