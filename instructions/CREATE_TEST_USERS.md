# Creating Test Users in Supabase - Corrected Method

The previous SQL method doesn't work because Supabase Auth requires proper authentication flow. Here are two methods to create test users:

---

## Method 1: Using Supabase Dashboard (Easiest)

### Step 1: Create Manager User

1. Go to your Supabase project dashboard
2. Click on **Authentication** in the left sidebar
3. Click on the **Users** tab
4. Click **Add user** button
5. Fill in:
   - **Email:** `manager@syncops.test`
   - **Password:** `password123`
   - Check **Auto confirm user**
6. Click **Create user**

### Step 2: Add Manager to Users Table

1. Go to **SQL Editor** → Click **New Query**
2. Copy and paste this (replace `<MANAGER_ID>` with the UUID shown after creating the user):

```sql
INSERT INTO users (id, name, role)
VALUES ('<MANAGER_ID>', 'Test Manager', 'manager');
```

### Step 3: Create Staff User

Repeat Steps 1-2 with:
- **Email:** `staff@syncops.test`
- **Password:** `password123`

Then insert into users table:

```sql
INSERT INTO users (id, name, role)
VALUES ('<STAFF_ID>', 'Test Staff', 'staff');
```

---

## Method 2: Using Supabase CLI (If you have it installed)

```bash
# Create manager user
supabase auth admin create-user \
  --email manager@syncops.test \
  --password password123 \
  --project-id iudxtbandriwtllpkwcs

# Create staff user
supabase auth admin create-user \
  --email staff@syncops.test \
  --password password123 \
  --project-id iudxtbandriwtllpkwcs
```

Then get the UUIDs and insert into users table as shown above.

---

## Method 3: Using the Mobile App (Best for Testing)

1. Open the SyncOps mobile app
2. Click **Sign Up**
3. Enter email: `manager@syncops.test`
4. Enter password: `password123`
5. Select role: **Manager**
6. Click **Sign Up**

Repeat for staff user with role **Staff**.

This is the most realistic way to test the app!

---

## ✅ Verification

After creating users, verify in SQL Editor:

```sql
-- Check users table
SELECT id, name, role FROM users;

-- You should see:
-- manager@syncops.test | Test Manager | manager
-- staff@syncops.test   | Test Staff   | staff
```

---

## 🔑 Getting the User ID from Dashboard

If you created users via the Dashboard and need their UUID:

1. Go to **Authentication** → **Users**
2. Click on the user row
3. The UUID will be shown in the user details panel
4. Copy it and use in the SQL INSERT statement above

---

## Next Steps

Once you have created the test users:

1. Try logging into the app with the test credentials
2. You should see the Manager Dashboard if logged in as manager
3. You should see the Staff Dashboard if logged in as staff
4. Both should be able to see the rooms you created

Let me know once the users are created and you can log in!
