export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="ca-page-transition">{children}</div>;
}
