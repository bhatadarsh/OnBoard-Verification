# Admin Dashboard - Visual Guide

## Header Section
```
┌─────────────────────────────────────────────────────────────────────┐
│  Candidate Management                                               │
│                                                                     │
│  Last updated: 8:05:23 PM    [🔄 Refresh]    Sort by: [Newest ▼]  │
└─────────────────────────────────────────────────────────────────────┘
```

## Candidate Card Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                          [Score: 7.5/10] ← Badge   │
│  Candidate #123                          [SELECTED] ← Status       │
│                                                                     │
│  ┌─────────────────────────────┬─────────────────────────────────┐ │
│  │ Interview Status: COMPLETED │ Cheating Severity: LOW          │ │
│  │ Confidence: HIGH            │ Cheating Score: 0.50            │ │
│  │ Tab Changes: 0              │ System Rec: Yes                 │ │
│  └─────────────────────────────┴─────────────────────────────────┘ │
│                                                                     │
│  🚨 Intelligence Alerts (2)                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ANSWER_1                                    8:03:45 PM      │   │
│  │ [TOO_FAST] [COPY_PASTE_DETECTED]                           │   │
│  │ Severity Impact: +1.50                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🎓 Intelligence Evaluation                  Overall Score: 8.2/10 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ANSWER_1                                    [Score: 8/10]   │   │
│  │ Reasoning: Strong technical understanding...               │   │
│  │ Strengths:              Weaknesses:                         │   │
│  │ • Clear explanation     • Could add examples                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [View Resume] [Select Candidate] [Reject] [Download Report]      │
└─────────────────────────────────────────────────────────────────────┘
```

## Color Coding Reference

### Tab Changes
- **0 changes**: 🟢 Green (No tab switching)
- **1-2 changes**: 🟡 Yellow (Minor concern)
- **3+ changes**: 🔴 Red + Bold (High concern)

### Cheating Score
- **≤ 2.0**: 🟢 Green (Low risk)
- **2.0 - 3.0**: 🟡 Yellow (Medium risk)
- **> 3.0**: 🔴 Red (High risk)

### Cheating Severity
- **LOW**: 🟢 Green
- **MEDIUM**: 🟡 Yellow
- **HIGH**: 🔴 Red

### Confidence Level
- **HIGH**: 🟢 Green
- **MEDIUM/LOW**: 🟡 Yellow

### Admin Status
- **SELECTED**: 🟢 Green background
- **REJECTED**: 🔴 Red background
- **SHORTLISTED**: 🟡 Yellow badge
- **UNDER_REVIEW**: 🟡 Yellow badge

## Auto-Refresh Behavior

### Silent Refresh (Every 10 seconds)
```
Time: 8:05:13 PM → Data fetched
Time: 8:05:23 PM → Data fetched (silent)
Time: 8:05:33 PM → Data fetched (silent)
Time: 8:05:43 PM → Data fetched (silent)
```

**User sees:**
- Last updated timestamp changes
- New data appears automatically
- No loading spinners
- No interruption to viewing

### Manual Refresh
```
Admin clicks [🔄 Refresh] button
    ↓
Button changes to [🔄 Refreshing...] (disabled, gray)
    ↓
Data fetched from backend
    ↓
UI updates
    ↓
Button returns to [🔄 Refresh] (enabled, blue)
    ↓
Timestamp updates
```

### Action-Triggered Refresh
```
Admin clicks [Select Candidate]
    ↓
Alert: "Candidate selected successfully!"
    ↓
Button shows [🔄 Refreshing...]
    ↓
Data refreshed
    ↓
UI shows updated status (SELECTED badge, green background)
```

## Real-Time Metrics Display

### Before Interview
```
Interview Status: N/A
Confidence: N/A
Tab Changes: 0
Cheating Severity: LOW
Cheating Score: 0.00
```

### During Interview
```
Interview Status: IN_PROGRESS
Confidence: N/A
Tab Changes: 2 (🟡 yellow)
Cheating Severity: LOW
Cheating Score: 0.20
```

### After Interview (Evaluated)
```
Interview Status: COMPLETED
Confidence: HIGH (🟢 green)
Tab Changes: 2 (🟡 yellow)
Cheating Severity: MEDIUM (🔴 red)
Cheating Score: 2.50 (🟡 yellow)
Total Score: 7.5/10 (badge at top)
```

## Admin Workflow

### 1. Initial View
- Admin opens dashboard
- Auto-refresh starts (10s interval)
- Sees all candidates with latest data

### 2. Monitoring Interview Progress
- Dashboard auto-updates every 10s
- Tab changes increment in real-time
- Cheating events appear as they occur
- No manual refresh needed

### 3. Post-Interview Review
- Evaluation results appear automatically
- Total score badge shows at top
- Confidence level displayed
- Cheating severity calculated
- Tab change count visible

### 4. Making Decision
- Admin clicks [Select Candidate] or [Reject]
- Immediate refresh with visual feedback
- Status updates instantly
- Background color changes
- Action buttons update

### 5. Downloading Report
- Click [Download Report]
- Opens in new tab
- Comprehensive HTML report with all metrics

## Key Features

✅ **Auto-Refresh**: Dashboard updates every 10 seconds
✅ **Manual Refresh**: Click button for immediate update
✅ **Tab Change Visibility**: Color-coded count display
✅ **Cheating Score**: Explicit numeric value shown
✅ **Immediate Feedback**: Actions trigger instant UI update
✅ **No Page Reload**: All updates happen seamlessly
✅ **Timestamp Display**: Know when data was last updated
✅ **Visual Indicators**: Loading states and color coding
✅ **Production Ready**: Error handling and cleanup

## Technical Implementation

### State Management
```javascript
const [resumes, setResumes] = useState([]);
const [lastRefresh, setLastRefresh] = useState(new Date());
const [isRefreshing, setIsRefreshing] = useState(false);
```

### Auto-Refresh Loop
```javascript
useEffect(() => {
    fetchResumes();
    const intervalId = setInterval(() => {
        fetchResumes(false); // Silent
    }, 10000);
    return () => clearInterval(intervalId);
}, []);
```

### Data Synchronization
```
Backend State (Source of Truth)
    ↓ (Every 10s or on action)
Frontend State (resumes)
    ↓ (React re-render)
UI Display (Admin sees)
```

This ensures the Admin Dashboard is always in sync with the backend database.
