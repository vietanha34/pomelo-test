FROM node:10

WORKDIR /app

# Cài đặt dependencies toàn cục
RUN npm install -g pm2 pomelo

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Copy các file cần thiết
COPY . .

# Mở các port
EXPOSE 3010-3022

# Đặt biến môi trường
ENV NODE_ENV=production

# Command để chạy
CMD ["node", "app.js"] 