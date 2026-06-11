# SyncOps - Supabase Setup Instructions

Follow these steps to set up your Supabase database for the SyncOps application.

## Step 1: Access Supabase SQL Editor

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: **iudxtbandriwtllpkwcs**
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

---

## Step 2: Create Users Table

Copy and paste this SQL command into the SQL Editor and click **Run**:

```sql
-- Create users table with role and performance tracking
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
  performance_score DECIMAL(5, 2) DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  avg_time INTEGER DEFAULT 0,
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

---

## Step 3: Create Rooms Table

Copy and paste this SQL command into a **New Query** and click **Run**:

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

---

## Step 4: Create Tasks Table

Copy and paste this SQL command into a **New Query** and click **Run**:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'rework')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  expected_time INTEGER NOT NULL DEFAULT 30,
  actual_time INTEGER,
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

---

## Step 5: Create Images Table

Copy and paste this SQL command into a **New Query** and click **Run**:

```sql
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  ai_result TEXT CHECK (ai_result IN ('clean', 'rework')),
  confidence DECIMAL(5, 2),
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

---

## Step 6: Create Performance History Table

Copy and paste this SQL command into a **New Query** and click **Run**:

```sql
CREATE TABLE IF NOT EXISTS performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  avg_completion_time INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  performance_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read performance history
CREATE POLICY "All authenticated users can read performance history" ON performance_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: System can insert performance history
CREATE POLICY "System can insert performance history" ON performance_history
  FOR INSERT WITH CHECK (true);
```

---

## Step 7: Set Up Storage Bucket

1. Click on **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Name it: `task-images`
4. Toggle **Public bucket** to ON
5. Click **Create bucket**

---

## Step 8: Create Test Users (Optional but Recommended)

Copy and paste this SQL command into a **New Query** and click **Run**:

```sql
-- Note: This creates test users. Replace passwords with secure ones in production.

-- Create a test manager account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  'manager@syncops.test',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"role": "manager"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Get the manager's user ID and insert into users table
INSERT INTO users (id, name, role)
SELECT id, 'Test Manager', 'manager'
FROM auth.users
WHERE email = 'manager@syncops.test'
ON CONFLICT DO NOTHING;

-- Create a test staff account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  'staff@syncops.test',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"role": "staff"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Get the staff's user ID and insert into users table
INSERT INTO users (id, name, role)
SELECT id, 'Test Staff', 'staff'
FROM auth.users
WHERE email = 'staff@syncops.test'
ON CONFLICT DO NOTHING;

-- Create some test rooms
INSERT INTO rooms (room_number, status, priority)
VALUES
  ('101', 'vacant', 'normal'),
  ('102', 'occupied', 'high'),
  ('103', 'cleaning', 'normal'),
  ('104', 'vacant', 'low'),
  ('105', 'occupied', 'normal'),
  ('106', 'vacant', 'high')
ON CONFLICT DO NOTHING;
```

---

## Step 9: Test Your Setup

After running all the SQL commands, you can verify everything is set up correctly:

1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - `users`
   - `rooms`
   - `tasks`
   - `images`
   - `performance_history`

3. Click on each table to verify data (especially the test users and rooms)

---

## ✅ Verification Checklist

- [ ] All 5 tables created successfully
- [ ] `task-images` storage bucket created and set to public
- [ ] Test users created (manager@syncops.test, staff@syncops.test)
- [ ] Test rooms created (6 rooms with different statuses)
- [ ] Can see all tables in Table Editor
- [ ] RLS policies are enabled on all tables

---

## 🔐 Security Notes

- The test users have password `password123` - **change this in production**
- All tables have Row Level Security (RLS) enabled
- Users can only see data they have access to based on their role
- Managers can see all staff and rooms
- Staff can only see their own tasks

---

## 📝 Next Steps After Setup

Once you've completed the setup:

1. Test login with the test accounts in the mobile app
2. Create some test tasks through the manager dashboard
3. Assign tasks to staff members
4. Test the staff dashboard

Let me know when you've completed the setup, and I'll continue with the remaining features!
