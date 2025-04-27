// Tạo database và user
db = db.getSiblingDB('cothu_production');

// Tạo user cho database
db.createUser({
  user: 'cothu',
  pwd: 'production_password',
  roles: [
    { role: 'readWrite', db: 'cothu_production' }
  ]
});

// Tạo collections
db.createCollection('games');
db.createCollection('users');
db.createCollection('districts');
db.createCollection('tournaments');

// Thêm indexes
db.games.createIndex({ gameId: 1 }, { unique: true });
db.games.createIndex({ status: 1 });
db.games.createIndex({ players: 1 });

db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

db.districts.createIndex({ districtId: 1 }, { unique: true });
db.districts.createIndex({ name: 1 });

db.tournaments.createIndex({ tournamentId: 1 }, { unique: true });
db.tournaments.createIndex({ status: 1 });
db.tournaments.createIndex({ startTime: 1 });

// Thêm dữ liệu mẫu nếu cần
db.districts.insertMany([
  {
    districtId: 'district_1',
    name: 'Phòng Chơi Cơ Bản',
    maxPlayers: 100,
    minBet: 0,
    maxBet: 1000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    districtId: 'district_2',
    name: 'Phòng Chơi Trung Cấp',
    maxPlayers: 50,
    minBet: 1000,
    maxBet: 10000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    districtId: 'district_3',
    name: 'Phòng Chơi Cao Cấp',
    maxPlayers: 20,
    minBet: 10000,
    maxBet: 100000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]); 