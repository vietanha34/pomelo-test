# Hướng dẫn triển khai Cơ Thủ Game Server trên Docker

Tài liệu này hướng dẫn cách triển khai dự án Cơ Thủ Game Server bằng Docker và Docker Compose.

## Yêu cầu

- Docker phiên bản 19.03.0+
- Docker Compose phiên bản 1.27.0+
- Ít nhất 4GB RAM và 20GB ổ đĩa trống

## Cấu trúc thư mục Docker

```
.
├── docker-compose.yml         # Cấu hình Docker Compose cho môi trường phát triển  
├── docker-compose.prod.yml    # Cấu hình Docker Compose cho môi trường sản xuất
├── game-server/               # Mã nguồn game server
│   ├── Dockerfile             # Dockerfile cho môi trường phát triển
│   └── Dockerfile.prod        # Dockerfile cho môi trường sản xuất
├── database/                  # Scripts tạo cơ sở dữ liệu
│   ├── init.sql               # Script khởi tạo MySQL
│   └── mongo-init.js          # Script khởi tạo MongoDB
├── nginx/                     # Cấu hình Nginx
│   └── conf.d/                # Thư mục chứa cấu hình Nginx
│       └── default.conf       # Cấu hình mặc định cho Nginx
├── redis/                     # Cấu hình Redis
│   └── redis.conf             # File cấu hình Redis
└── .env.example               # Mẫu file biến môi trường
```

## Triển khai môi trường phát triển

### 1. Tạo file .env

Sao chép file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Chỉnh sửa các thông số trong file `.env` theo nhu cầu.

### 2. Khởi động các containers

```bash
docker-compose up -d
```

Lệnh này sẽ khởi động tất cả các dịch vụ được định nghĩa trong file `docker-compose.yml`.

### 3. Kiểm tra trạng thái

```bash
docker-compose ps
```

### 4. Xem logs

```bash
# Xem logs của tất cả các containers
docker-compose logs

# Xem logs của một container cụ thể
docker-compose logs game-server
```

### 5. Dừng các containers

```bash
docker-compose down
```

## Triển khai môi trường sản xuất

### 1. Tạo các thư mục cần thiết

```bash
mkdir -p database logs nginx/conf.d nginx/ssl redis static
```

### 2. Tạo SSL certificate cho Nginx

```bash
# Tạo self-signed certificate (chỉ dành cho testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/server.key -out nginx/ssl/server.crt

# Trong môi trường sản xuất, bạn nên sử dụng certificate từ nhà cung cấp SSL chính thức
```

### 3. Khởi động môi trường sản xuất

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Kiểm tra trạng thái

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 5. Xem logs

```bash
docker-compose -f docker-compose.prod.yml logs
```

### 6. Dừng các containers

```bash
docker-compose -f docker-compose.prod.yml down
```

## Quản lý và bảo trì

### 1. Cập nhật mã nguồn

```bash
# Pull mã nguồn mới
git pull

# Rebuild và restart containers
docker-compose -f docker-compose.prod.yml up -d --build game-server
```

### 2. Sao lưu dữ liệu

#### Sao lưu MongoDB

```bash
docker exec -it cothu-mongo mongodump --authenticationDatabase admin -u admin -p admin123 --db cothu_production --out /data/backup
docker cp cothu-mongo:/data/backup ./backup/mongo
```

#### Sao lưu MySQL

```bash
docker exec -it cothu-mysql mysqldump -u root -proot123 cothu_production > ./backup/mysql/cothu_production.sql
```

### 3. Khôi phục dữ liệu

#### Khôi phục MongoDB

```bash
docker cp ./backup/mongo cothu-mongo:/data/backup
docker exec -it cothu-mongo mongorestore --authenticationDatabase admin -u admin -p admin123 --db cothu_production /data/backup/cothu_production
```

#### Khôi phục MySQL

```bash
cat ./backup/mysql/cothu_production.sql | docker exec -i cothu-mysql mysql -u root -proot123 cothu_production
```

## Mở rộng quy mô

### 1. Scale game server

Để mở rộng quy mô game server, bạn có thể thêm các container game-server với các cấu hình khác nhau:

```bash
# Cập nhật file docker-compose.prod.yml để có nhiều instance game-server
# Thêm các dịch vụ mới, ví dụ: game-server-2, game-server-3, ...
```

### 2. Scale database

Để mở rộng cơ sở dữ liệu, bạn có thể cấu hình replica set cho MongoDB và master-slave cho MySQL:

```bash
# Tùy chỉnh cấu hình trong docker-compose.prod.yml
# Thêm các container cơ sở dữ liệu phụ
```

## Xử lý sự cố

### 1. Kiểm tra logs

```bash
# Xem logs của container gặp vấn đề
docker-compose -f docker-compose.prod.yml logs game-server
```

### 2. Kiểm tra tài nguyên

```bash
# Kiểm tra CPU, RAM, mạng và ổ đĩa
docker stats
```

### 3. Khởi động lại container

```bash
# Khởi động lại một container cụ thể
docker-compose -f docker-compose.prod.yml restart game-server
```

### 4. Kiểm tra kết nối mạng

```bash
# Kiểm tra mạng Docker
docker network inspect cothu-network
```

## Các lệnh Docker hữu ích

- Xem các container đang chạy: `docker ps`
- Xem logs của container: `docker logs <container_id>`
- Truy cập vào container: `docker exec -it <container_id> bash`
- Xem cấu hình mạng: `docker network ls`
- Xóa tất cả dữ liệu không sử dụng: `docker system prune -a`

## Cảnh báo bảo mật

- Đừng sử dụng mật khẩu mặc định trong file `.env.example` cho môi trường sản xuất
- Định kỳ thay đổi mật khẩu và SSL certificates
- Giới hạn quyền truy cập vào cổng quản trị (ports 3014, 15672)
- Đảm bảo dữ liệu được sao lưu thường xuyên 