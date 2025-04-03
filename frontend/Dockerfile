FROM node:16-alpine as build

WORKDIR /app

# 复制并安装依赖
COPY package.json package-lock.json* ./
RUN npm ci

# 复制代码并构建
COPY . .
RUN npm run build

# 生产环境运行阶段
FROM nginx:stable-alpine

# 从构建阶段复制构建结果到nginx静态文件目录
COPY --from=build /app/build /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]