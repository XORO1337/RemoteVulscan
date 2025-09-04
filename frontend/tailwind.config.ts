import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'cyber-pulse': 'cyber-pulse 2s infinite',
        'cyber-glow': 'cyber-glow 3s infinite',
        'cyber-scan': 'cyber-scan-line 2s infinite',
        'cyber-shimmer': 'cyber-shimmer 2s infinite',
      },
      keyframes: {
        'cyber-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'cyber-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
            filter: 'brightness(1)',
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)',
            filter: 'brightness(1.2)',
          },
        },
        'cyber-scan-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'cyber-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(0, 212, 255, 0.3)',
        'cyber-intense': '0 0 30px rgba(0, 212, 255, 0.6)',
        'neon-blue': '0 0 15px rgba(0, 212, 255, 0.5)',
        'neon-green': '0 0 15px rgba(0, 255, 136, 0.5)',
        'neon-purple': '0 0 15px rgba(139, 92, 246, 0.5)',
        'neon-red': '0 0 15px rgba(255, 68, 68, 0.5)',
      },
  		colors: {
        // Cyber theme colors
        'cyber': {
          'bg-primary': '#0a0a0f',
          'bg-secondary': '#111118',
          'bg-tertiary': '#1a1a24',
          'surface': '#1e1e2e',
          'surface-elevated': '#252538',
          'neon-blue': '#00d4ff',
          'neon-cyan': '#00ffff',
          'neon-purple': '#8b5cf6',
          'neon-green': '#00ff88',
          'neon-pink': '#ff0080',
          'text-primary': '#ffffff',
          'text-secondary': '#b4b4c7',
          'text-muted': '#6b7280',
          'text-accent': '#00ffff',
          'success': '#00ff88',
          'warning': '#ffaa00',
          'error': '#ff4444',
          'info': '#00d4ff',
        },
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
