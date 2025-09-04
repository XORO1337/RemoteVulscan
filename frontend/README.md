# RemoteVulscan Frontend

The frontend web application for RemoteVulscan, providing a modern and intuitive user interface for security vulnerability scanning.

## 🎨 Overview

Built with cutting-edge web technologies:
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Socket.IO** - Real-time WebSocket communication
- **React Hook Form** - Form handling with validation
- **Recharts** - Data visualization and charts

## ✨ Features

- 🎯 **Intuitive Scanning Interface** - Easy-to-use vulnerability scanning
- 📊 **Real-time Progress** - Live scan progress with WebSocket updates
- 📈 **Interactive Dashboards** - Visualize scan results and statistics
- 🔄 **Responsive Design** - Works seamlessly on desktop and mobile
- 🌙 **Dark/Light Mode** - Theme switching support
- 📱 **Progressive Web App** - Install as native app
- ♿ **Accessibility** - WCAG compliant with screen reader support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Backend API running on port 8000

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API configuration

# Start development server
npm run dev
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🐳 Docker Deployment

```bash
# Build container
docker build -t remotevulscan-frontend .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  -e NEXT_PUBLIC_WS_URL=ws://localhost:8000 \
  remotevulscan-frontend
```

## ⚙️ Configuration

### Environment Variables

**Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., http://localhost:8000)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (e.g., ws://localhost:8000)

**Optional:**
- `NEXT_TELEMETRY_DISABLED` - Disable Next.js telemetry (default: 1)
- `NODE_ENV` - Environment (development/production)

### API Configuration

The frontend communicates with the backend API:

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = {
  // Scan management
  getScans: () => fetch(`${API_BASE_URL}/api/v1/scans`),
  createScan: (data) => fetch(`${API_BASE_URL}/api/v1/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  // Real-time updates
  connectWebSocket: () => io(API_BASE_URL)
};
```

## 🎨 UI Components

### Design System
Built with Radix UI and Tailwind CSS for consistency:

```typescript
// components/ui/button.tsx
import { cn } from "@/lib/utils"

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
```

### Key Components
- **ScanForm** - Create new vulnerability scans
- **ScanResults** - Display scan results and vulnerabilities
- **Dashboard** - Overview of scanning statistics
- **ToolSelector** - Choose security tools and scan modes
- **ProgressIndicator** - Real-time scan progress
- **VulnerabilityTable** - Detailed vulnerability listings

## 📡 WebSocket Integration

Real-time updates for scan progress:

```typescript
// hooks/useWebSocket.ts
export function useWebSocket(scanId: string) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('pending');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!);
    
    socket.emit('join-scan', scanId);
    
    socket.on('scan-update', (data) => {
      setScanStatus(data.status);
      setProgress(data.progress || 0);
    });

    return () => {
      socket.emit('leave-scan', scanId);
      socket.disconnect();
    };
  }, [scanId]);

  return { scanStatus, progress };
}
```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── dashboard/       # Dashboard pages
│   │   ├── scans/          # Scan management pages
│   │   ├── tools/          # Tools information pages
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable components
│   │   ├── ui/            # Base UI components
│   │   ├── forms/         # Form components
│   │   └── charts/        # Chart components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and API client
│   └── types/             # TypeScript types
├── public/                # Static assets
└── styles/               # Global styles
```

## 🎯 Key Pages

### Dashboard (`/dashboard`)
- Overview of scanning activities
- Statistics and metrics
- Recent scan results
- System health indicators

### Scan Management (`/scans`)
- Create new scans
- View scan history
- Monitor active scans
- Download reports

### Tools Information (`/tools`)
- Available security tools
- Tool documentation
- Scan mode configurations
- Tool health status

### Website Management (`/websites`)
- Target website management
- Website scan history
- Bulk scanning operations

## 🔄 State Management

Uses React hooks and context for state management:

```typescript
// contexts/ScanContext.tsx
const ScanContext = createContext<ScanContextType>({
  scans: [],
  activeScan: null,
  createScan: async () => {},
  refreshScans: async () => {}
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);

  // Implementation...

  return (
    <ScanContext.Provider value={{ scans, activeScan, createScan, refreshScans }}>
      {children}
    </ScanContext.Provider>
  );
}
```

## 📊 Data Visualization

Charts and graphs using Recharts:

```typescript
// components/charts/VulnerabilityChart.tsx
export function VulnerabilityChart({ data }: { data: VulnerabilityData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="severity" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 🎨 Styling

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... more colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### CSS Variables
```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark theme variables */
}
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Visual regression tests
npm run test:visual
```

### Test Examples
```typescript
// __tests__/components/ScanForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanForm } from '@/components/ScanForm';

describe('ScanForm', () => {
  it('submits scan request with valid data', async () => {
    const onSubmit = jest.fn();
    render(<ScanForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Target URL'), {
      target: { value: 'https://example.com' }
    });
    
    fireEvent.click(screen.getByText('Start Scan'));
    
    expect(onSubmit).toHaveBeenCalledWith({
      url: 'https://example.com',
      scanType: 'NUCLEI'
    });
  });
});
```

## 📱 Progressive Web App

Configured as PWA for native app experience:

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // Next.js config
});
```

## ♿ Accessibility

WCAG 2.1 AA compliance:

- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management
- ARIA labels and descriptions

```typescript
// Accessible component example
export function AccessibleButton({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      aria-label={props['aria-label'] || props.title}
      role="button"
      tabIndex={0}
    >
      {children}
    </button>
  );
}
```

## 🚀 Performance Optimization

### Next.js Features
- **Static Site Generation** - Pre-rendered pages
- **Image Optimization** - Automatic image optimization
- **Code Splitting** - Automatic code splitting
- **Font Optimization** - Optimized font loading

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze

# Check performance
npm run lighthouse
```

## 🔧 Development

### Hot Reload
Development server with instant updates:
```bash
npm run dev
# Server starts at http://localhost:3000
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

### Environment Setup
```bash
# Development
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 🚨 Troubleshooting

### Common Issues

**API Connection:**
```bash
# Check backend API
curl http://localhost:8000/api/v1/health

# Verify environment variables
echo $NEXT_PUBLIC_API_URL
```

**WebSocket Connection:**
```javascript
// Debug WebSocket in browser console
const socket = io('ws://localhost:8000');
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
```

**Build Issues:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode
```bash
# Enable debug mode
DEBUG=* npm run dev

# Next.js debug info
NEXT_DEBUG=1 npm run dev
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

---

For more information, see the main [ARCHITECTURE.md](../ARCHITECTURE.md) documentation.
