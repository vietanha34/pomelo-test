# Tài liệu API - Cơ Thủ Game Server

Tài liệu này mô tả các API được cung cấp bởi Cơ Thủ Game Server để client Front-end có thể tích hợp và phát triển giao diện người dùng. Tài liệu tập trung vào các luồng chính: đăng nhập, vào game, và chơi game cờ tướng.

## Nguyên tắc chung

### Kết nối

Cơ Thủ Game Server được xây dựng trên framework Pomelo, sử dụng websocket để giao tiếp hai chiều giữa client và server. API sử dụng 2 phương thức chính:

1. **Request**: Gửi yêu cầu và nhận phản hồi
2. **Notify**: Gửi thông báo một chiều đến server

### Định dạng dữ liệu

Dữ liệu được truyền dưới dạng JSON với định dạng:

- Request:
  ```json
  {
    "route": "serverType.handlerName.methodName",
    "msg": {
      // Các tham số
    }
  }
  ```

- Response:
  ```json
  {
    "code": 200, // Mã trạng thái, 200 = thành công, khác 200 = lỗi
    "msg": "Success message", // Thông báo
    "data": {
      // Dữ liệu trả về
    }
  }
  ```

## Luồng đăng nhập

### 1. Kết nối đến Gate Server

```javascript
pomelo.init({
  host: SERVER_HOST,
  port: GATE_PORT,
  log: true
}, function() {
  console.log('Kết nối thành công đến Gate Server');
  // Tiếp theo: Gửi yêu cầu đăng nhập
});
```

### 2. Yêu cầu chuyển kết nối đến Connector Server

```javascript
pomelo.request('gate.gateHandler.queryEntry', {
  uid: uniqueId // Định danh duy nhất của người dùng hoặc thiết bị
}, function(data) {
  if(data.code === 200) {
    // Ngắt kết nối hiện tại
    pomelo.disconnect();
    
    // Kết nối đến connector server được chỉ định
    pomelo.init({
      host: data.host,
      port: data.port,
      log: true
    }, function() {
      console.log('Kết nối thành công đến Connector Server');
      // Tiếp theo: Gửi yêu cầu đăng nhập
    });
  } else {
    console.log('Lỗi kết nối:', data.msg);
  }
});
```

### 3. Đăng nhập

```javascript
pomelo.request('connector.entryHandler.login', {
  username: 'username', 
  password: 'password'
}, function(data) {
  if(data.code === 200) {
    console.log('Đăng nhập thành công:', data.user);
    // Lưu thông tin người dùng và token
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('token', data.token);
    // Tiếp tục xử lý sau đăng nhập
  } else {
    console.log('Đăng nhập thất bại:', data.msg);
  }
});
```

### 4. Đăng ký (nếu chưa có tài khoản)

```javascript
pomelo.request('connector.entryHandler.register', {
  username: 'username',
  password: 'password',
  email: 'email@example.com',
  fullname: 'Tên người chơi'
}, function(data) {
  if(data.code === 200) {
    console.log('Đăng ký thành công:', data.msg);
    // Tiếp tục đăng nhập
  } else {
    console.log('Đăng ký thất bại:', data.msg);
  }
});
```

### 5. Lấy thông tin người dùng

```javascript
pomelo.request('connector.userHandler.getProfile', {
  userId: localStorage.getItem('userId')
}, function(data) {
  if(data.code === 200) {
    console.log('Thông tin người dùng:', data.user);
    // Hiển thị thông tin người dùng
  } else {
    console.log('Lỗi lấy thông tin:', data.msg);
  }
});
```

## Luồng vào game

### 1. Lấy danh sách khu vực chơi (District)

```javascript
pomelo.request('connector.districtHandler.getDistrictList', {}, function(data) {
  if(data.code === 200) {
    console.log('Danh sách khu vực:', data.districts);
    // Hiển thị danh sách khu vực chơi
  } else {
    console.log('Lỗi lấy danh sách khu vực:', data.msg);
  }
});
```

### 2. Tham gia khu vực chơi

```javascript
pomelo.request('connector.districtHandler.enterDistrict', {
  districtId: 'district_1'
}, function(data) {
  if(data.code === 200) {
    console.log('Đã vào khu vực:', data.district);
    // Hiển thị thông tin khu vực
  } else {
    console.log('Lỗi vào khu vực:', data.msg);
  }
});
```

