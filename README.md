# ShelfShare-server
Peer-to-Peer Book Exchange Portal for Book owners and Book seekers

# ShelfShare: Backend Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Tech Stack](#tech-stack)
3. [Backend Setup](#backend-setup)

## Introduction
The backend of **ShelfShare** is built using **Node.js** and **Express.js**, with **MongoDB** as the database. It provides the necessary API endpoints for managing user authentication, books, and borrow requests. The backend ensures that user data is stored securely, and operations like borrowing, returning, and listing books are handled efficiently.

## Tech Stack
- **Node.js** for the backend runtime environment.
- **Express.js** for building the API.
- **MongoDB** for the database.
- **Mongoose** for object data modeling (ODM).
- **JWT** (JSON Web Tokens) for user authentication.
- **Bcryptjs** for hashing passwords.
- **dotenv** for managing environment variables.

## Backend Setup

1. Clone the repository:
   ```bash
   https://github.com/SatendraKm/ShelfShare_server.git
   ```

2. Navigate to the project directory:

```bash
cd ShelfShare-server
```
3. Install dependencies:
   ```bash
npm install
```
4. Create a .env file in the root directory with the following variables:
```bash
MONGODB_URI=
CLIENT_URL=http://localhost:3000
PORT=5000
JWT_SECRET_KEY=ShelfShare::secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=
```

5. Start the local server
```bash
npm start
```

The server will run on http://localhost:5000 (or a different port if specified).

## render deployed link- https://shelfshare-server.onrender.com
