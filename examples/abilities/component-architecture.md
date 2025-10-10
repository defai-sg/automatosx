# Component Architecture

## Overview
Design and implement reusable, maintainable component structures following modern frontend architecture patterns. Focus on composition, separation of concerns, and clear component hierarchies.

## Core Principles

### 1. Single Responsibility
Each component should have one clear purpose. Avoid components that try to do too much.

### 2. Composition Over Inheritance
Build complex UIs by composing smaller, focused components rather than creating deep inheritance chains.

### 3. Container/Presentational Pattern
- **Container components**: Handle logic, state, and side effects
- **Presentational components**: Focus purely on rendering UI based on props

### 4. Props Design
- Keep props interfaces simple and explicit
- Use TypeScript for type safety
- Avoid prop drilling—use context or state management for deep data

## Do's ✅

```typescript
// ✅ Good: Single-purpose, composable component
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  onClick,
  children
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// ✅ Good: Composition
export const LoginForm = () => {
  return (
    <form>
      <Input type="email" label="Email" />
      <Input type="password" label="Password" />
      <Button variant="primary" onClick={handleSubmit}>
        Login
      </Button>
    </form>
  );
};
```

## Don'ts ❌

```typescript
// ❌ Bad: Component doing too much
const UserDashboard = () => {
  // Authentication logic
  const user = useAuth();

  // Data fetching
  const { data } = useQuery('userData');

  // Business logic
  const processData = () => { /* ... */ };

  // Complex rendering
  return (
    <div>
      {/* 500 lines of JSX */}
    </div>
  );
};

// ❌ Bad: Deep prop drilling
<GrandParent userTheme={theme}>
  <Parent userTheme={theme}>
    <Child userTheme={theme}>
      <DeepChild userTheme={theme} />
    </Child>
  </Parent>
</GrandParent>
```

## Best Practices

### Component Structure
```
/components
  /Button
    Button.tsx          # Component implementation
    Button.test.tsx     # Tests
    Button.stories.tsx  # Storybook stories
    index.ts            # Public exports
```

### Atomic Design
Organize components by complexity:
- **Atoms**: Button, Input, Label
- **Molecules**: FormField (Input + Label), SearchBar
- **Organisms**: LoginForm, Header, Card
- **Templates**: Page layouts
- **Pages**: Complete pages

### Component Checklist
- ✅ Single responsibility
- ✅ TypeScript interfaces for props
- ✅ Proper error boundaries
- ✅ Memoization where appropriate (React.memo, useMemo)
- ✅ Accessibility attributes (ARIA)
- ✅ Unit tests for logic
- ✅ Integration tests for user interactions

## Anti-Patterns to Avoid

### 1. God Components
Components that handle too many responsibilities.

### 2. Prop Drilling
Passing props through many levels. Use Context API or state management instead.

### 3. Tight Coupling
Components that depend on specific parent or child implementations.

### 4. Mixed Concerns
Mixing business logic, API calls, and rendering in one component.

## Performance Considerations

### Memoization
```typescript
// ✅ Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ Memoize callback functions
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ✅ Memoize components that render often
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>;
});
```

### Code Splitting
```typescript
// ✅ Lazy load heavy components
const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

## Testing Strategy

```typescript
// Unit test: Component logic
describe('Button', () => {
  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// Integration test: Component interactions
describe('LoginForm', () => {
  it('submits form with valid data', async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });
});
```

## Resources

- [React Component Patterns](https://reactpatterns.com/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro)
