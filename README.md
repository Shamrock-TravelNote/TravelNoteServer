# 项目名称 (例如：TravelNote Backend API)

本项目是一个为旅行日记应用提供后端服务的 API。它支持用户认证、旅行日记管理、文件（图片和视频）上传至阿里云 OSS、以及管理员审核等功能。

## 主要功能

* **用户认证**:
    * 普通用户注册（用户名、密码）
    * 用户登录（用户名、密码）
    * 微信小程序一键登录
    * 获取当前登录用户信息
    * 更新用户个人资料（昵称、头像）
* **旅行日记管理**:
    * 发布新游记（支持图片或视频类型）
    * 自动为视频游记生成并上传封面
    * 获取公开的旅行日记列表（支持关键词搜索和分页）
    * 获取用户自己的旅行日记列表（支持按状态筛选、关键词搜索和分页）
    * 获取指定游记的详细信息
    * 编辑用户自己的游记（编辑后状态会重置为待审核）
    * 删除用户自己的游记（逻辑删除，并删除关联的 OSS 文件）
    * 点赞/取消点赞游记
    * 查看游记浏览量
* **文件上传**:
    * 图片上传至阿里云 OSS (自动压缩和格式转换)
    * 视频上传至阿里云 OSS
* **后台管理 (管理员/审核员权限)**:
    * 获取待审核/已审核/已拒绝的游记列表
    * 审核通过游记
    * 审核拒绝游记（需提供拒绝理由）
    * 管理员删除游记（逻辑删除）
* **搜索与过滤**:
    * 游记列表支持按标题、内容、作者昵称/用户名进行关键词搜索。
    * 搜索结果按匹配度（标题/内容优先，作者信息次之）和发布时间排序。

## 技术栈

* **后端框架与环境**:
    * Node.js
    * Express.js
* **数据库与数据建模**:
    * MongoDB
    * Mongoose
* **用户认证与授权**:
    * JSON Web Tokens (JWT)
    * bcrypt.js (密码哈希)
    * 微信登录 API 集成
* **文件上传与处理**:
    * Multer (文件上传中间件)
    * 阿里云 OSS (对象存储服务)
    * Sharp (图像处理：调整大小、压缩、格式转换)
    * Fluent-ffmpeg (视频处理：截取封面)
* **API 与路由**:
    * Express Router
* **中间件与其他库**:
    * CORS (跨域资源共享)
    * dotenv (环境变量管理)
    * Axios (HTTP 客户端)

## 项目结构
```
/src
├── app.js                      # Express 应用配置和中间件
├── server.js                   # 服务器启动入口
├── config/                     # 数据库、OSS 等配置文件
│ ├── db.js                     # 数据库连接配置
│ └── oss.js                    # OSS客户端配置
├── controllers/                # 请求处理逻辑，业务核心
│ ├── authController.js         # 用户认证相关
│ ├── travelDiaryController.js  # 游记相关
│ ├── uploadController.js       # 文件上传相关
│ └── adminController.js        # 管理员功能相关
├── middleware/                 # Express 中间件
│ ├── authMiddleware.js         # JWT 认证和角色授权
│ └── uploadMiddleware.js       # Multer 文件上传配置
├── models/                     # Mongoose 数据模型
│ ├── User.js                   # 用户数据模型
│ └── TravelDiary.js            # 游记数据模型
├── routes/                     # API 路由定义
│ ├── authRoutes.js
│ ├── travelDiaryRoutes.js
│ ├── uploadRoutes.js
│ └── adminRoutes.js
├── services/                   # 外部服务集成
│ └── ossService.js
└── utils/                      # 工具函数
  └── searchUtils.js            # 搜索相关工具
```

## 安装与启动

### 前提条件

* Node.js (建议 LTS 版本)
* npm 或 yarn
* MongoDB 数据库实例 (本地或云端)
* 阿里云 OSS 服务及相关凭证

### 步骤

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/Shamrock-TravelNote/TravelNoteServer.git
    cd TravelNoteServer
    ```

2.  **安装依赖**:
    ```bash
    npm install
    # 或者
    yarn install
    ```

3.  **配置环境变量**:
    在项目根目录下创建一个 `.env` 文件，配置以下变量：

    ```env
    PORT=3000                      # 服务器运行端口
    MONGODB_URI=your_mongodb_connection_string # MongoDB 连接字符串
    JWT_SECRET=your_strong_jwt_secret          # JWT 签名密钥

    # 微信小程序配置 (可选，如果使用微信登录)
    WECHAT_APPID=your_wechat_appid
    WECHAT_SECRET=your_wechat_secret

    # 阿里云 OSS 配置
    OSS_REGION=your_oss_region
    OSS_ACCESS_KEY_ID=your_oss_access_key_id
    OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
    OSS_BUCKET=your_oss_bucket_name
    # OSS_INTERNAL_ENDPOINT=your_oss_internal_endpoint # 可选，用于服务器在阿里云内网访问OSS
    # OSS_ENDPOINT=your_oss_endpoint # 可选，用于公网访问OSS

    # 开发模式 (可选, authMiddleware.js 中有使用)
    # DEV_MODE=quick # 设置为 'quick' 可以在开发时跳过某些验证，请谨慎使用
    ```

4.  **启动开发服务器**:
    ```bash
    npm run dev
    # 或者 (如果 package.json 中定义了 dev 脚本，通常使用 nodemon)
    # npm start (如果 package.json 中定义了 start 脚本)
    ```
    服务器默认会在 `http://localhost:3000` (或您在 `.env` 中配置的 `PORT`) 启动。

## API

### 认证 (`/api/auth`)

* `POST /wxlogin`: 微信登录
* `POST /register`: 用户注册
* `POST /login`: 用户登录
* `GET /user`: 获取当前用户信息
* `PUT /profile`: 更新用户信息

### 游记 (`/api/traveldiaries`)

* `POST /`: 发布新游记
* `GET /`: 获取游记列表（支持分页和关键词搜索）
* `GET /users/:userId/traveldiaries`: 获取指定用户的游记列表 (实际实现中 :userId 未使用，直接取当前登录用户)
* `GET /:id`: 获取游记详情
* `PUT /:id`: 编辑游记
* `DELETE /:id`: 删除游记
* `POST /:id/like`: 点赞/取消点赞游记
* `GET /:id/like`: 检查当前用户是否已点赞该游记

### 文件上传 (`/api/upload`)

* `POST /image`: 上传单张图片
* `POST /video`: 上传单个视频

### 管理员 (`/api/admin`)

* `GET /traveldiaries`: 获取需要审核的游记列表 (支持按状态过滤)
* `PUT /traveldiaries/:id/approve`: 审核通过游记
* `PUT /traveldiaries/:id/reject`: 审核拒绝游记
* `DELETE /traveldiaries/:id`: (管理员)删除游记

## 错误处理

* API 会根据操作结果返回标准的 HTTP 状态码。
* 错误信息会以 JSON 格式在响应体中返回，通常包含 `message` 字段。
* 文件上传错误由 Multer 中间件捕获并返回 400 状态码。
* 其他服务器内部错误会返回 500 状态码。

## 注意事项

* 视频封面生成依赖 `ffmpeg`，请确保服务器环境中已正确安装并配置 `ffmpeg` 到系统 PATH。