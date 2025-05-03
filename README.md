# TravelNote Server

旅行笔记分享平台后端服务

## 项目结构

```
TravelNoteServer/
├── src/
│   ├── controllers/     # 控制器层
│   │   ├── authController.js      # 用户认证
│   │   ├── travelDiaryController.js   # 游记管理
│   │   └── adminController.js     # 管理员功能
│   ├── models/         # 数据模型层
│   │   ├── User.js         # 用户模型
│   │   └── TravelDiary.js  # 游记模型
│   ├── middleware/     # 中间件
│   │   └── authMiddleware.js    # 认证中间件
│   ├── routes/         # 路由层
│   │   ├── authRoutes.js       # 认证路由
│   │   ├── travelDiaryRoutes.js # 游记路由
│   │   └── adminRoutes.js      # 管理路由
│   ├── app.js         # 应用入口
│   └── server.js      # 服务器启动
├── config/
│   └── db.js         # 数据库配置
└── .env              # 环境变量配置
```

## 环境要求

- Node.js >= 16
- MongoDB >= 4.4

## 快速开始

1. 安装依赖
```bash
pnpm install
```

2. 配置环境变量
`.env` 配置：
```
MONGODB_URI=mongodb://localhost:27017/travelDB
PORT=3000
JWT_SECRET=your_jwt_secret_key
DEV_MODE=quick  # quick: 快速开发模式, normal: 正常开发模式
```

1. 启动服务
```bash
# 开发模式
pnpm run dev

# 生产模式
pnpm start
```

## 开发模式

项目支持两种开发模式：

- 快速开发模式 (DEV_MODE=quick)：
  - 跳过token验证
  - 自动注入测试用户信息
  - 适合前后端联调阶段

- 正常开发模式 (DEV_MODE=normal)：
  - 需要完整的认证流程
  - 适合完整功能测试

## API 接口

### 认证相关

- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录
- GET /api/auth/user - 获取当前用户信息

### 游记相关

- POST /api/traveldiaries - 发布游记
- GET /api/traveldiaries - 获取游记列表
- GET /api/traveldiaries/:id - 获取游记详情
- PUT /api/traveldiaries/:id - 编辑游记
- DELETE /api/traveldiaries/:id - 删除游记

### 管理员相关

- GET /api/admin/traveldiaries - 获取待审核游记
- PUT /api/admin/traveldiaries/:id/approve - 审核通过
- PUT /api/admin/traveldiaries/:id/reject - 审核拒绝
- DELETE /api/admin/traveldiaries/:id - 删除游记

## 用户角色

- user: 普通用户
- reviewer: 审核员
- admin: 管理员

## 开发建议

1. 使用 VSCode 作为开发工具
2. 安装 ESLint 和 Prettier 插件
3. 遵循 RESTful API 设计规范
4. 使用 Postman 测试 API 接口
