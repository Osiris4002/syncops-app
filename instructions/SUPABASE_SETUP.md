# SyncOps - Supabase Setup Guide

This guide provides all the SQL commands needed to set up the SyncOps database schema in your Supabase project.

## Database Schema

Run the following SQL commands in your Supabase SQL Editor to create the required tables and policies.

### 1. Create Users Table (with Role Support)

```sql
-- Create users table with role and performance tracking
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
  performance_score DECIMAL(5, 2) DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  avg_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Managers can read all staff profiles
CREATE POLICY "Managers can read staff profiles" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'manager'
  );
```

### 2. Create Rooms Table

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant', 'cleaning')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read rooms
CREATE POLICY "All authenticated users can read rooms" ON rooms
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only managers can update rooms
CREATE POLICY "Managers can update rooms" ON rooms
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'manager'
  );
```

### 3. Create Tasks Table

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'rework')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  expected_time INTEGER NOT NULL DEFAULT 30, -- in minutes
  actual_time INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read tasks
CREATE POLICY "All authenticated users can read tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Assigned staff can update their own tasks
CREATE POLICY "Staff can update assigned tasks" ON tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Policy: Managers can update all tasks
CREATE POLICY "Managers can update all tasks" ON tasks
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'manager'
  );

-- Policy: Managers can create tasks
CREATE POLICY "Managers can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'manager'
  );
```

### 4. Create Images Table (for AI Verification)

```sql
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ai_result TEXT CHECK (ai_result IN ('clean', 'rework')),
  confidence DECIMAL(5, 2), -- percentage (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read images
CREATE POLICY "All authenticated users can read images" ON images
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Staff can upload images for their tasks
CREATE POLICY "Staff can upload images for their tasks" ON images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_id 
      AND tasks.assigned_to = auth.uid()
    )
  );
```

### 5. Create Performance History Table (for Workforce Optimization)

```sql
CREATE TABLE IF NOT EXISTS performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  avg_completion_time INTEGER DEFAULT 0, -- in minutes
  success_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  performance_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read performance history
CREATE POLICY "All authenticated users can read performance history" ON performance_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only system/server can insert performance history
CREATE POLICY "System can insert performance history" ON performance_history
  FOR INSERT WITH CHECK (true);
```

## Setup Instructions

### Step 1: Create the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste all the SQL commands above
5. Click **Run**

### Step 2: Configure Storage for Images

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. Name it `task-images`
4. Set it to **Public** (for easy image access)
5. Click **Create bucket**

### Step 3: Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Go to **URL Configuration**
4. Add your app's redirect URLs:
   - For development: `exps://8081-iu4p1sxzi5pinqd79wzv9-be610244.sg1.manus.computer`
   - For production: Your production app URL

### Step 4: Create Test Users (Optional)

```sql
-- Create a test manager account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'manager@syncops.test',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- Get the manager's user ID and insert into users table
INSERT INTO users (id, name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'manager@syncops.test'),
  'Test Manager',
  'manager'
);

-- Create a test staff account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'staff@syncops.test',
  crypt('password123', gen_salt('bf')),
  NOW()
);

-- Get the staff's user ID and insert into users table
INSERT INTO users (id, name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'staff@syncops.test'),
  'Test Staff',
  'staff'
);
```

## Environment Variables

The following environment variables are already configured in your app:

```
EXPO_PUBLIC_SUPABASE_URL=https://iudxtbandriwtllpkwcs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Real-time Subscriptions

To enable real-time updates in your app, Supabase Realtime is already configured. You can subscribe to changes like this:

```typescript
const channel = supabase
  .channel('tasks')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'tasks' },
    (payload) => {
      console.log('Task updated:', payload);
    }
  )
  .subscribe();
```

## Edge Functions (Optional)

For advanced features like automatic task assignment, you can create Edge Functions:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create a new function**
3. Name it `assign-tasks`
4. Add your business logic for task automation

## Next Steps

1. Run the SQL schema setup in your Supabase dashboard
2. Create a storage bucket for task images
3. Test authentication with the provided test users
4. Implement the Supabase client in your mobile app
5. Set up real-time subscriptions for live updates