### 3. Lấy danh sách phòng chơi

```javascript
pomelo.request('district.roomHandler.getRoomList', {
  districtId: 'district_1',
  pageSize: 10,
  pageNumber: 1
}, function(data) {
  if(data.code === 200) {
    console.log('Danh sách phòng chơi:', data.rooms);
    // Hiển thị danh sách phòng chơi
  } else {
    console.log('Lỗi lấy danh sách phòng:', data.msg);
  }
});
```

### 4. Tạo phòng chơi mới

```javascript
pomelo.request('district.roomHandler.createRoom', {
  roomName: 'Phòng của tôi',
  betAmount: 100, // Số tiền cược
  password: '1234', // Mật khẩu phòng (nếu cần)
  isPrivate: false // Phòng công khai hay riêng tư
}, function(data) {
  if(data.code === 200) {
    console.log('Đã tạo phòng:', data.room);
    // Tự động vào phòng vừa tạo
  } else {
    console.log('Lỗi tạo phòng:', data.msg);
  }
});
```

### 5. Tham gia phòng chơi

```javascript
pomelo.request('district.roomHandler.joinRoom', {
  roomId: 'room_123',
  password: '1234' // Nếu là phòng có mật khẩu
}, function(data) {
  if(data.code === 200) {
    console.log('Đã vào phòng:', data.room);
    // Hiển thị thông tin phòng và người chơi
  } else {
    console.log('Lỗi vào phòng:', data.msg);
  }
});
```

### 6. Rời phòng chơi

```javascript
pomelo.request('district.roomHandler.leaveRoom', {
  roomId: 'room_123'
}, function(data) {
  if(data.code === 200) {
    console.log('Đã rời phòng');
    // Quay lại màn hình chọn phòng
  } else {
    console.log('Lỗi rời phòng:', data.msg);
  }
});
```

### 7. Bắt đầu game

```javascript
pomelo.request('district.roomHandler.readyToPlay', {
  roomId: 'room_123',
  ready: true
}, function(data) {
  if(data.code === 200) {
    console.log('Đã sẵn sàng');
    // Chờ đối thủ sẵn sàng
  } else {
    console.log('Lỗi sẵn sàng:', data.msg);
  }
});
```

## Luồng chơi game cờ tướng

### 1. Khởi tạo game

Sau khi cả hai người chơi đã sẵn sàng, server sẽ tự động khởi tạo game và gửi thông báo đến client:

```javascript
pomelo.on('onGameStart', function(data) {
  console.log('Game bắt đầu:', data);
  // data.gameId: ID của game
  // data.board: Trạng thái bàn cờ ban đầu
  // data.players: Thông tin người chơi
  // data.currentTurn: Lượt đi hiện tại
  
  // Hiển thị bàn cờ và thông tin người chơi
});
```

### 2. Di chuyển quân cờ

```javascript
pomelo.request('game.gameHandler.move', {
  gameId: 'game_123',
  fromPosition: {x: 0, y: 0}, // Vị trí ban đầu của quân cờ
  toPosition: {x: 0, y: 1}    // Vị trí đích của quân cờ
}, function(data) {
  if(data.code === 200) {
    console.log('Di chuyển thành công:', data);
    // Cập nhật bàn cờ theo dữ liệu trả về
  } else {
    console.log('Lỗi di chuyển:', data.msg);
    // Hiển thị thông báo lỗi
  }
});
```

### 3. Lắng nghe di chuyển của đối thủ

```javascript
pomelo.on('onOpponentMove', function(data) {
  console.log('Đối thủ di chuyển:', data);
  // data.fromPosition: Vị trí ban đầu
  // data.toPosition: Vị trí đích
  // data.piece: Thông tin quân cờ
  // data.board: Trạng thái bàn cờ mới
  
  // Cập nhật bàn cờ theo dữ liệu
});
```

### 4. Kiểm tra nước đi hợp lệ (không bắt buộc, có thể validate bên client)

