# SyncOps Mobile App - Design Plan

## Overview
SyncOps is a Smart Hospitality Management System designed for managers and staff to collaborate on room cleaning and maintenance tasks. The app features task automation, AI-powered cleanliness verification, and workforce optimization.

---

## Screen List

### 1. **Authentication Screens**
- **Login Screen**: Email/password authentication with role selection (Manager/Staff)
- **Sign Up Screen**: New user registration with role assignment
- **Splash Screen**: App branding and loading state

### 2. **Manager Dashboard**
- **Home Screen**: Overview of all rooms, tasks, and team performance
- **Room Status Grid**: Visual grid showing room status (occupied/vacant/cleaning)
- **Task Management Screen**: List of all tasks with filters and status tracking
- **AI Reports Screen**: Review AI verification results and approve/reject cleanings
- **Performance Analytics Screen**: Team performance metrics and workforce optimization insights
- **Task Detail Screen**: Full task information with images and AI results

### 3. **Staff Dashboard**
- **Home Screen**: Assigned tasks and quick actions
- **Task List Screen**: All assigned tasks with status indicators
- **Task Detail Screen**: Full task information, timer, and image upload
- **Camera Screen**: Capture images for AI verification
- **Task History Screen**: Completed tasks and performance history
- **Profile Screen**: Personal performance metrics and settings

### 4. **Shared Screens**
- **Settings Screen**: App preferences, notifications, logout
- **Profile Screen**: User information and performance stats

---

## Primary Content and Functionality

### Manager Dashboard - Home Screen
**Content:**
- Room status grid (3×3 or 2×3 layout) showing occupied/vacant/cleaning status
- Quick stats: Total tasks, pending tasks, team availability
- Recent activity feed

**Functionality:**
- Tap room to view details and assign tasks
- Mark rooms as vacant to trigger task automation
- Quick access to task list and analytics

### Manager Dashboard - Task Management
**Content:**
- Task list with columns: Room ID, Assigned Staff, Status, Priority, Expected Time
- Filters: Status (pending/in-progress/completed/rework), Priority, Date range
- Search bar for quick task lookup

**Functionality:**
- Create manual tasks
- Reassign tasks
- Update task status
- View task details with AI results

### Manager Dashboard - AI Reports
**Content:**
- List of completed tasks with AI verification results
- Image preview, AI label (clean/rework), confidence percentage
- Manager override option

**Functionality:**
- Review AI results
- Approve or reject cleaning
- Override AI decision
- Send task back for rework

### Manager Dashboard - Performance Analytics
**Content:**
- Team performance metrics (performance score, tasks completed, avg time)
- Workforce optimization recommendations (recommended staff count)
- Charts showing trends over time

**Functionality:**
- View individual staff performance
- Export reports
- View predictive recommendations

### Staff Dashboard - Home Screen
**Content:**
- Assigned tasks (pending/in-progress)
- Task cards showing room, priority, expected time
- Quick action buttons: Start Task, View Details

**Functionality:**
- Start task (timer begins)
- View task details
- Quick access to task list

### Staff Dashboard - Task Detail
**Content:**
- Room information
- Task description and priority
- Timer (elapsed time vs expected time)
- Upload image button
- Task history

**Functionality:**
- Start/pause/resume timer
- Upload image for AI verification
- Mark task as complete
- Add notes

### Staff Dashboard - Camera Screen
**Content:**
- Camera preview
- Capture button
- Image preview with retake option
- Submit button

**Functionality:**
- Capture image
- Retake image
- Submit for AI verification
- View AI result (clean/rework)

---

## Key User Flows

### Manager Flow: Create Task via Room Status
1. Manager views room status grid
2. Taps on "vacant" room
3. System triggers task automation algorithm
4. Task assigned to highest-scoring staff member
5. Staff receives real-time notification
6. Manager sees task in task list

### Manager Flow: Review AI Verification
1. Manager navigates to AI Reports
2. Views completed task with image and AI result
3. Sees confidence percentage
4. If confidence < 80%, manually reviews
5. Approves or rejects cleaning
6. If rejected, sends task back to staff for rework

### Staff Flow: Complete Task
1. Staff receives task notification
2. Taps task to view details
3. Taps "Start Task" (timer begins)
4. Completes cleaning work
5. Taps "Upload Image"
6. Captures image with camera
7. AI verifies cleanliness
8. If approved, task marked complete
9. If rework needed, task reassigned

### Workforce Optimization Flow
1. System collects daily task and completion time data
2. Calculates performance scores for each staff member
3. Predicts recommended staff count for next day
4. Manager views recommendations in analytics screen
5. Manager adjusts staffing based on predictions

---

## Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Primary (Accent) | Blue | #2563EB |
| Success (Approved/Complete) | Green | #22C55E |
| Warning (In Progress/Pending) | Amber | #F59E0B |
| Error (Rejected/Rework) | Red | #EF4444 |
| Background | White (Light) / Dark Gray (Dark) | #FFFFFF / #151718 |
| Surface | Light Gray (Light) / Darker Gray (Dark) | #F5F5F5 / #1E2022 |
| Foreground (Text) | Dark Gray (Light) / Light Gray (Dark) | #11181C / #ECEDEE |
| Muted (Secondary Text) | Medium Gray | #687076 / #9BA1A6 |
| Border | Light Border | #E5E7EB / #334155 |

---

## Layout Principles

- **Portrait Orientation**: All screens designed for mobile portrait (9:16 aspect ratio)
- **One-Handed Usage**: Critical buttons placed within thumb reach (bottom 60% of screen)
- **Card-Based Design**: Use cards for tasks, rooms, and analytics
- **Status Badges**: Visual indicators for task status (color-coded)
- **Clear Hierarchy**: Primary action buttons prominent, secondary actions in menus
- **Responsive Spacing**: Consistent padding and margins for visual rhythm

---

## Navigation Structure

```
Root
├── Auth Stack
│   ├── Login
│   ├── Sign Up
│   └── Splash
├── Manager Stack
│   ├── Dashboard (Home)
│   ├── Room Status Grid
│   ├── Task Management
│   ├── AI Reports
│   ├── Performance Analytics
│   ├── Task Detail
│   └── Settings
└── Staff Stack
    ├── Dashboard (Home)
    ├── Task List
    ├── Task Detail
    ├── Camera
    ├── Task History
    ├── Profile
    └── Settings
```

---

## Design Tokens (Tailwind Classes)

- **Spacing**: Use `gap-4`, `p-4`, `mb-2` for consistent spacing
- **Typography**: `text-lg font-semibold` for headers, `text-sm text-muted` for secondary text
- **Buttons**: `bg-primary text-white px-4 py-2 rounded-lg` for primary actions
- **Cards**: `bg-surface rounded-lg p-4 border border-border` for content containers
- **Status Indicators**: Badge components with color-coded backgrounds

---

## Accessibility Considerations

- High contrast text (WCAG AA compliant)
- Touch targets minimum 44×44 points
- Clear focus states for keyboard navigation
- Descriptive labels for all interactive elements
- Support for system text size preferences
