# Theme Configuration

## Color Palette

The application uses a harmonious color scheme with the following colors:

### Primary Color - #FA6868 (Coral/Red)
- **Usage**: Main CTAs, primary actions, brand emphasis
- **Tailwind**: `bg-primary`, `text-primary`, `border-primary`
- **Ant Design**: Applied to primary buttons, primary components

### Secondary Color - #FAAC68 (Orange)
- **Usage**: Secondary actions, warm highlights, complementary elements
- **Tailwind**: `bg-secondary`, `text-secondary`, `border-secondary`
- **Ant Design**: Applied to info states

### Accent Color - #5A9CB5 (Blue)
- **Usage**: Links, informational elements, cool contrast
- **Tailwind**: `bg-accent`, `text-accent`, `border-accent`
- **Ant Design**: Applied to links and link hover states

### Warning Color - #FACE68 (Yellow)
- **Usage**: Warnings, alerts, important highlights
- **Tailwind**: `bg-warning`, `text-warning`, `border-warning`
- **Ant Design**: Applied to warning states

## Configuration Files

### 1. Ant Design Theme (`src/theme/antd-theme.ts`)
Contains the Ant Design `ConfigProvider` theme configuration with:
- Token customization (colors, spacing, typography)
- Component-specific styling (Button, Input, Card, etc.)
- Applied globally in `layout.tsx`

### 2. Tailwind Config (`tailwind.config.ts`)
Extended color palette with shades (50-900) for each theme color:
- Primary: 10 shades
- Secondary: 10 shades
- Accent: 10 shades
- Warning: 10 shades

### 3. Global CSS (`src/app/globals.css`)
- Tailwind directives
- CSS custom properties for colors
- Base styles and utilities

### 4. Colors Export (`src/theme/colors.ts`)
TypeScript constants for programmatic color access:
```typescript
import { colors } from '@/theme/colors'

// Usage
const primaryColor = colors.primary.DEFAULT // #FA6868
const lightPrimary = colors.primary[100] // #FEE7E7
```

## Usage Examples

### Tailwind Classes
```tsx
// Primary color
<div className="bg-primary text-white">Primary Background</div>
<div className="bg-primary-100 text-primary-700">Light Primary</div>

// Secondary color
<button className="bg-secondary hover:bg-secondary-600">Button</button>

// Accent color
<a className="text-accent hover:text-accent-600">Link</a>

// Warning color
<div className="border-l-4 border-warning bg-warning-50">Warning Box</div>
```

### Ant Design Components
```tsx
import { Button, Tag, Alert } from 'antd'

// Primary button (automatically styled)
<Button type="primary">Primary Action</Button>

// Custom colored tags
<Tag color="#FA6868">Primary Tag</Tag>
<Tag color="#FAAC68">Secondary Tag</Tag>

// Alerts use theme colors
<Alert message="Info" type="info" showIcon />
<Alert message="Warning" type="warning" showIcon />
```

### Programmatic Access
```tsx
import { colors } from '@/theme/colors'

// In your component
const buttonStyle = {
  backgroundColor: colors.primary.DEFAULT,
  color: 'white'
}
```

## Color Accessibility

Each color has been generated with multiple shades to ensure:
- Sufficient contrast ratios for text readability
- Flexible options for different UI states (hover, active, disabled)
- Consistent visual hierarchy

## Testing

Run the development server to see the theme in action:
```bash
npm run dev
```

Visit the homepage to see all colors and components showcased.

