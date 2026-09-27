type IrisMarkProps = {
  pupilRadius?: number;
  size?: number;
};

export default function IrisMark({ pupilRadius = 9, size = 34 }: IrisMarkProps) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <circle cx="30" cy="30" r="28" fill="none" stroke="#1B2430" strokeWidth="1.4" />
      <circle cx="30" cy="30" r="18" fill="#F1E2D3" stroke="#2C5F5D" strokeWidth="1" />
      <circle
        cx="30"
        cy="30"
        r={pupilRadius}
        fill="#1B2430"
        style={{ transition: "r 0.4s ease" }}
      />
    </svg>
  );
}
