# Project Welber

This is a [Next.js](https://nextjs.org) project created with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

- `app/` - Contains the application pages and layouts (App Router)
- `public/` - Static assets like images
- `package.json` - Project dependencies and scripts

## Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Creates an optimized production build
- `npm start` - Runs the production server
- `npm run lint` - Runs ESLint to check code quality
- `npm run lint:fix` - Runs ESLint and automatically fixes fixable issues

## Learn More

To learn more about Next.js, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Technologies Used

- **Next.js 16.1.1** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Material-UI** - React component library
- **Firebase** - Authentication and Firestore database
- **Firebase Admin** - Server-side Firebase SDK
- **ESLint** - Code linting

## Admin Features

### Admin Authentication

The project includes an administrative interface protected by Google OAuth authentication:

- **Admin Login**: `/admin-login` - Google OAuth login page
- **Admin Panel**: `/admin-panel` - Protected admin dashboard

### Database Management

The admin panel provides the following functionality:

- **Clear Database**: Remove all viagens (trips) from the Firestore database
- Requires authentication via Firebase ID token
- Includes confirmation dialog to prevent accidental deletions

### Environment Variables

To enable Firebase authentication, set the following environment variables:

```bash
# Client-side Firebase configuration (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here

# Server-side Firebase Admin (required for database operations)
FIREBASE_SA_BASE64=your_base64_encoded_service_account_json

# Other environment variables
MAX_LUGARES=number_of_max_passengers
```

**Note**: Firebase configuration values (authDomain, projectId, etc.) are already configured in the code and are safe to commit as they are public identifiers for your Firebase project.

## Security

- All admin API endpoints require Firebase ID token authentication
- Protected routes automatically redirect unauthenticated users to login
- No sensitive data exposed in client-side code
- Firebase Admin SDK used for server-side operations