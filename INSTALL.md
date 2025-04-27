# Hướng dẫn cài đặt và triển khai Cơ Thủ Game Server

Tài liệu này cung cấp hướng dẫn chi tiết để cài đặt và triển khai dự án Cơ Thủ Game Server.

## Cài đặt môi trường

### Yêu cầu hệ thống
- Node.js (v10.x hoặc phiên bản tương thích với Pomelo)
- MongoDB (v4.x)
- MySQL (v5.7+)
- Redis (v4.x+)
- RabbitMQ (cho hàng đợi thanh toán)
- PM2 (quản lý tiến trình Node.js)

### Cài đặt Node.js và npm
```bash
# Sử dụng nvm để quản lý các phiên bản Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 10
nvm use 10
npm install -g pm2
```

### Cài đặt MongoDB
```bash
# Thêm repository MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Cài đặt MySQL
```bash
sudo apt-get install -y mysql-server
sudo mysql_secure_installation
```

### Cài đặt Redis
```bash
sudo apt-get install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Cài đặt RabbitMQ
```bash
sudo apt-get install -y rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo rabbitmqctl add_user payrabbit "v!"
sudo rabbitmqctl set_permissions -p / payrabbit ".*" ".*" ".*"
```

## Cài đặt dự án

### Clone repository
```bash
git clone git@git.vgame.us:root/cothu-v2.git
cd cothu-v2
```

### Cài đặt dependencies
```bash
cd game-server
npm install
```

## Cấu hình

### Cấu hình cơ sở dữ liệu

#### MySQL
1. Tạo cơ sở dữ liệu:
```sql
CREATE DATABASE cothu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cothu'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON cothu.* TO 'cothu'@'localhost';
FLUSH PRIVILEGES;
```

2. Cập nhật cấu hình MySQL trong file `game-server/config/mysqlClient.json`:
```json
{
  "development": {
    "username": "cothu",
    "password": "password",
    "database": "cothu",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": "cothu",
    "password": "production_password",
    "database": "cothu_production",
    "host": "your_production_mysql_host",
    "dialect": "mysql"
  }
}
```

#### MongoDB
Cập nhật cấu hình MongoDB trong file `game-server/config/mongo.json`:
```json
{
  "development": {
    "uri": "mongodb://localhost:27017/cothu_dev"
  },
  "production": {
    "uri": "mongodb://username:password@your_production_mongo_host:27017/cothu_production"
  }
}
```

#### Redis
Cập nhật cấu hình Redis trong file `game-server/config/redis.json`:
```json
{
  "development": {
    "cache": {
      "host": "127.0.0.1",
      "port": 6379,
      "db": 0
    },
    "info": {
      "host": "127.0.0.1",
      "port": 6379,
      "db": 1
    },
    "service": {
      "host": "127.0.0.1",
      "port": 6379,
      "db": 2
    },
    "payment": {
      "host": "127.0.0.1",
      "port": 6379,
      "db": 3
    }
  },
  "production": {
    "cache": {
      "host": "your_production_redis_host",
      "port": 6379,
      "db": 0
    },
    "info": {
      "host": "your_production_redis_host",
      "port": 6379,
      "db": 1
    },
    "service": {
      "host": "your_production_redis_host",
      "port": 6379,
      "db": 2
    },
    "payment": {
      "host": "your_production_redis_host",
      "port": 6379,
      "db": 3
    }
  }
}
```

### Cấu hình dịch vụ bên ngoài
Cập nhật cấu hình các dịch vụ bên ngoài trong file `game-server/config/externalService.json` để đảm bảo kết nối đúng với hệ thống tài khoản và tích hợp thanh toán.

## Khởi chạy

### Môi trường phát triển
```bash
cd game-server
node app.js
```

### Môi trường sản xuất
Sử dụng PM2 để quản lý các tiến trình:
```bash
cd game-server
pm2 start ecosystem.json --env production
```

### Kiểm tra trạng thái
```bash
pm2 list
pm2 logs
```

## Triển khai

### Triển khai tự động
Dự án có thể được triển khai tự động bằng cách sử dụng PM2:

```bash
pm2 deploy ecosystem.json production
```

### Cấu hình triển khai
File `ecosystem.json` chứa cấu hình triển khai cho các môi trường khác nhau:
- **Core**: 172.16.20.40
- **Production**: 172.16.10.28
- **Development**: 10.10.11.154

### Các bước triển khai thủ công
1. Đăng nhập vào máy chủ
2. Clone repository:
   ```bash
   git clone git@git.vgame.us:root/cothu-v2.git
   cd cothu-v2
   ```
3. Cài đặt dependencies:
   ```bash
   cd game-server
   npm install
   ```
4. Cấu hình:
   - Cập nhật các file cấu hình trong thư mục `game-server/config`
5. Khởi chạy:
   ```bash
   pm2 start ecosystem.json --env production
   ```

## Giám sát và bảo trì

### Giám sát với PM2
```bash
# Kiểm tra trạng thái các tiến trình
pm2 list

# Xem logs
pm2 logs

# Theo dõi tài nguyên
pm2 monit
```

### Khởi động lại server
```bash
pm2 restart PXM
```

### Cập nhật mã nguồn
```bash
cd ~/cothu
git pull
cd game-server
pm2 restart PXM
```

## Xử lý sự cố

### Kiểm tra logs
```bash
# Xem logs PM2
pm2 logs PXM

# Xem logs ứng dụng
cat ~/cothu/game-server/logs/pxm.stdout.log
cat ~/cothu/game-server/logs/pxm.stderr.log
```

### Các vấn đề thường gặp

1. **Lỗi kết nối MongoDB**:
   - Kiểm tra dịch vụ MongoDB đang chạy: `systemctl status mongod`
   - Kiểm tra cấu hình kết nối trong file `mongo.json`

2. **Lỗi kết nối MySQL**:
   - Kiểm tra dịch vụ MySQL đang chạy: `systemctl status mysql`
   - Kiểm tra cấu hình kết nối trong file `mysqlClient.json`
   - Kiểm tra quyền truy cập của người dùng MySQL

3. **Lỗi kết nối Redis**:
   - Kiểm tra dịch vụ Redis đang chạy: `systemctl status redis`
   - Kiểm tra cấu hình kết nối trong file `redis.json`

4. **Server không khởi động**:
   - Kiểm tra logs lỗi: `cat ~/cothu/game-server/logs/pxm.stderr.log`
   - Thử khởi động với node trực tiếp để xem lỗi chi tiết: `cd ~/cothu/game-server && node app.js` 