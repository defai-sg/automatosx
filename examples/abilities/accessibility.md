# Accessibility (A11y)

## Overview
Build inclusive web applications that work for everyone, including users with disabilities. Follow WCAG guidelines and implement proper semantic HTML, ARIA attributes, and keyboard navigation.

## Core Principles (WCAG)

### 1. Perceivable
Users must be able to perceive the information.

### 2. Operable
Users must be able to operate the interface.

### 3. Understandable
Users must understand the information and interface.

### 4. Robust
Content must work with current and future technologies.

## Do's ✅

### Semantic HTML
```jsx
// ✅ Good: Semantic HTML
<button onClick={handleClick}>Submit</button>
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

// ❌ Bad: Div soup
<div onClick={handleClick}>Submit</div>
<div>
  <div onClick={() => navigate('/')}>Home</div>
</div>
```

### ARIA Labels
```jsx
// ✅ Good: Proper labeling
<button aria-label="Close dialog">
  <CloseIcon />
</button>

<input
  type="text"
  aria-label="Search products"
  placeholder="Search..."
/>

// ✅ Good: Form labels
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Keyboard Navigation
```jsx
// ✅ Good: Keyboard accessible
const Modal = ({ isOpen, onClose }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button onClick={onClose} tabIndex={0}>
        Close
      </button>
    </div>
  );
};
```

### Color Contrast
```css
/* ✅ Good: WCAG AA compliant (4.5:1 minimum) */
.text {
  color: #000000;
  background: #FFFFFF;
}

/* ❌ Bad: Low contrast */
.low-contrast {
  color: #CCCCCC;
  background: #FFFFFF;
}
```

### Focus Indicators
```css
/* ✅ Good: Visible focus states */
button:focus {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* ❌ Bad: Removing focus outline */
button:focus {
  outline: none; /* Don't do this! */
}
```

## Don'ts ❌

### Auto-Playing Media
```jsx
// ❌ Bad: Auto-play without controls
<video autoPlay src="video.mp4" />

// ✅ Good: User-controlled
<video controls src="video.mp4" />
```

### Missing Alt Text
```jsx
// ❌ Bad: No alt text
<img src="chart.png" />

// ✅ Good: Descriptive alt
<img
  src="chart.png"
  alt="Sales revenue chart showing 25% growth in Q4"
/>

// ✅ Good: Decorative images
<img src="decorative.png" alt="" />
```

### Time Limits
```jsx
// ❌ Bad: Fixed timeout
setTimeout(logout, 60000); // 1 minute

// ✅ Good: Warning + extend option
const showTimeoutWarning = () => {
  return (
    <div role="alert">
      <p>Session expires in 1 minute</p>
      <button onClick={extendSession}>
        Extend Session
      </button>
    </div>
  );
};
```

## Common Patterns

### Skip Links
```jsx
// ✅ Skip to main content
const Layout = () => (
  <>
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
    <Header />
    <main id="main-content">
      <Content />
    </main>
  </>
);

// CSS
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Live Regions
```jsx
// ✅ Announce dynamic content
const SearchResults = ({ results, loading }) => (
  <div aria-live="polite" aria-atomic="true">
    {loading ? (
      <p>Loading results...</p>
    ) : (
      <p>{results.length} results found</p>
    )}
  </div>
);
```

### Modal Dialogs
```jsx
// ✅ Accessible modal
const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      // Trap focus
      const previouslyFocused = document.activeElement;
      modalRef.current?.focus();

      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      tabIndex={-1}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
};
```

### Form Validation
```jsx
// ✅ Accessible error messages
const EmailInput = () => {
  const [error, setError] = useState('');

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <p id="email-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

## Testing

### Automated Testing
```typescript
// ✅ Use jest-axe for accessibility tests
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);

  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist
- ✅ Tab through entire interface
- ✅ Test with screen reader (NVDA, JAWS, VoiceOver)
- ✅ Verify color contrast (4.5:1 for text, 3:1 for large text)
- ✅ Test at 200% zoom
- ✅ Navigate with keyboard only (no mouse)
- ✅ Check ARIA landmarks and labels

## Tools

- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Automated accessibility audits
- **Screen Readers**: NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS)
- **Color Contrast Checker**: WebAIM or Coolors

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
