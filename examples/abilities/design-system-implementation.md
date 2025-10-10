# Design System Implementation

## Overview
Implement and maintain consistent design systems using tokens, components, and documentation. Ensure brand consistency and developer efficiency across the application.

## Core Concepts

### Design Tokens
Centralized design decisions (colors, typography, spacing) as code.

```typescript
// ✅ Good: Design tokens
export const tokens = {
  colors: {
    primary: '#0066CC',
    secondary: '#6C757D',
    success: '#28A745',
    danger: '#DC3545'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'Fira Code, monospace'
    },
    fontSize: {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '24px'
    }
  }
};
```

### Theme System
```typescript
// ✅ Good: Themeable components
interface Theme {
  colors: typeof tokens.colors;
  spacing: typeof tokens.spacing;
}

export const lightTheme: Theme = {
  colors: {
    ...tokens.colors,
    background: '#FFFFFF',
    text: '#1A1A1A'
  },
  spacing: tokens.spacing
};

export const darkTheme: Theme = {
  colors: {
    ...tokens.colors,
    background: '#1A1A1A',
    text: '#FFFFFF'
  },
  spacing: tokens.spacing
};
```

## Component Library Structure

```
/design-system
  /tokens
    colors.ts
    spacing.ts
    typography.ts
  /components
    /Button
      Button.tsx
      Button.test.tsx
      Button.stories.tsx
    /Input
    /Card
  /hooks
    useTheme.ts
  /utils
    themed.ts
```

## Do's ✅

### Use Design Tokens
```typescript
// ✅ Good: Using tokens
import { tokens } from './design-system';

const Button = styled.button`
  padding: ${tokens.spacing.md} ${tokens.spacing.lg};
  background: ${tokens.colors.primary};
  font-size: ${tokens.typography.fontSize.base};
`;

// ❌ Bad: Magic values
const BadButton = styled.button`
  padding: 16px 24px;
  background: #0066CC;
  font-size: 16px;
`;
```

### Variant System
```typescript
// ✅ Good: Consistent variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ variant, size }) => {
  const styles = {
    primary: { bg: tokens.colors.primary, color: '#fff' },
    secondary: { bg: tokens.colors.secondary, color: '#fff' },
    ghost: { bg: 'transparent', color: tokens.colors.primary }
  };

  const sizes = {
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg
  };

  return (
    <button
      style={{
        background: styles[variant].bg,
        color: styles[variant].color,
        padding: sizes[size]
      }}
    >
      {children}
    </button>
  );
};
```

### Documentation
```typescript
// ✅ Good: Storybook documentation
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
};
```

## Don'ts ❌

### Inconsistent Spacing
```typescript
// ❌ Bad: Random spacing values
<div style={{ margin: '13px', padding: '17px' }} />

// ✅ Good: Using spacing scale
<div style={{
  margin: tokens.spacing.md,
  padding: tokens.spacing.lg
}} />
```

### Hardcoded Colors
```typescript
// ❌ Bad: Hardcoded colors
const text = '#333333';
const bg = '#F5F5F5';

// ✅ Good: Semantic color names
const text = tokens.colors.text.primary;
const bg = tokens.colors.background.subtle;
```

### Component Duplication
```typescript
// ❌ Bad: Multiple button implementations
<PrimaryButton />
<ActionButton />
<CTAButton />
// All doing essentially the same thing

// ✅ Good: Single component with variants
<Button variant="primary" />
<Button variant="secondary" />
<Button variant="ghost" />
```

## Best Practices

### 1. Start with Tokens
Define all design decisions as tokens before building components.

### 2. Component Composition
Build complex components from simpler ones.

### 3. Accessibility First
Include ARIA attributes and keyboard navigation in all components.

### 4. Responsive Design
Use responsive tokens and breakpoints consistently.

```typescript
export const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
};
```

### 5. Version Components
Document breaking changes and maintain backwards compatibility.

## Tools

- **Storybook**: Component documentation and testing
- **Styled Components / Tailwind**: Styling solutions
- **Figma**: Design source of truth
- **Chromatic**: Visual regression testing

## Resources

- [Material Design System](https://m3.material.io/)
- [Ant Design](https://ant.design/)
- [Chakra UI](https://chakra-ui.com/)
- [Radix UI](https://www.radix-ui.com/)
