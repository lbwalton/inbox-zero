export function Logo(props: any) {
  return (
    <svg viewBox="0 0 120 40" fill="none" {...props}>
      <title>Bntly</title>
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="'Nunito', 'Quicksand', 'Varela Round', system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="30"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        Bntly
      </text>
    </svg>
  );
}
