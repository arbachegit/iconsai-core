interface ImagePlaceholderProps {
  className?: string;
}

export const ImagePlaceholder = ({ className = "" }: ImagePlaceholderProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="placeholder-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.1" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      
      {/* Background */}
      <rect width="800" height="600" fill="url(#placeholder-gradient)" />
      <rect width="800" height="600" fill="url(#grid)" />
      
      {/* Abstract shapes */}
      <circle cx="200" cy="150" r="80" fill="hsl(var(--primary))" opacity="0.1">
        <animate
          attributeName="r"
          values="80;90;80"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="600" cy="450" r="100" fill="hsl(var(--secondary))" opacity="0.1">
        <animate
          attributeName="r"
          values="100;110;100"
          dur="5s"
          repeatCount="indefinite"
        />
      </circle>
      <rect
        x="350"
        y="250"
        width="100"
        height="100"
        fill="hsl(var(--accent))"
        opacity="0.08"
        transform="rotate(45 400 300)"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="45 400 300"
          to="405 400 300"
          dur="10s"
          repeatCount="indefinite"
        />
      </rect>
      
      {/* Center icon */}
      <g transform="translate(350, 250)">
        <circle cx="50" cy="50" r="40" fill="hsl(var(--primary))" opacity="0.2" />
        <path
          d="M 30 50 L 45 65 L 70 35"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.4"
        />
      </g>
      
      {/* Loading text */}
      <text
        x="400"
        y="380"
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="18"
        opacity="0.6"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Carregando imagem...
      </text>
    </svg>
  );
};
