# TravelNote Server

旅行笔记分享平台后端服务

## 项目结构

```
TravelNoteServer/
├── src/
│   ├── controllers/                    # 控制器层
│   │   ├── authController.js           # 用户认证
│   │   ├── travelDiaryController.js    # 游记管理
│   │   └── adminController.js          # 管理员功能
│   ├── models/                         # 数据模型层
│   │   ├── User.js                     # 用户模型
│   │   └── TravelDiary.js              # 游记模型
│   ├── middleware/                     # 中间件
│   │   └── authMiddleware.js           # 认证中间件
│   ├── routes/                         # 路由层
│   │   ├── authRoutes.js               # 认证路由
│   │   ├── travelDiaryRoutes.js        # 游记路由
│   │   └── adminRoutes.js              # 管理路由
│   ├── app.js                          # 应用入口
│   └── server.js                       # 服务器启动
├── config/
│   └── db.js                           # 数据库配置
└── .env                                # 环境变量配置
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

### 数据库设计

#### **1. `users` 集合**
| 字段名      | 类型     | 是否必填 | 默认值   | 说明                                           |
| :---------- | :------- | :------- | :------- | :--------------------------------------------- |
| `_id`       | ObjectId | 是       | 自动生成 | MongoDB 默认生成的唯一标识符                   |
| `username`  | String   | 是       | -        | 用户名，唯一性约束                             |
| `password`  | String   | 是       | -        | 加密后的密码                                   |
| `nickname`  | String   | 是       | -        | 用户昵称，唯一性约束                           |
| `avatar`    | String   | 否       | -        | 用户头像 URL 或文件路径                        |
| `role`      | String   | 是       | "user"   | 用户角色，可选值为 "user", "reviewer", "admin" |
| `createdAt` | Date     | 是       | Date.now | 用户创建时间                                   |

#### **2. `travelDiaries` 集合**
| 字段名            | 类型     | 是否必填 | 默认值    | 说明                                                 |
| :---------------- | :------- | :------- | :-------- | :--------------------------------------------------- |
| `_id`             | ObjectId | 是       | 自动生成  | MongoDB 默认生成的唯一标识符                         |
| `title`           | String   | 是       | -         | 游记标题                                             |
| `content`         | String   | 是       | -         | 游记内容                                             |
| `images`          | [String] | 是       | -         | 图片 URL 数组                                        |
| `video`           | String   | 否       | -         | 视频 URL                                             |
| `author`          | ObjectId | 是       | -         | 关联到 `users` 集合的用户 ID                         |
| `publishTime`     | Date     | 是       | Date.now  | 游记发布时间                                         |
| `status`          | String   | 是       | "pending" | 游记状态，可选值为 "pending", "approved", "rejected" |
| `rejectionReason` | String   | 否       | -         | 审核拒绝原因，仅在状态为 "rejected" 时填写           |
| `isDeleted`       | Boolean  | 是       | false     | 逻辑删除标记                                         |
| `createdAt`       | Date     | 是       | Date.now  | 记录创建时间                                         |
| `updatedAt`       | Date     | 是       | Date.now  | 记录更新时间                                         |

### API设计

#### **用户认证模块**
| 路径                 | 方法 | 请求体参数                                          | 响应描述                                   |
| :------------------- | :--- | :-------------------------------------------------- | :----------------------------------------- |
| `/api/auth/register` | POST | `username`, `password`, `nickname`, `avatar` (可选) | 注册新用户，校验用户名和昵称是否重复。     |
| `/api/auth/login`    | POST | `username/nickname`, `password`                     | 验证用户身份，返回认证 Token 或 Session。  |
| `/api/auth/user`     | GET  | -                                                   | 返回当前登录用户的详细信息，需要身份验证。 |

#### **游记模块**
| 路径                               | 方法   | 请求体参数                                   | 响应描述                                                         |
| :--------------------------------- | :----- | :------------------------------------------- | :--------------------------------------------------------------- |
| `/api/traveldiaries`               | POST   | `title`, `content`, `images`, `video` (可选) | 发布新游记，关联当前登录用户，状态默认为“待审核”，需要身份验证。 |
| `/api/traveldiaries`               | GET    | 查询参数：`page`, `limit`, `keyword`         | 分页获取所有“已通过”状态且未被逻辑删除的游记列表。               |
| `/api/users/:userId/traveldiaries` | GET    | 查询参数：`status` (可选)                    | 获取指定用户的游记列表，支持按状态筛选，需要身份验证。           |
| `/api/traveldiaries/:id`           | GET    | -                                            | 获取指定 ID 的游记详情，根据状态和权限控制访问。                 |
| `/api/traveldiaries/:id`           | PUT    | `title`, `content`, `images`, `video` (可选) | 更新指定 ID 的游记内容，需要作者本人或管理员权限。               |
| `/api/traveldiaries/:id`           | DELETE | -                                            | 将指定 ID 的游记标记为逻辑删除状态，需要作者本人或管理员权限。   |

#### **审核管理模块**
| 路径                                   | 方法   | 请求体参数                      | 响应描述                                                         |
| :------------------------------------- | :----- | :------------------------------ | :--------------------------------------------------------------- |
| `/api/admin/auth/login`                | POST   | `username/nickname`, `password` | 验证管理系统用户身份，返回角色信息。                             |
| `/api/admin/traveldiaries`             | GET    | 查询参数：`status` (可选)       | 获取所有游记列表，包括所有状态的游记，需要审核人员或管理员权限。 |
| `/api/admin/traveldiaries/:id/approve` | PUT    | -                               | 将指定 ID 的游记状态更新为“已通过”，需要审核人员或管理员权限。   |
| `/api/admin/traveldiaries/:id/reject`  | PUT    | `rejectionReason`               | 将指定 ID 的游记状态更新为“未通过”，并记录拒绝原因。             |
| `/api/admin/traveldiaries/:id`         | DELETE | -                               | 将指定 ID 的游记标记为逻辑删除状态，需要管理员权限。             |


## 开发建议

1. 使用 VSCode 作为开发工具
2. 安装 ESLint 和 Prettier 插件
3. 遵循 RESTful API 设计规范
4. 使用 Postman 测试 API 接口
