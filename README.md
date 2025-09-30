# AffiliateFlow - SME Partner Hub

A full-stack web application for managing affiliate partnerships with role-based access control.

## Features

- **User Authentication**: JWT-based authentication with access and refresh tokens
- **Role-Based Access Control**: Four distinct user roles (ADMIN, STAFF, MEMBER, OWNER)
- **Post Management**: CRUD operations for posts with different permissions per role
- **User Management**: Admin can manage users, roles, and permissions
- **Responsive Design**: Beautiful UI built with Tailwind CSS
- **TypeScript**: Full TypeScript support for both frontend and backend
- **SQLite Database**: Prisma ORM with SQLite for data persistence

## Tech Stack

- **Frontend**: Vanilla TypeScript with Vite
- **Backend**: Node.js + Express (TypeScript)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT (RS256) with bcrypt password hashing
- **Styling**: Tailwind CSS
- **Icons**: Feather Icons

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd website_affiliate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_ACCESS_SECRET="your-access-secret-key-here"
   JWT_REFRESH_SECRET="your-refresh-secret-key-here"
   PORT=5000
   NODE_ENV=development
   ADMIN_EMAIL=admin@site.local
   ADMIN_PASSWORD=Admin@12345
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # Seed the database with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 3000).

### Default Login Credentials

After seeding the database, you can log in with these accounts:

- **Admin**: `admin@site.local` / `Admin@12345`
- **Owner**: `owner@example.com` / `password123`
- **Staff**: `staff@example.com` / `password123`
- **Member**: `member@example.com` / `password123`

## Project Structure

```
├── public/                 # Static HTML files (served by Vite)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── *-dashboard.html
├── src/
│   ├── client/            # Frontend TypeScript modules
│   │   ├── api/          # API client
│   │   ├── types/        # TypeScript type definitions
│   │   ├── auth.ts       # Authentication manager
│   │   └── ui.ts         # UI utilities
│   └── server/           # Backend Express server
│       ├── middleware/   # Express middleware
│       ├── routes/       # API routes
│       ├── types/        # Server type definitions
│       └── index.ts      # Server entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Database seeding script
└── dist/                 # Built files (generated)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Posts
- `GET /api/posts` - Get all posts (role-based filtering)
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create new post (Staff/Admin only)
- `PUT /api/posts/:id` - Update post (Staff/Admin only)
- `DELETE /api/posts/:id` - Delete post (Admin only)

## User Roles & Permissions

### ADMIN
- Full system access
- Manage all users
- Create, edit, and delete all posts
- View all data

### STAFF (SME Employee)
- Create and edit posts
- View all posts
- Cannot manage users

### MEMBER (Collaborator)
- View published posts only
- Cannot create or edit posts

### OWNER (SME Owner)
- View all posts
- Manage business analytics
- Cannot create or edit posts directly

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:client` - Start only frontend development server
- `npm run dev:server` - Start only backend server
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push database schema changes
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

### Database Management

The application uses SQLite with Prisma ORM. Database operations:

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (careful!)
npx prisma db push --force-reset
npm run db:seed
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds of 12
- **JWT Tokens**: RS256 algorithm for secure token generation
- **Rate Limiting**: Applied to authentication endpoints
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configured for production domains
- **Helmet**: Security headers middleware

## Deployment

### Environment Variables

For production deployment, ensure these environment variables are set:

```env
DATABASE_URL="your-production-database-url"
JWT_ACCESS_SECRET="your-secure-access-secret"
JWT_REFRESH_SECRET="your-secure-refresh-secret"
PORT=5000
NODE_ENV=production
```

### Build for Production

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
