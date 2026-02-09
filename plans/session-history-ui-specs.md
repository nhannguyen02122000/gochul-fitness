# Session History Modal - UI/UX Design Specifications

## Design Goals

1. **Clarity**: Users should instantly understand session history at a glance
2. **Consistency**: Match existing design system and color scheme
3. **Responsiveness**: Work seamlessly on mobile and desktop
4. **Accessibility**: Support keyboard navigation and screen readers
5. **Performance**: Fast loading with smooth animations

## Color Palette

### Contract Type Colors (from existing design)
```css
PT (Personal Training):
- Primary: #9333ea (purple)
- Secondary: #ec4899 (pink)
- Gradient: from-purple-500 to-pink-500
- Background: #f3e8ff
- Icon BG: rgba(147, 51, 234, 0.1)

REHAB (Rehabilitation):
- Primary: #0ea5e9 (sky blue)
- Secondary: #06b6d4 (cyan)
- Gradient: from-blue-500 to-cyan-500
- Background: #e0f2fe
- Icon BG: rgba(14, 165, 233, 0.1)

PT_MONTHLY:
- Primary: #f97316 (orange)
- Secondary: #ef4444 (red)
- Gradient: from-orange-500 to-red-500
- Background: #ffedd5
- Icon BG: rgba(249, 115, 22, 0.1)
```

### Status Colors
```css
NEWLY_CREATED: #d1d5db (gray)
PT_CONFIRMED: #3b82f6 (blue)
USER_CHECKED_IN: #8b5cf6 (purple)
PT_CHECKED_IN: #10b981 (green)
CANCELED: #ef4444 (red)
EXPIRED: #6b7280 (gray)
```

## Desktop Layout (Width: 600px)

### Modal Structure
```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [PT BADGE]  Session History                    [X]  │  │ ← Header (56px)
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Personal Training • Active                    │  │  │ ← Contract Info
│  │  │  8 of 10 sessions completed                    │  │  │   (80px)
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Calendar Icon]  Mon, Feb 5, 2024             │  │  │
│  │  │  [Clock Icon] 08:00 AM - 09:00 AM              │  │  │ ← Session Item
│  │  │  Status: [PT_CHECKED_IN]                       │  │  │   (90px each)
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Calendar Icon]  Wed, Jan 31, 2024            │  │  │
│  │  │  [Clock Icon] 09:00 AM - 10:00 AM              │  │  │
│  │  │  Status: [PT_CHECKED_IN]                       │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Calendar Icon]  Mon, Jan 29, 2024 • UPCOMING │  │  │
│  │  │  [Clock Icon] 08:00 AM - 09:00 AM              │  │  │
│  │  │  Status: [PT_CONFIRMED]                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                      │  │ ← Scrollable
│  └──────────────────────────────────────────────────────┘  │   (max 400px)
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Summary                                             │  │
│  │  • Completed: 8 sessions                             │  │ ← Footer (80px)
│  │  • Remaining: 2 credits                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Mobile Layout (Width: 100vw, max 480px)

### Full-Screen Modal
```
┌─────────────────────────────┐
│ [<] Session History    [X]  │ ← Header (fixed, 56px)
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ PT • Active             │ │ ← Sticky Info (60px)
│ │ 8 / 10 completed        │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📅 Mon, Feb 5           │ │
│ │ ⏰ 08:00 - 09:00 AM     │ │ ← Simplified items
│ │ ✅ Completed            │ │   (70px each)
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📅 Wed, Jan 31          │ │
│ │ ⏰ 09:00 - 10:00 AM     │ │
│ │ ✅ Completed            │ │
│ └─────────────────────────┘ │
│                             │ ← Scrollable
│ ┌─────────────────────────┐ │
│ │ 📅 Mon, Jan 29 🔔       │ │
│ │ ⏰ 08:00 - 09:00 AM     │ │
│ │ ⏳ Upcoming             │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ Summary                     │
│ Completed: 8 • Remaining: 2 │ ← Footer (60px)
└─────────────────────────────┘
```

## Component Specifications

### 1. Modal Header
```tsx
<div className="flex items-center justify-between p-4 border-b">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
         style={{ background: kindInfo.gradient }}>
      <KindIcon className="text-white text-lg" />
    </div>
    <Title level={4} className="m-0">Session History</Title>
  </div>
  <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
