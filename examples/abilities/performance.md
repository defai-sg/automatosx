# Frontend Performance Optimization

## Overview
Optimize React applications for speed and efficiency. Focus on reducing bundle size, minimizing re-renders, optimizing assets, and improving Core Web Vitals (LCP, FID, CLS).

## Core Metrics

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Additional Metrics
- **FCP** (First Contentful Paint): < 1.8s
- **TTI** (Time to Interactive): < 3.8s
- **TBT** (Total Blocking Time): < 200ms

## Do's ✅

### Code Splitting
```typescript
// ✅ Good: Route-based code splitting
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// ✅ Good: Component-based code splitting
const HeavyChart = lazy(() => import('./HeavyChart'));

function Analytics() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### Memoization
```typescript
// ✅ Good: Memoize expensive computations
const expensiveValue = useMemo(() => {
  return data.reduce((sum, item) => sum + item.value, 0);
}, [data]);

// ✅ Good: Memoize callbacks
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, [doSomething]);

// ✅ Good: Memoize components
const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});
```

### Virtualization
```typescript
// ✅ Good: Virtualize long lists
import { FixedSizeList } from 'react-window';

const VirtualList = ({ items }) => (
  <FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
);

// ❌ Bad: Rendering 10,000 items
{items.map(item => <Item key={item.id} {...item} />)}
```

### Image Optimization
```jsx
// ✅ Good: Modern formats with fallback
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <source srcSet="image.jpg" type="image/jpeg" />
  <img
    src="image.jpg"
    alt="Description"
    loading="lazy"
    width={800}
    height={600}
  />
</picture>

// ✅ Good: Responsive images
<img
  srcSet="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 480px, (max-width: 1200px) 800px, 1200px"
  src="medium.jpg"
  alt="Description"
  loading="lazy"
/>
```

### Bundle Optimization
```typescript
// ✅ Good: Tree-shakeable imports
import { debounce } from 'lodash-es';

// ❌ Bad: Importing entire library
import _ from 'lodash'; // Imports 70KB+

// ✅ Good: Dynamic imports for heavy dependencies
const loadPDF = async () => {
  const pdfjs = await import('pdfjs-dist');
  return pdfjs;
};
```

## Don'ts ❌

### Excessive Re-renders
```typescript
// ❌ Bad: Creating new objects in render
function BadComponent() {
  return <Child config={{ theme: 'dark' }} />;
  // Creates new object every render
}

// ✅ Good: Stable references
const config = { theme: 'dark' };
function GoodComponent() {
  return <Child config={config} />;
}

// ✅ Better: useMemo for dynamic configs
function BetterComponent({ theme }) {
  const config = useMemo(() => ({ theme }), [theme]);
  return <Child config={config} />;
}
```

### Large Bundle Size
```typescript
// ❌ Bad: Importing entire library
import moment from 'moment'; // 67KB minified

// ✅ Good: Use smaller alternative
import dayjs from 'dayjs'; // 2KB minified

// ✅ Better: Native Intl API
const formatted = new Intl.DateTimeFormat('en-US').format(date);
```

### Unoptimized Images
```jsx
// ❌ Bad: Large unoptimized images
<img src="photo.jpg" /> // 5MB original size

// ✅ Good: Optimized and lazy-loaded
<img
  src="photo-optimized.webp"
  alt="Photo"
  loading="lazy"
  width={800}
  height={600}
/>
```

## Performance Patterns

### Debouncing
```typescript
// ✅ Debounce expensive operations
import { useMemo } from 'react';
import { debounce } from 'lodash-es';

function SearchInput() {
  const debouncedSearch = useMemo(
    () => debounce((query) => {
      fetchResults(query);
    }, 300),
    []
  );

  return (
    <input
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  );
}
```

### Intersection Observer
```typescript
// ✅ Lazy load images/components when visible
function LazyImage({ src, alt }) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined}
      alt={alt}
    />
  );
}
```

### Web Workers
```typescript
// ✅ Offload heavy computation to Web Workers
// worker.ts
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// Component
function HeavyComponent() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url));

    worker.postMessage(data);
    worker.onmessage = (e) => setResult(e.data);

    return () => worker.terminate();
  }, [data]);

  return <div>{result}</div>;
}
```

### Prefetching
```typescript
// ✅ Prefetch next page resources
function ProductList() {
  const prefetchProduct = (id: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/api/products/${id}`;
    document.head.appendChild(link);
  };

  return (
    <div>
      {products.map(product => (
        <div
          key={product.id}
          onMouseEnter={() => prefetchProduct(product.id)}
        >
          {product.name}
        </div>
      ))}
    </div>
  );
}
```

## Measurement Tools

### Chrome DevTools
```javascript
// Performance profiling
// 1. Open DevTools → Performance tab
// 2. Record interaction
// 3. Analyze flame graph

// Memory profiling
// 1. DevTools → Memory tab
// 2. Take heap snapshot
// 3. Compare snapshots to find leaks
```

### Lighthouse
```bash
# Run Lighthouse audit
npx lighthouse https://your-site.com --view

# Performance CI check
npx lighthouse https://your-site.com \
  --only-categories=performance \
  --budget-path=./budget.json
```

### Web Vitals
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  analytics.send({
    name: metric.name,
    value: metric.value,
    id: metric.id,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Performance Budget
```json
{
  "budget": [
    {
      "resourceType": "script",
      "budget": 300
    },
    {
      "resourceType": "image",
      "budget": 500
    },
    {
      "resourceType": "total",
      "budget": 1000
    }
  ]
}
```

## Resources

- [web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals)
