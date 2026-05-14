const floatingBalls = [
  "auth-floating-ball auth-floating-ball-1",
  "auth-floating-ball auth-floating-ball-2",
  "auth-floating-ball auth-floating-ball-3",
  "auth-floating-ball auth-floating-ball-4",
  "auth-floating-ball auth-floating-ball-5",
  "auth-floating-ball auth-floating-ball-6",
];

export function AuthFloatingBackground() {
  return (
    <div className="auth-floating-background" aria-hidden="true">
      {floatingBalls.map((className) => (
        <span key={className} className={className} />
      ))}
    </div>
  );
}
