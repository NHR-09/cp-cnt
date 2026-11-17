import "./globals.css";
export const metadata = {
  title: { default: "SDN Defense · Operations", template: "%s | SDN Defense" },
  description:
    "SDN lab operations, DDoS detection and protected workload monitoring.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
