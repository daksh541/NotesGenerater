/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: {
                    50: '#f0f4fa',
                    100: '#dce5f2',
                    200: '#bdcde6',
                    300: '#92add6',
                    400: '#6488c2',
                    500: '#4369ad',
                    600: '#325291',
                    700: '#294276',
                    800: '#1C2541',
                    900: '#0B132B',
                    950: '#060A17',
                },
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
                warm: {
                    50: '#fafaf9',
                    100: '#f5f5f4',
                    200: '#e7e5e4',
                    300: '#d6d3d1',
                    400: '#a8a29e',
                    500: '#78716c',
                    600: '#57534e',
                    700: '#44403c',
                    800: '#292524',
                    900: '#1c1917',
                }
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            boxShadow: {
                'saas': '0 1px 3px 0 rgba(11, 19, 43, 0.04), 0 1px 2px -1px rgba(11, 19, 43, 0.04)',
                'saas-md': '0 4px 6px -1px rgba(11, 19, 43, 0.05), 0 2px 4px -2px rgba(11, 19, 43, 0.04)',
                'saas-lg': '0 10px 25px -3px rgba(11, 19, 43, 0.06), 0 4px 6px -4px rgba(11, 19, 43, 0.04)',
            },
            animation: {
                'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