```javascript
pomelo.request('game.gameHandler.validateMove', {
  gameId: 'game_123',
  fromPosition: {x: 0, y: 0},
  toPosition: {x: 0, y: 1}
}, function(data) {
  if(data.code === 200) {
    console.log('Nước đi hợp lệ:', data.valid);
    // Hiển thị gợi ý nước đi
  } else {
    console.log('Lỗi kiểm tra:', data.msg);
  }
});
```

### 5. Đầu hàng

```javascript
pomelo.request('game.gameHandler.surrender', {
  gameId: 'game_123'
}, function(data) {
  if(data.code === 200) {
    console.log('Đã đầu hàng');
    // Hiển thị thông báo thua cuộc
  } else {
    console.log('Lỗi đầu hàng:', data.msg);
  }
});
```

### 6. Xin hòa

```javascript
pomelo.request('game.gameHandler.requestDraw', {
  gameId: 'game_123'
}, function(data) {
  if(data.code === 200) {
    console.log('Đã gửi yêu cầu hòa');
    // Chờ phản hồi từ đối thủ
  } else {
    console.log('Lỗi yêu cầu hòa:', data.msg);
  }
});
```

### 7. Phản hồi yêu cầu hòa

```javascript
pomelo.request('game.gameHandler.responseDraw', {
  gameId: 'game_123',
  accept: true // true: đồng ý hòa, false: từ chối
}, function(data) {
  if(data.code === 200) {
    console.log('Đã phản hồi yêu cầu hòa');
    // Hiển thị kết quả
  } else {
    console.log('Lỗi phản hồi:', data.msg);
  }
});
```

### 8. Lắng nghe kết thúc game

```javascript
pomelo.on('onGameEnd', function(data) {
  console.log('Game kết thúc:', data);
  // data.result: Kết quả (win, lose, draw)
  // data.winner: Người chiến thắng
  // data.reason: Lý do kết thúc (checkmate, surrender, draw, timeout)
  
  // Hiển thị kết quả và tùy chọn chơi lại
});
```

### 9. Chat trong game

```javascript
pomelo.request('chat.chatHandler.sendMessage', {
  content: 'Xin chào!',
  target: 'room', // Gửi đến: room, game, district, global
  targetId: 'room_123' // ID của đối tượng nhận (nếu cần)
}, function(data) {
  if(data.code === 200) {
    console.log('Đã gửi tin nhắn');
  } else {
    console.log('Lỗi gửi tin nhắn:', data.msg);
  }
});
```

### 10. Lắng nghe tin nhắn chat

```javascript
pomelo.on('onChat', function(data) {
  console.log('Tin nhắn mới:', data);
  // data.sender: Người gửi
  // data.content: Nội dung tin nhắn
  // data.target: Đối tượng nhận
  
  // Hiển thị tin nhắn
});
```

## Các API bổ sung

### 1. Lấy bảng xếp hạng

```javascript
pomelo.request('home.rankHandler.getRankList', {
  type: 'rating', // rating, win, game
  pageSize: 10,
  pageNumber: 1
}, function(data) {
  if(data.code === 200) {
    console.log('Bảng xếp hạng:', data.ranks);
    // Hiển thị bảng xếp hạng
  } else {
    console.log('Lỗi lấy bảng xếp hạng:', data.msg);
  }
});
```

### 2. Lấy lịch sử đấu

```javascript
pomelo.request('home.historyHandler.getGameHistory', {
  userId: localStorage.getItem('userId'),
  pageSize: 10,
  pageNumber: 1
}, function(data) {
  if(data.code === 200) {
    console.log('Lịch sử đấu:', data.history);
    // Hiển thị lịch sử đấu
  } else {
    console.log('Lỗi lấy lịch sử:', data.msg);
  }
});
```

### 3. Lấy thông tin tournament

```javascript
pomelo.request('tournament.tournamentHandler.getTournamentList', {
  status: 'active', // active, upcoming, finished
  pageSize: 10,
  pageNumber: 1
}, function(data) {
  if(data.code === 200) {
    console.log('Danh sách giải đấu:', data.tournaments);
    // Hiển thị danh sách giải đấu
  } else {
    console.log('Lỗi lấy danh sách giải đấu:', data.msg);
  }
});
```

### 4. Đăng ký tham gia tournament