</div>
```

**Styling**:
- Height: 56px
- Background: white
- Border-bottom: 1px solid #f0f0f0
- Padding: 16px

### 2. Contract Info Card
```tsx
<Card className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50">
  <div className="flex justify-between items-center">
    <div>
      <Text strong className="text-base">{kindInfo.label}</Text>
      <Tag color={contractStatusColor}>{contract.status}</Tag>
    </div>
    <div className="text-right">
      <Title level={3} className="m-0">{usedCredits} / {totalCredits}</Title>
      <Text type="secondary" className="text-xs">sessions completed</Text>
    </div>
  </div>
</Card>
```

**Styling**:
- Gradient background matching contract type
- Rounded corners: 12px
- Padding: 20px
- Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))

### 3. Session List Item
```tsx
<List.Item className="bg-white rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
  <div className="flex items-start gap-4 w-full">
    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
         style={{ backgroundColor: kindInfo.bgColor }}>
      <Text className="text-xs text-gray-600 font-medium">
        {monthAbbr}
      </Text>
      <Text strong className="text-2xl">{day}</Text>
    </div>
    
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <CalendarOutlined className="text-gray-400" />
        <Text strong>{formatDate(session.date)}</Text>
        {isUpcoming && <Tag color="orange" className="ml-2">Upcoming</Tag>}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <ClockCircleOutlined className="text-gray-400" />
        <Text>{formatTimeRange(session.from, session.to)}</Text>
      </div>
      
      <StatusBadge status={session.status} type="history" />
    </div>
  </div>
</List.Item>
```

**Styling**:
- Background: white
- Border-radius: 12px
- Padding: 16px
- Margin-bottom: 12px
- Hover effect: shadow grows
- Transition: all 200ms ease

### 4. Loading State (Skeleton)
```tsx
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <Card key={i} className="rounded-xl">
      <Skeleton active avatar paragraph={{ rows: 2 }} />
    </Card>
  ))}
</div>
```

### 5. Empty State
```tsx
<Empty
  image={<CalendarOutlined style={{ fontSize: 64, color: '#d1d5db' }} />}
  description={
    <div>
      <Text className="text-base block mb-2">No sessions yet</Text>
      <Text type="secondary" className="text-sm">
        Sessions for this contract will appear here
      </Text>
    </div>
  }
/>
```

### 6. Error State
```tsx
<Alert
  type="error"
  message="Failed to load session history"
  description={error.message}
  showIcon
  action={
    <Button size="small" danger onClick={retry}>
      Retry
    </Button>
  }
/>
```

### 7. Summary Footer
```tsx
<div className="border-t pt-4 bg-gray-50 p-4 rounded-b-lg">
  <Title level={5} className="mb-3">Summary</Title>
  <Space direction="vertical" size={4} className="w-full">
    <div className="flex justify-between">
      <Text type="secondary">Completed</Text>
      <Text strong>{completedCount} sessions</Text>
    </div>
    <div className="flex justify-between">
      <Text type="secondary">Upcoming</Text>
      <Text strong>{upcomingCount} sessions</Text>
    </div>
    {hasCredits && (
      <div className="flex justify-between">
        <Text type="secondary">Remaining Credits</Text>
        <Text strong className="text-green-600">
          {remainingCredits} credits
        </Text>
      </div>
    )}
  </Space>
</div>
```

## Interactive States

### Clickable Credits Section (ContractCard)

#### Default State
```css
.credits-section {
  cursor: pointer;
  transition: all 200ms ease;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 8px 12px;
  border-radius: 8px;
}
```

#### Hover State
```css
.credits-section:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}
```

#### Active/Click State
```css
.credits-section:active {
  transform: scale(0.98);
}
```

## Animations

### Modal Entry
```css
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content {
  animation: slideInUp 300ms ease-out;
}
```

### Session Item Entry
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.session-item {
  animation: fadeInUp 200ms ease-out;
  animation-fill-mode: backwards;
}

.session-item:nth-child(1) { animation-delay: 50ms; }
.session-item:nth-child(2) { animation-delay: 100ms; }
.session-item:nth-child(3) { animation-delay: 150ms; }
```

