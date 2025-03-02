/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      listStyleType: {
        disc: 'disc',
        decimal: 'decimal',
      },
      fontSize: {
        'xxs': '0.625rem', // Custom size for text-xxs (10px)
      },
      textShadow: {
        'default': '-1px 0 #000, 0 1px #000, 1px 0 #000, 0 -1px #000',
      },
      screens: {
        '3xl': '1920px',
      },
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        "bg-active": "rgb(var(--bg-active) / <alpha-value>)",
        "bg-accent": "rgb(var(--bg-accent) / <alpha-value>)",
        "bg-secondary": "rgb(var(--bg-secondary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "text-secondary-active": "rgb(var(--text-secondary-active) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-secondary": "rgb(var(--border-secondary) / <alpha-value>)",
        "border-active": "rgb(var(--border-active) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        'link': "rgb(var(--link) / <alpha-value>)",
        'link-active': "rgb(var(--link-active) / <alpha-value>)",
        'button-text': "rgb(var(--button-text) / <alpha-value>)",
        'button-text-active': "rgb(var(--button-text-active) / <alpha-value>)",
        "button-primary": "rgb(var(--button-primary) / <alpha-value>)",
        "button-primary-active": "rgb(var(--button-primary-active) / <alpha-value>)",
        "button-danger": "rgb(var(--button-danger) / <alpha-value>)",
        "button-danger-active": "rgb(var(--button-danger-active) / <alpha-value>)",
        "button-accent": "rgb(var(--button-accent) / <alpha-value>)",
        "button-accent-active": "rgb(var(--button-accent-active) / <alpha-value>)",
        "button-secondary": "rgb(var(--button-secondary) / <alpha-value>)",
        "button-secondary-active": "rgb(var(--button-secondary-active) / <alpha-value>)",
        "focus-ring": "rgb(var(--focus-ring) / <alpha-value>)",
        "advert": "rgb(var(--advert) / <alpha-value>)",
        "article": "rgb(var(--article) / <alpha-value>)",
        "podcast": "rgb(var(--podcast) / <alpha-value>)",
        "video": "rgb(var(--video) / <alpha-value>)",
        "card-white": "rgb(var(--card-white) / <alpha-value>)",
        "card-blue": "rgb(var(--card-blue) / <alpha-value>)",
        "card-black": "rgb(var(--card-black) / <alpha-value>)",
        "card-red": "rgb(var(--card-red) / <alpha-value>)",
        "card-green": "rgb(var(--card-green) / <alpha-value>)",
        "card-multi": "rgb(var(--card-multi) / <alpha-value>)",
        "card-colorless": "rgb(var(--card-colorless) / <alpha-value>)",
        "card-lands": "rgb(var(--card-lands) / <alpha-value>)",
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      transformStyle: {
        '3d': 'preserve-3d',
      },
    },
  },
  variants: {
    extend: {
      listStyleType: ['responsive'],
    },
  },
  safelist: [
    // Flex Direction
    'flex-row',
    'flex-row-reverse',
    'flex-col',
    'flex-col-reverse',
    // Flex Wrap
    'flex-wrap',
    'flex-wrap-reverse',
    'flex-nowrap',
    // Justify Content
    'justify-start',
    'justify-end',
    'justify-center',
    'justify-between',
    'justify-around',
    'justify-evenly',
    // Align Items
    'items-start',
    'items-end',
    'items-center',
    'items-baseline',
    'items-stretch',
    // Align Content
    'content-start',
    'content-end',
    'content-center',
    'content-between',
    'content-around',
    'content-stretch',
    // gap
    'gap-0',
    'gap-1',
    'gap-2',
    'gap-3',
    'gap-4',
    'gap-5',
    'gap-6',
    'gap-7',
    'gap-8',
    'gap-9',
    'gap-10',
    'gap-11',
    'gap-12',
    'gap-14',
    'gap-16',
    'gap-20',
    'gap-24',
    'gap-28',
    'gap-32',
    'gap-36',
    'gap-40',
    'gap-44',
    'gap-48',
    'gap-52',
    'gap-56',
    'gap-60',
    'gap-64',
    'gap-72',
    'gap-80',
    'gap-96',
    // container
    'w-full',
    'sm:container',
    'sm:mx-auto',
    'md:container',
    'md:mx-auto',
    'lg:container',
    'lg:mx-auto',
    'xl:container',
    'xl:mx-auto',
    '2xl:container',
    '2xl:mx-auto',
    // responsive
    'block',
    'hidden',
    'sm:block',
    'sm:hidden',
    'md:block',
    'md:hidden',
    'lg:block',
    'lg:hidden',
    'xl:block',
    'xl:hidden',
    '2xl:block',
    '2xl:hidden',
    // card backgrounds
    'bg-card-white',
    'bg-card-blue',
    'bg-card-black',
    'bg-card-red',
    'bg-card-green',
    'bg-card-multi',
    'bg-card-colorless',
    'bg-card-lands',
  ],  
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.text-shadow': {
          textShadow: '-1px 0 #000, 0 1px #000, 1px 0 #000, 0 -1px #000',
        },
      });
    },
    function({ addUtilities }) {
      const newUtilities = {
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.preserve-3d': {
          'transform-style': 'preserve-3d',
        },
        '.perspective-1200px': {
          'perspective': '1200px',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
