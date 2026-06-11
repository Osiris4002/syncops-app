# SyncOps

AI-Powered Hospitality Management System with Housekeeping Automation

## Overview

SyncOps is a mobile-first hospitality management application designed to automate housekeeping operations, optimize workforce allocation, and improve room turnover efficiency.

The system provides separate role-based dashboards for Front Desk staff, Managers, and Housekeeping Staff while maintaining a single mobile application architecture.

## Key Features

### Authentication & Access Control

* Email and password authentication
* Role-based access control
* Persistent user sessions
* Secure user management using Supabase Auth

### Housekeeping Task Automation

* Room vacancy tracking
* Automated task generation
* Staff recommendation engine
* Task assignment and monitoring

### Manager Dashboard

* Room status monitoring
* Task management
* Staff performance analytics
* AI verification reports
* Workforce optimization insights

### Staff Dashboard

* Assigned task management
* Task status updates
* Work history
* Performance tracking
* Room image submission for verification

### AI Cleanliness Verification

* Room image upload
* AI-powered cleanliness assessment
* Clean / Needs Rework classification
* Manual manager override support

## Technology Stack

### Frontend

* React Native
* Expo
* TypeScript

### Backend

* Supabase
* PostgreSQL Database
* Supabase Authentication
* Supabase Storage
* Supabase Realtime

### AI

* TensorFlow Lite / Google Teachable Machine

## Project Architecture

```text
syncOps/
├── app/
│   ├── screens/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   └── utils/
├── assets/
├── docs/
└── supabase/
```

## Current Progress

### Completed

* Supabase project setup
* Database schema design
* Email/password authentication
* Role-based navigation
* Manager dashboard foundation
* Staff dashboard foundation
* Analytics screens
* App branding

### In Progress

* Task automation engine
* Real-time notifications
* AI cleanliness verification
* Workforce optimization module

## Installation

### Prerequisites

* Node.js 20+
* Expo CLI
* Expo Go
* Supabase Account

### Setup

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/syncOps.git
cd syncOps
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

Start development server:

```bash
npx expo start
```

Scan the QR code using Expo Go.

## Project Goal

The objective of SyncOps is to demonstrate a practical implementation of AI-driven housekeeping automation for hospitality environments by integrating:

* Automated task allocation
* Workforce optimization
* Real-time monitoring
* AI cleanliness verification

## License

MIT License