```javascript
pomelo.request('tournament.tournamentHandler.registerTournament', {
  tournamentId: 'tournament_123'
}, function(data) {
  if(data.code === 200) {
    console.log('Đăng ký thành công:', data.msg);
    // Hiển thị thông tin đăng ký
  } else {
    console.log('Lỗi đăng ký:', data.msg);
  }
});
```

## Mã lỗi

| Mã lỗi | Mô tả |
|--------|-------|
| 200 | Thành công |
| 400 | Lỗi tham số đầu vào |
| 401 | Chưa đăng nhập hoặc phiên đăng nhập hết hạn |
| 403 | Không có quyền truy cập |
| 404 | Không tìm thấy tài nguyên |
| 500 | Lỗi server |
| 1001 | Lỗi kết nối cơ sở dữ liệu |
| 1002 | Lỗi xác thực thông tin đăng nhập |
| 2001 | Phòng đã đầy |
| 2002 | Không đủ số dư |
| 3001 | Nước đi không hợp lệ |
| 3002 | Không phải lượt của bạn |

## Ví dụ luồng chơi game cơ bản

1. **Kết nối và đăng nhập**:
   - Kết nối đến Gate Server
   - Chuyển đến Connector Server
   - Đăng nhập

2. **Vào game**:
   - Lấy danh sách khu vực
   - Vào khu vực
   - Lấy danh sách phòng
   - Tạo hoặc tham gia phòng
   - Sẵn sàng chơi

3. **Chơi game**:
   - Nhận thông báo bắt đầu game
   - Đến lượt: Gửi nước đi
   - Không đến lượt: Lắng nghe nước đi của đối thủ
   - Nhận thông báo kết thúc game
   - Quay lại phòng hoặc chơi lại

## Các sự kiện (Events) cần lắng nghe

```javascript
// Lắng nghe kết nối thành công
pomelo.on('onConnectionSuccess', function(data) {
  console.log('Kết nối thành công');
});

// Lắng nghe kết nối thất bại
pomelo.on('onConnectionError', function(data) {
  console.log('Kết nối thất bại:', data);
});

// Lắng nghe ngắt kết nối
pomelo.on('onDisconnect', function(data) {
  console.log('Đã ngắt kết nối:', data);
});

// Lắng nghe thông báo bảo trì
pomelo.on('onMaintenance', function(data) {
  console.log('Thông báo bảo trì:', data);
});

// Lắng nghe người chơi vào phòng
pomelo.on('onUserEnterRoom', function(data) {
  console.log('Người chơi vào phòng:', data.user);
});

// Lắng nghe người chơi rời phòng
pomelo.on('onUserLeaveRoom', function(data) {
  console.log('Người chơi rời phòng:', data.user);
});

// Lắng nghe thay đổi trạng thái phòng
pomelo.on('onRoomStatusChange', function(data) {
  console.log('Trạng thái phòng thay đổi:', data);
});

// Lắng nghe thông báo sẵn sàng
pomelo.on('onUserReadyChanged', function(data) {
  console.log('Người chơi thay đổi trạng thái sẵn sàng:', data);
});

// Lắng nghe yêu cầu hòa
pomelo.on('onDrawRequested', function(data) {
  console.log('Yêu cầu hòa từ:', data.user);
});

// Lắng nghe phản hồi yêu cầu hòa
pomelo.on('onDrawResponsed', function(data) {
  console.log('Phản hồi yêu cầu hòa:', data);
});
```

## Cách sử dụng tài liệu API

Tài liệu này mô tả các API cần thiết để xây dựng client Front-end cho game cờ tướng. Các bước cơ bản để sử dụng API:

1. Tích hợp thư viện Pomelo client vào dự án
2. Thiết lập kết nối ban đầu đến Gate Server
3. Thực hiện đăng nhập và vào phòng chơi
4. Xử lý logic game dựa trên luồng API được mô tả

Lưu ý:
- Đảm bảo xử lý các trường hợp lỗi và ngắt kết nối
- Luôn kiểm tra mã phản hồi từ server
- Lắng nghe các sự kiện từ server để cập nhật giao diện người dùng
- Lưu trữ thông tin phiên đăng nhập và token để sử dụng khi tái kết nối 