# 基金追踪系统阿里云部署指南

本指南将帮助你将基金追踪系统部署到阿里云的ECS服务器上。

## 前提条件

1. 一个阿里云账号
2. 至少一台ECS云服务器（建议2核4G以上配置）
3. 服务器已安装以下软件：
   - Docker（20.10.x或更高版本）
   - Docker Compose（2.x或更高版本）
   - Git（可选，用于获取代码）

## 步骤一：准备阿里云ECS服务器

1. **登录阿里云控制台，创建ECS实例**

   - 登录[阿里云控制台](https://console.aliyun.com/)
   - 进入ECS控制台，创建实例
   - 选择操作系统（推荐CentOS 7或Ubuntu 20.04）
   - 配置至少2核4G内存
   - 开放以下端口：
     - 22 (SSH)
     - 80 (HTTP)
     - 443 (HTTPS，如果需要配置SSL)

2. **连接到服务器**

   使用SSH客户端（如PuTTY或Terminal）连接到服务器：

   ```bash
   ssh root@<your_server_ip>
   ```

3. **安装Docker和Docker Compose**

   在CentOS上：

   ```bash
   # 安装必要的系统工具
   yum install -y yum-utils device-mapper-persistent-data lvm2

   # 添加Docker源
   yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

   # 安装Docker
   yum install -y docker-ce docker-ce-cli containerd.io

   # 启动Docker
   systemctl start docker
   systemctl enable docker

   # 安装Docker Compose
   curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

   在Ubuntu上：

   ```bash
   # 更新软件包
   apt-get update

   # 安装必要的软件包
   apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

   # 添加Docker的官方GPG密钥
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

   # 设置Docker源
   echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

   # 安装Docker
   apt-get update
   apt-get install -y docker-ce docker-ce-cli containerd.io

   # 安装Docker Compose
   curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

## 步骤二：创建项目目录结构

1. **创建项目根目录**

   ```bash
   mkdir -p ~/fund-tracker
   cd ~/fund-tracker
   ```

2. **创建所有必要的子目录**

   ```bash
   mkdir -p backend/app/models backend/app/routes backend/app/services
   mkdir -p data-crawler/app/crawlers data-crawler/app/services
   mkdir -p frontend/public frontend/src/components frontend/src/services
   ```

## 步骤三：上传代码

你有两种方式可以将代码传输到服务器：

### 方法1：直接在服务器上创建文件

可以使用vi/vim/nano等编辑器在服务器上直接创建文件：

```bash
# 例如，创建docker-compose.yml
vim docker-compose.yml
# 粘贴内容，保存退出
```

### 方法2：通过SFTP传输文件

使用支持SFTP的工具（如FileZilla、WinSCP等）将本地开发的文件上传到服务器：

1. 连接到服务器（主机、用户名、密码与SSH相同）
2. 将本地文件拖放到服务器对应目录中

## 步骤四：创建所有必要的文件

现在，我们需要在服务器上创建前面生成的所有文件。以下是主要文件的位置：

### 后端文件

```bash
# 主应用
vim backend/app/main.py
# 复制前面生成的后端主应用代码

# 基金模型
vim backend/app/models/fund.py
# 复制前面生成的基金数据模型代码

# 路由
vim backend/app/routes/funds.py
# 复制前面生成的基金API路由代码

# Dockerfile
vim backend/Dockerfile
# 复制前面生成的后端Dockerfile代码

# 依赖文件
vim backend/requirements.txt
# 复制前面生成的后端依赖代码
```

### 数据爬虫文件

```bash
# 主应用
vim data-crawler/app/main.py
# 复制前面生成的数据爬取服务主程序代码

# 爬虫
vim data-crawler/app/crawlers/fund_crawler.py
# 复制前面生成的基金爬虫代码

# Dockerfile
vim data-crawler/Dockerfile
# 复制前面生成的数据爬虫Dockerfile代码

# 依赖文件
vim data-crawler/requirements.txt
# 复制前面生成的数据爬虫依赖代码
```

### 前端文件

```bash
# 主应用
vim frontend/src/App.js
# 复制前面生成的前端应用代码

# 组件
vim frontend/src/components/Dashboard.js
vim frontend/src/components/FundList.js
vim frontend/src/components/FundDetail.js
# 分别复制前面生成的各组件代码

# API服务
mkdir -p frontend/src/services
vim frontend/src/services/api.js
# 复制前面生成的API服务代码

# Nginx配置
vim frontend/nginx.conf
# 复制前面生成的Nginx配置代码

# Dockerfile
vim frontend/Dockerfile
# 复制前面生成的前端Dockerfile代码

# package.json
vim frontend/package.json
# 复制前面生成的前端依赖代码
```

### 项目根目录文件

```bash
# Docker Compose配置
vim docker-compose.yml
# 复制前面生成的Docker Compose配置代码
```

## 步骤五：配置环境变量（可选）

为了增加安全性和灵活性，可以创建`.env`文件来存储环境变量：

```bash
vim .env
```

添加以下内容：

```
# MongoDB配置
MONGO_USERNAME=admin
MONGO_PASSWORD=your_secure_password
DATABASE_NAME=fund_tracker

# RabbitMQ配置
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=your_secure_password

# 爬虫配置
FUND_CODES=110011,001632,159915
CRAWL_INTERVAL=3600
```

## 步骤六：启动服务

现在，我们可以使用Docker Compose来启动整个应用：

```bash
# 确保在项目根目录下
cd ~/fund-tracker

# 构建并启动所有服务
docker-compose up -d --build
```

首次构建可能需要一些时间，因为Docker需要下载基础镜像并安装所有依赖。

## 步骤七：验证服务

服务启动后，可以通过以下方式验证：

```bash
# 检查所有容器是否正常运行
docker-compose ps

# 查看各服务的日志
docker-compose logs -f backend
docker-compose logs -f data-crawler
docker-compose logs -f frontend
```

## 步骤八：访问应用

现在，你可以通过服务器的IP地址或域名（如果已配置）在浏览器中访问应用：

```
http://<你的服务器IP地址>
```

如果一切正常，你应该能看到基金追踪系统的首页。

## 步骤九：配置域名和HTTPS（可选）

### 1. 配置域名

1. 在阿里云的域名控制台购买域名（如果还没有）
2. 添加A记录，指向你的ECS服务器IP
3. 等待DNS生效（通常需要几分钟到几小时）

### 2. 配置HTTPS

可以使用Let's Encrypt和Certbot获取免费的SSL证书：

```bash
# 安装Certbot
apt-get install -y certbot python3-certbot-nginx  # Ubuntu
# 或
yum install -y certbot python3-certbot-nginx  # CentOS

# 获取证书
certbot --nginx -d yourdomain.com

# 证书会自动续期，但可以测试续期过程
certbot renew --dry-run
```

获取证书后，需要修改nginx.conf和docker-compose.yml，将证书挂载到容器中。

## 步骤十：维护和更新

### 更新应用

如果需要更新应用，按照以下步骤操作：

1. 修改相应的代码文件
2. 重新构建并启动服务：

```bash
docker-compose up -d --build
```

### 备份数据

定期备份MongoDB数据：

```bash
# 创建备份目录
mkdir -p ~/backups

# 备份MongoDB数据
docker exec -it fund-tracker_mongo_1 mongodump --out=/dump
docker cp fund-tracker_mongo_1:/dump ~/backups/mongo_$(date +%Y%m%d)
```

可以设置cron任务执行定期备份。

### 监控服务

设置基本的监控可以使用简单的shell脚本结合cron：

```bash
vim ~/monitor.sh
```

添加内容：

```bash
#!/bin/bash
# 检查服务状态
CONTAINERS=$(docker-compose -f ~/fund-tracker/docker-compose.yml ps -q)
if [ -z "$CONTAINERS" ]; then
  echo "服务未运行，尝试重启..."
  cd ~/fund-tracker && docker-compose up -d
  # 可选：发送通知邮件或短信
fi
```

设置执行权限并添加到cron：

```bash
chmod +x ~/monitor.sh
crontab -e
```

添加cron任务：

```
*/10 * * * * ~/monitor.sh >> ~/monitor.log 2>&1
```

## 故障排除

### 服务无法启动

检查日志，查找错误：

```bash
docker-compose logs <service_name>
```

### 网站无法访问

检查端口是否开放：

```bash
# 检查80端口是否在监听
netstat -tuln | grep 80

# 检查防火墙规则
iptables -L
```

### 数据爬取问题

检查爬虫服务日志：

```bash
docker-compose logs data-crawler
```

## 常见问题与解决方案

### Q: 如何添加新的基金进行追踪？
A: 可以直接访问网站，通过UI界面添加基金代码，或者修改.env文件中的FUND_CODES变量，然后重启爬虫服务。

### Q: 如何备份整个应用？
A: 除了数据库备份，还可以备份整个项目目录和Docker卷：
```bash
# 备份项目文件
tar -czvf ~/fund-tracker-backup.tar.gz ~/fund-tracker

# 备份Docker卷
docker run --rm -v fund-tracker_mongo_data:/data -v $(pwd):/backup alpine tar -czvf /backup/mongo-data.tar.gz /data
```

### Q: 系统资源不足怎么办？
A: 可以考虑升级ECS配置，或优化Docker容器资源限制：
```yaml
# 在docker-compose.yml中添加资源限制
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
``` 方法1：直接在服务器上创建文件

可以使用vi/vim/nano等编辑器在服务器上直接创建文件：

```bash
# 例如，创建docker-compose.yml
vim docker-compose.yml
# 粘贴内容，保存退出
```

###