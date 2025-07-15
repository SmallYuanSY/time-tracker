# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` or `yarn dev` - Start development server with HTTPS support (default)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run start:https` - Start production server with HTTPS
- `npm run lint` - Run ESLint for code quality checks

### Database Operations
- `npm run db:status` - Check current database status (SQLite/PostgreSQL)
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database and re-seed
- `npm run backup-db` - Backup current database
- `npm run migrate:sqlite-to-postgres` - Migrate from SQLite to PostgreSQL

### SSL/HTTPS Setup
- `npm run generate:ssl` - Generate SSL certificates for localhost
- `npm run generate:ssl:ip` - Generate SSL certificates for specific IP
- `npm run check:network` - Check network configuration

### Deployment & Production
- `npm run package` - Package application for deployment
- `npm run deploy:check` - Run deployment readiness checks
- `npm run configure:domain` - Configure domain settings

## Architecture Overview

### Database Layer (Prisma + SQLite/PostgreSQL)
- **Primary Models**: User, Project, workLog, clock, Overtime, LeaveRequest
- **Authentication**: Users with role-based access (ADMIN, WEB_ADMIN, EMPLOYEE)
- **Time Tracking**: Clock in/out records, work logs with project association
- **Project Management**: Projects with user assignments and contact relationships
- **Leave Management**: Leave requests with agent/admin approval workflow
- **Overtime Tracking**: Start/end overtime sessions with device tracking
- **Signature System**: Digital signatures for attendance and overtime approval

### Authentication & Authorization
- **NextAuth.js** with credentials provider
- Role-based access control throughout the application
- Session management with JWT strategy
- User can authenticate with email or name

### API Structure (Next.js App Router)
- **REST API** endpoints under `/app/api/`
- **Admin APIs**: `/api/admin/` for administrative functions
- **Time Tracking**: `/api/clock/`, `/api/worklog/`, `/api/overtime/`
- **Project Management**: `/api/projects/`
- **User Management**: `/api/users/`, `/api/contacts/`
- **Leave System**: `/api/leaves/`

### Frontend Architecture
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** with custom UI components
- **Mobile-First Design** with dedicated mobile pages under `/mobile/`
- **Admin Dashboard** under `/admin/` for management functions

### Key Features
- **Smart Punch System**: Intelligent clock in/out with conflict detection
- **Project Time Tracking**: Associate work logs with specific projects and categories
- **Overtime Management**: Start/end overtime with approval workflow
- **Leave Request System**: Multi-step approval process (agent → admin)
- **Calendar Integration**: Weekly/monthly view of work logs and schedules
- **Device Tracking**: IP address, MAC address, and device info logging
- **Push Notifications**: Web push notification support
- **Responsive Design**: Works on desktop and mobile devices

### Database Schema Key Points
- **Soft Editing**: Most records support edit tracking with original values preserved
- **Device Tracking**: IP, MAC address, user agent stored for security/audit
- **Project Assignment**: Many-to-many relationship between users and projects
- **Work Categories**: Configurable work categories with color coding
- **Time Settings**: Configurable work hours and overtime rules
- **Holiday Management**: Support for national holidays and custom dates

### Important File Locations
- **Database Schema**: `prisma/schema.prisma`
- **Auth Configuration**: `lib/auth.ts`
- **API Routes**: `app/api/` (extensive REST API)
- **UI Components**: `components/ui/` and `components/`
- **Mobile Views**: `app/mobile/`
- **Admin Interface**: `app/admin/`
- **Database Scripts**: `scripts/` (backup, migration, deployment)

### Development Notes
- Uses SQLite for development, PostgreSQL for production
- Extensive device tracking and audit logging
- Role-based UI rendering based on user permissions
- Mobile-responsive design with dedicated mobile routes
- HTTPS support for development and production
- Comprehensive backup and migration tooling