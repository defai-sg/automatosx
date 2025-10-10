# State Management

## Overview
Manage application state effectively using appropriate patterns and tools. Choose the right state management solution based on scope, complexity, and performance requirements.

## State Classification

### 1. Local State
Component-specific state that doesn't need to be shared.

```typescript
// ✅ Good: Use useState for local UI state
const DropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Menu
      </button>
      {isOpen && <MenuItems />}
    </div>
  );
};
```

### 2. Shared State
State shared between multiple components.

```typescript
// ✅ Good: Use Context for theme, auth, locale
const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export const ThemeProvider: React.FC = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 3. Server State
Data fetched from APIs (use React Query, SWR, or Apollo).

```typescript
// ✅ Good: Use React Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 4. Global Application State
Complex state shared across the entire application (Redux, Zustand, Jotai).

```typescript
// ✅ Good: Use Zustand for simple global state
import create from 'zustand';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  total: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
  total: 0,
}));
```

## Decision Tree

```
Need state? →
  ├─ Single component only? → useState
  ├─ Few related components? → Props / Composition
  ├─ Many components (same subtree)? → Context API
  ├─ Server data? → React Query / SWR
  └─ Complex global state? → Redux / Zustand
```

## Do's ✅

### Use the Right Tool
```typescript
// ✅ Local UI state: useState
const [count, setCount] = useState(0);

// ✅ Server state: React Query
const { data } = useQuery(['posts'], fetchPosts);

// ✅ Global state: Zustand
const user = useUserStore(state => state.user);

// ✅ Form state: React Hook Form
const { register, handleSubmit } = useForm();
```

### Normalize Complex State
```typescript
// ✅ Good: Normalized state structure
interface State {
  users: {
    byId: Record<string, User>;
    allIds: string[];
  };
  posts: {
    byId: Record<string, Post>;
    allIds: string[];
  };
}

// ❌ Bad: Nested, denormalized state
interface BadState {
  users: Array<{
    id: string;
    posts: Array<{
      id: string;
      comments: Comment[];
    }>;
  }>;
}
```

### Immutable Updates
```typescript
// ✅ Good: Immutable array update
setState(prevState => ({
  ...prevState,
  items: [...prevState.items, newItem]
}));

// ✅ Good: Immutable object update
setState(prevState => ({
  ...prevState,
  user: {
    ...prevState.user,
    name: newName
  }
}));

// ❌ Bad: Mutating state directly
state.items.push(newItem); // NEVER do this
state.user.name = newName; // NEVER do this
```

## Don'ts ❌

### Over-Engineering
```typescript
// ❌ Bad: Redux for simple counter
// Overkill for local state
const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: state => state + 1
  }
});

// ✅ Good: useState for simple counter
const [count, setCount] = useState(0);
```

### Context Overuse
```typescript
// ❌ Bad: Context for frequently changing data
const FastUpdatingContext = createContext(null);
// Causes re-renders across entire subtree!

// ✅ Good: Use state management library instead
const useStore = create((set) => ({
  value: 0,
  setValue: (value) => set({ value })
}));
```

### Mixing Server and Client State
```typescript
// ❌ Bad: Storing server data in Redux
dispatch(setUsers(fetchedUsers));
// Server data belongs in React Query/SWR

// ✅ Good: Keep server state separate
const { data: users } = useQuery(['users'], fetchUsers);
```

## Common Patterns

### Reducer Pattern
```typescript
interface State {
  count: number;
  error: string | null;
  loading: boolean;
}

type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, initialState);
```

### Optimistic Updates
```typescript
// ✅ Good: Optimistic UI with React Query
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['todos']);

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update
    queryClient.setQueryData(['todos'], (old) =>
      [...old, newTodo]
    );

    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['todos']);
  },
});
```

### Derived State
```typescript
// ✅ Good: Compute derived state with useMemo
const filteredItems = useMemo(() => {
  return items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [items, searchTerm]);

// ❌ Bad: Storing derived state separately
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);
// Creates sync issues!
```

## Performance Optimization

### Selector Pattern
```typescript
// ✅ Good: Select only what you need
const userName = useUserStore(state => state.user.name);
// Component only re-renders when user.name changes

// ❌ Bad: Selecting entire object
const user = useUserStore(state => state.user);
// Component re-renders on any user property change
```

### State Splitting
```typescript
// ✅ Good: Split unrelated state
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// ❌ Bad: Grouping unrelated state
const [formData, setFormData] = useState({ name: '', email: '' });
// Updates to name cause email input to re-render
```

## Testing

```typescript
describe('useCartStore', () => {
  it('adds items to cart', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({ id: '1', name: 'Product' });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('1');
  });

  it('calculates total correctly', () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addItem({ id: '1', price: 10 });
      result.current.addItem({ id: '2', price: 20 });
    });

    expect(result.current.total).toBe(30);
  });
});
```

## Resources

- [React State Management in 2024](https://react.dev/learn/managing-state)
- [When to use Context](https://react.dev/learn/passing-data-deeply-with-context)
- [React Query Guide](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
