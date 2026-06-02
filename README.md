# Cexistore Tempmail Web

A modern, fast, and secure temporary email service and privacy dashboard built with Vite + React on the frontend and an Express backend under `server/`.

## Features

- **Instant Temporary Emails**: Generate disposable email addresses immediately with a 30-minute self-destruct timer.
- **Virtual Persona Generator**: Instantly generate realistic virtual personas (names, phone numbers, identity numbers, and passwords) to protect your real identity online.
- **Media Downloader**: Download media links from platforms like TikTok, Instagram, YouTube, and X / Twitter directly.
- **Virtual Number Providers**: Quick access to free online virtual number providers for temporary SMS verifications.
- **Premium Upgrades**: Flexible plans (Free, Pro, VVIP) supporting custom aliases and domain allocations.

## System Architecture

```mermaid
graph TD
    %% Styling Definitions
    classDef client fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#0f172a
    classDef server fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#0f172a
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#0f172a
    classDef thirdparty fill:#fffbeb,stroke:#f59e0b,stroke-width:2px,color:#0f172a

    %% Nodes
    User(["Client / Frontend (Vite + React)"])
    Server["Express Backend Server (server.js)"]
    Supabase[("Supabase (Auth & Profile DB)")]
    EmailInbox["Temp Email SMTP Server"]
    Ptero["Pterodactyl API (Hosting Node)"]
    MediaDownloader["Media Downloader API (TikTok, IG, YT, X)"]
    SMSProvider["Virtual Phone Provider API"]

    %% Connections
    User -->|API requests & Auth session| Server
    Server -->|Sync Profiles, Verify Session, Update Tokens| Supabase
    Server -->|Deploy hosting panels| Ptero
    Server -->|Scrape media links| MediaDownloader
    Server -->|Lookup active virtual numbers| SMSProvider
    EmailInbox -->|Route incoming emails| Server
    Server -->|Deliver email data| User

    %% Class Assigning
    class User client;
    class Server server;
    class Supabase db;
    class Ptero,MediaDownloader,SMSProvider,EmailInbox thirdparty;
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS (utility helper classes), Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, Supabase (PostgreSQL database & Authentication).

## Development

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

## Production Build

Build the production assets:
```bash
npm run build
```