### Hover Effects
```css
.session-item {
  transition: all 200ms ease;
}

.session-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
```

## Typography Scale

```css
Modal Title: 18px, font-weight: 600
Contract Type: 16px, font-weight: 600
Session Date: 14px, font-weight: 600
Session Time: 14px, font-weight: 400
Status Badge: 12px, font-weight: 500
Helper Text: 12px, font-weight: 400
Summary Labels: 14px, font-weight: 400
Summary Values: 14px, font-weight: 600
```

## Spacing System

```css
--space-xs: 4px;   /* Small gaps */
--space-sm: 8px;   /* List item internal spacing */
--space-md: 12px;  /* Between elements */
--space-lg: 16px;  /* Card padding */
--space-xl: 20px;  /* Section spacing */
--space-2xl: 24px; /* Large section gaps */
```

## Responsive Breakpoints

```css
/* Mobile First */
@media (max-width: 640px) {
  .modal-width: 100vw;
  .modal-height: 100vh;
  .session-item-padding: 12px;
  .font-size: scale(0.9);
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .modal-width: 90vw;
  .modal-max-width: 600px;
}

/* Desktop */
@media (min-width: 1025px) {
  .modal-width: 600px;
  .modal-max-height: 80vh;
}
```

## Accessibility Features

### ARIA Labels
```tsx
<div
  role="button"
  aria-label="View session history"
  aria-describedby="credits-used-count"
  tabIndex={0}
  onClick={openModal}
  onKeyDown={handleKeyDown}
>
  <span id="credits-used-count">
    {usedCredits} of {totalCredits} credits used
  </span>
</div>

<Modal
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  role="dialog"
>
  <h2 id="modal-title">Session History</h2>
  <div id="modal-description">
    View all sessions for this contract
  </div>
</Modal>
```

### Keyboard Navigation
- `Tab`: Navigate between sessions
- `Enter/Space`: Open modal (on credits section)
- `Esc`: Close modal
- `↑/↓`: Navigate session list (optional enhancement)

### Focus Management
```tsx
useEffect(() => {
  if (open) {
    // Focus first interactive element
    modalRef.current?.focus()
  } else {
    // Restore focus to trigger element
    triggerRef.current?.focus()
  }
}, [open])
```

## Dark Mode Support (Future Enhancement)

```css
/* Light Mode (Default) */
--bg-modal: #ffffff;
--bg-card: #f9fafb;
--text-primary: #111827;
--text-secondary: #6b7280;
--border-color: #e5e7eb;

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  --bg-modal: #1f2937;
  --bg-card: #111827;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
}
```

## Performance Optimizations

### Virtual Scrolling (if > 50 sessions)
```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={400}
  itemCount={sessions.length}
  itemSize={90}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <SessionItem session={sessions[index]} />
    </div>
  )}
</FixedSizeList>
```

### Image/Icon Optimization
- Use inline SVG for icons (faster than font icons)
- Lazy load modal content (don't render until opened)
- Memoize expensive computations

## Error Handling UX

### Network Error
```tsx
<Alert
  type="error"
  message="Connection Error"
  description="Please check your internet connection and try again."
  showIcon
  action={<Button onClick={retry}>Retry</Button>}
/>
```

### Permission Error
```tsx
<Alert
  type="warning"
  message="Access Denied"
  description="You don't have permission to view this contract's history."
  showIcon
/>
```

### No Data
```tsx
<Empty
  description="No sessions found for this contract"
  image={Empty.PRESENTED_IMAGE_SIMPLE}
/>
```

## Testing Scenarios

### Visual Regression Tests
- [ ] Modal opens correctly on all screen sizes
- [ ] Colors match contract type
- [ ] Status badges display correctly
- [ ] Loading skeleton shows properly
- [ ] Empty state renders nicely
- [ ] Error states are clear

### Interaction Tests
- [ ] Click on credits opens modal
- [ ] Click outside closes modal
- [ ] ESC key closes modal
- [ ] Session list scrolls smoothly
- [ ] Hover effects work
- [ ] Touch gestures work on mobile

### Accessibility Tests
- [ ] Screen reader announces modal
- [ ] Keyboard navigation works
- [ ] Focus management is correct
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets are 44px minimum
